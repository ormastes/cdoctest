import enum
import os
import clang.cindex
import sys
import platform
from clang_repl_kernel import ClangReplKernel, ClangReplConfig, find_prog, WinShell, BashShell
from clang.cindex import CursorKind, TokenKind
import enum

class Special(enum.Enum):
    WHITE_SPACE = '<WHITE_SPACE>'
    CONTINUE = '<...>'


class CDocTestConfig:
    START_PROMPT = ['>>> ', 'clang-repl> ']
    CONT_PROMPT = ['... ', 'clang-repl... ']
    PROMPT = START_PROMPT + CONT_PROMPT


class TestAbstract:
    def __init__(self, text):
        self.text = text
        self.is_pass = None
        self.path = None

    def __str__(self):
        return self.text

    def __repr__(self):
        return self.text

    def run(self, shell):
        pass


class Test(TestAbstract):
    def __init__(self, text, cmd, outputs):
        super().__init__(text)
        self.cmd = cmd
        self.outputs = outputs
        self.output_result = []

    def run(self, shell):
        outputs = []

        def send(msg):
            nonlocal outputs
            outputs += msg.split('\n')

        shell.do_execute(self.cmd, send)
        if len(outputs) == 0 and len(self.outputs) == 0:
            self.is_pass = True
        else:
            is_fail = False
            eidx = 0
            aidx = 0
            left_match_allowed = False
            while eidx < len(self.outputs):
                expected = self.outputs[eidx]
                eidx += 1
                if aidx < len(outputs):
                    actual = outputs[aidx]
                    aidx += 1
                    if expected != actual:
                        is_fail = True
                        self.output_result.append(False)
                    else:
                        self.output_result.append(True)
                else:
                    is_fail = True
                    self.output_result.append(False)

            if not left_match_allowed and aidx < len(outputs):
                is_fail = True
            if is_fail:
                self.actual = outputs;
            self.is_pass = not is_fail


class TestCase(TestAbstract):
    def __init__(self, text, tests=[]):
        super().__init__(text)
        self.tests = tests

    def remove_prompt(self, org_line):
        striped_line = org_line.strip()
        matched_prompts = [prompt for prompt in CDocTestConfig.PROMPT if striped_line.startswith(prompt)]
        if any(matched_prompts):
            matched_prompt = matched_prompts[0]
            if len(matched_prompts) > 1:
                for i in range(len(matched_prompt) - 1):
                    matched_prompt = matched_prompt if len(matched_prompts[i]) <= len(matched_prompt) else matched_prompts[i]
            striped_line = striped_line[len(matched_prompt):]
            org_line.find(matched_prompt)
            return striped_line, org_line.find(matched_prompt)
        else:
            return org_line

    def init(self, lines):
        idx = 0
        while idx < len(lines):
            if any([lines[idx].strip().startswith(prompt) for prompt in CDocTestConfig.PROMPT]):
                cmd = lines[idx]
                cmd, indent = self.remove_prompt(cmd)
                idx += 1
                outputs = []
                while idx < len(lines) and not any([lines[idx].strip().startswith(prompt) for prompt in CDocTestConfig.PROMPT]):
                    line = lines[idx]
                    # remove indent if white space
                    for i in range(indent):
                        if line[0] == ' ' or line[0] == '\t':
                            line = line[1:]
                        else:
                            break
                    outputs.append(line)
                    idx += 1
                self.tests.append(Test(cmd, cmd, outputs))

    def run(self, shell):
        for test in self.tests:
            test.run(shell)

        self.is_pass = all([test.is_pass for test in self.tests])

class Node:
    node_map = {}

    def __init__(self, id_token, parent_cursor=None):
        self.id_token = id_token
        self.text = id_token.spelling
        self.path = self.text if parent_cursor is None else parent_cursor.path + '::' + self.text if self.text != '' else parent_cursor.path
        self.parent_cursor = parent_cursor
        self.children = []
        if self.__str__() in Node.node_map.keys() and isinstance(self, TestNode):
            pre_exist = Node.node_map[self.__str__()]
            self.parent_cursor = pre_exist.parent_cursor
            idx = self.parent_cursor.children.index(pre_exist)
            self.parent_cursor.children[idx] = self
            self.children = pre_exist.children
            for child in self.children:
                child.parent_cursor = self
            self.path = self.parent_cursor.path + '::' + self.text
        Node.node_map[self.__str__()] = self

    def __str__(self):
        return self.text + '_' + str(self.id_token.extent.start.line) + '_' \
            + str(self.id_token.extent.start.column) + '_' + str(self.id_token.extent.end.line) + '_' \
            + str(self.id_token.extent.end.column)

    def __repr__(self):
        return self.path + '_' + str(self.id_token.extent.start.line) + '_' \
            + str(self.id_token.extent.start.column) + '_' + str(self.id_token.extent.end.line) + '_' \
            + str(self.id_token.extent.end.column)

    def __hash__(self):
        return hash(self.__str__())

    def __eq__(self, other):
        return  self.__str__() == other.__str__()

    def _build_tree(self):
        for child in self.id_token.get_children():
            child_node = Node(child, self)
            child_node._build_tree()
            self.children.append(child_node)

    @classmethod
    def build_tree(cls, cursor):
        root = Node(cursor)
        root._build_tree()
        return root


class TestNode(Node):
    def __init__(self, id_token, comment_token, parent_cursor=None):
        super().__init__(id_token, parent_cursor)
        self.comment_token = comment_token
        self.test = None


class CDocTest:
    def __init__(self):
        cur_path = os.path.dirname(os.path.abspath(__file__))
        self.prog, self.is_tool_found = find_prog(os.path.join(cur_path, platform.system(), ClangReplConfig.DLIB))
        self.clang_rep = os.path.abspath(os.path.join(cur_path, '..', 'clang_repl_kernel',platform.system(), ClangReplConfig.BIN))
        self.my_shell = None
        self._idx = None
        self.get_idx()
        self.tu = None

        # # A C or C++ struct.
        # CursorKind.STRUCT_DECL = CursorKind(2)
        # # A C or C++ union.
        # CursorKind.UNION_DECL = CursorKind(3)
        # # A C++ class.
        # CursorKind.CLASS_DECL = CursorKind(4)
        # # A function.
        # CursorKind.FUNCTION_DECL = CursorKind(8)
        # # An Objective-C @interface.
        # CursorKind.OBJC_INTERFACE_DECL = CursorKind(11)
        # # An Objective-C @interface for a category.
        # CursorKind.OBJC_CATEGORY_DECL = CursorKind(12)
        # # An Objective-C @protocol declaration.
        # CursorKind.OBJC_PROTOCOL_DECL = CursorKind(13)
        # # An Objective-C instance method.
        # CursorKind.OBJC_INSTANCE_METHOD_DECL = CursorKind(16)
        # # An Objective-C class method.
        # CursorKind.OBJC_CLASS_METHOD_DECL = CursorKind(17)
        # # An Objective-C @implementation.
        # CursorKind.OBJC_IMPLEMENTATION_DECL = CursorKind(18)
        # # A C++ class method.
        # CursorKind.CXX_METHOD = CursorKind(21)
        # # A C++ namespace.
        # CursorKind.NAMESPACE = CursorKind(22)
        # # A C++ constructor.
        # CursorKind.CONSTRUCTOR = CursorKind(24)
        # # A C++ destructor.
        # CursorKind.DESTRUCTOR = CursorKind(25)
        # # A C++ function template.
        # CursorKind.FUNCTION_TEMPLATE = CursorKind(30)
        # # A C++ class template.
        # CursorKind.CLASS_TEMPLATE = CursorKind(31)
        # # A C++ class template partial specialization.
        # CursorKind.CLASS_TEMPLATE_PARTIAL_SPECIALIZATION = CursorKind(32)
        self.test_target = {CursorKind.STRUCT_DECL, CursorKind.UNION_DECL, CursorKind.CLASS_DECL,
                            CursorKind.FUNCTION_DECL, CursorKind.OBJC_INTERFACE_DECL, CursorKind.OBJC_CATEGORY_DECL,
                            CursorKind.OBJC_PROTOCOL_DECL, CursorKind.OBJC_INSTANCE_METHOD_DECL,
                            CursorKind.OBJC_CLASS_METHOD_DECL, CursorKind.OBJC_IMPLEMENTATION_DECL,
                            CursorKind.CXX_METHOD, CursorKind.NAMESPACE, CursorKind.CONSTRUCTOR,
                            CursorKind.DESTRUCTOR, CursorKind.FUNCTION_TEMPLATE, CursorKind.CLASS_TEMPLATE,
                            CursorKind.CLASS_TEMPLATE_PARTIAL_SPECIALIZATION}

    def run(self):
        if os.name == 'nt':
            self.my_shell = WinShell(self.clang_rep)
        else:
            self.my_shell = BashShell(self.clang_rep)
        self.my_shell.run()

    def get_shell(self):
        return self.my_shell

    def load(self, lib_file):
        abs_path = os.path.abspath(lib_file)
        if not(os.path.exists(abs_path) and os.path.isfile(abs_path)):
            abs_path = os.path.join(os.getcwd(), lib_file)
            assert os.path.exists(abs_path) and os.path.isfile(abs_path)
        response = None

        def resp_handler(x):
            nonlocal response
            response = x
        self.get_shell().do_execute('%lib ' + abs_path, resp_handler)
        assert response is None

    def include(self, header_file, is_system=False):
        response = None
        def resp_handler(x):
            nonlocal response
            response = x
        if is_system:
            self.get_shell().do_execute('#include <' + header_file + '>', resp_handler)
        else:
            self.get_shell().do_execute('#include "' + header_file+'"', resp_handler)
        assert response is None

    def get_idx(self):
        if self._idx is None:
            try:
                clang.cindex.Config.library_file = self.prog
            except OSError:
                print("Could not set library file:", self.prog)
                sys.exit()
            self._idx = clang.cindex.Index.create()
        return self._idx

    def _get_func_class_comment(self, file):
        result_comments = []

        try:
            f = open(file, 'rb')
        except OSError:
            print("Could not open/read file:", file)
            sys.exit()

        with f:
            s = f.read()
            self._get_func_class_comment_with_text(self.get_idx(), s, result_comments)

    def parse(self, text):
        this_src_file_dir = os.path.dirname(os.path.abspath(__file__))
        self.tu = clang.cindex.TranslationUnit.from_source('sample.cpp', args=['-std=c++11', '-I' + this_src_file_dir],
                                                      unsaved_files=[('sample.cpp', text)],
                                                      options=clang.cindex.TranslationUnit.PARSE_NONE)
        # self.tu = self.get_idx().parse('tmp.cpp', args=['-std=c++20'], unsaved_files=[('tmp.cpp', text)],
        #                               options=clang.cindex.TranslationUnit.PARSE_NONE)


    def unique_name(self, node):
        return node.spelling + '_' + str(node.extent.start.line) + '_' + str(node.extent.start.column) + '_' + str(
            node.extent.end.line) + '_' + str(node.extent.end.column)


    def filter_test(self, result_comments, result_tests):
        for node in result_comments:
            text = node.comment_token.spelling
            lines = text.split('\n')
            line_len = len(lines) -1
            test_lines = []
            idx = 0
            while idx < line_len:
                line = lines[idx]
                striped_line = line.strip()
                if any([prompt for prompt in CDocTestConfig.PROMPT if striped_line.startswith(prompt)]):
                    while striped_line !='':
                        if striped_line == Special.CONTINUE.value:
                            test_lines.append('')
                        else:
                            test_lines.append(line)
                        idx += 1
                        if idx >= line_len:
                            break
                        line = lines[idx]
                        striped_line = line.strip()
                        if any([prompt for prompt in CDocTestConfig.PROMPT if striped_line.startswith(prompt)]):
                            idx -= 1
                            break
                idx += 1

            if len(test_lines) > 0:
                node.test = TestCase(node.path, [])
                node.test.init(test_lines)
                result_tests.append(node)

    def _get_func_class_comment_with_text(self, result_comments):
        assert self.tu is not None
        root_node = Node.build_tree(self.tu.cursor)
        current_comment = None
        for t in self.tu.get_tokens(extent=self.tu.cursor.extent):
            if False:
                print('>', t.kind, t.spelling, t.location.line, t.location.column, t.cursor.kind, t.cursor.spelling,
                     t.cursor.location.line, t.cursor.location.column, t.cursor.extent.start.line,
                     t.cursor.extent.start.column,
                     t.cursor.extent.end.line, t.cursor.extent.end.column, t.cursor.extent.start.offset,
                     t.cursor.extent.end.offset, t.cursor)
            # TokenKind.PUNCTUATION,  CursorKind.COMPOUND_STMT remove current comment
            if t.kind == clang.cindex.TokenKind.PUNCTUATION \
                    and t.cursor.kind == clang.cindex.CursorKind.COMPOUND_STMT:
                current_comment = None

            # TokenKind.IDENTIFIER CursorKind.FUNCTION_DECL process comment if exists
            if t.kind == clang.cindex.TokenKind.IDENTIFIER and t.cursor.kind in self.test_target:
                if current_comment is not None:
                    result_comments.append(TestNode(t.cursor, current_comment))
                    current_comment = None
            # TokenKind.COMMENT CursorKind.INVALID_FILE add comment
            if t.kind == clang.cindex.TokenKind.COMMENT:
                current_comment = t

    def get_func_class_comment(self, target_file, header_paths=[]):
        #self.open()
        #self.load(lib_name)
        target_file_name = os.path.basename(target_file)
        idx_front = target_file_name.index('.')+1
        is_header = target_file_name[idx_front] == 'h'
        abs_path = os.path.abspath(target_file).dir()
        header_file = None
        c_file = None
        files = None
        if not is_header:
            file_names = []
            header_paths.append(abs_path)
            header_front = target_file[:idx_front]+['h']
            for a_path in header_paths:
                file_names += [os.path.join(a_path,fn) for fn in os.listdir(a_path)
                                  if os.path.isfile(fn)
                                  and fn.startswith(header_front)
                                  and len(fn) <= idx_front+3]

            print("warning: there is multiple header files", file_names)
            header_file = file_names[0] if len(file_names) == 1 else None

            c_file = target_file
            files = [header_file, c_file]
        else:
            header_file = target_file
            c_file = None
            files = [header_file]

        result = []
        for file in files:
            result += self._get_func_class_comment(file)
        return result

    def parse_result_test_node(self, file_content, tests_nodes):
        result_comments = []
        self.parse(file_content)
        self._get_func_class_comment_with_text(result_comments)
        self.filter_test(result_comments, tests_nodes)

    def merge_comments(self, c_test_node, h_test_node):
        inserted = []
        for node in c_test_node:
            inserted.append(node)
        if h_test_node is not None:
            for node in h_test_node:
                inserted.append(node)

        return inserted

    def get_test_nodes(self, h_file_content, c_file_content):
        c_tests_nodes = []
        h_tests_nodes = []
        #self.parse_result_test_node(c_file_content, c_tests_nodes)
        self.parse_result_test_node(h_file_content, h_tests_nodes)
        merged_node = self.merge_comments(c_tests_nodes, h_tests_nodes)
        return merged_node

    def run_verify(self, target_lib, merged_node, name=None, header_extension='.h'):

        for node in merged_node:
            self.run()
            # target_lib can separate by ';'
            target_libs = target_lib.split(';')
            for target_lib in target_libs:
                self.load(target_lib)
            self.include('cstdio', True)
            if name is not None:
                self.include(name + '.' + header_extension)
            node.test.run(self.get_shell())



