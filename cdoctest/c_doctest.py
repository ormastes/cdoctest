import enum
import os
import clang.cindex
import sys
import platform

from IPython.testing.tools import full_path

from clang_repl_kernel import ClangReplKernel, PlatformPath, ClangReplConfig, find_prog, WinShell, BashShell, install_bundles, get_dll_or_download
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
        if hasattr(id_token, "kind") and id_token.kind in CDocTest.test_grouping:
            self.end_text = "::" + CDocTest.test_grouping_to_text[id_token.kind]
        else:
            self.end_text = ""
        self.text = id_token.spelling + self.end_text
        self.path = id_token.spelling if parent_cursor is None else parent_cursor.path + '::' + id_token.spelling if id_token.spelling != '' else parent_cursor.path
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
            self.path = self.parent_cursor.path + '::' + id_token.spelling
        Node.node_map[self.__str__()] = self

    def __str__(self):
        return self.text + '_' + str(self.id_token.extent.start.line) + '_' \
            + str(self.id_token.extent.start.column) + '_' + str(self.id_token.extent.end.line) + '_' \
            + str(self.id_token.extent.end.column)

    def __repr__(self):
        return self.full_path() + '_' + str(self.id_token.extent.start.line) + '_' \
            + str(self.id_token.extent.start.column) + '_' + str(self.id_token.extent.end.line) + '_' \
            + str(self.id_token.extent.end.column)

    def __hash__(self):
        return hash(self.__repr__())

    def __eq__(self, other):
        return  self.__repr__() == other.__repr__()

    def full_path(self):
        return self.path + self.end_text

    def suite(self):
        full_path = self.full_path()
        if "::" in full_path:
            last_index = full_path.rindex("::")
            return full_path[:last_index]
        return ""

    def name(self):
        full_path = self.full_path()
        if "::" in full_path:
            last_index = full_path.rindex("::")
            return full_path[last_index+2:]
        return full_path

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
import errno
from subprocess import check_output
def is_tool(name):
    try:
        import subprocess, os
        my_env = os.environ.copy()
        devnull = open(os.devnull)
        subprocess.Popen([name], stdout=devnull, stderr=devnull,  env=my_env).communicate()
    except OSError as e:
        if e.errno == errno.ENOENT:
            return False
    return True

def _find_prog(prog):
    if os.path.isabs(prog) and os.path.exists(prog):
        return prog, False
    # file part of prog
    prog = os.path.basename(prog)

    os_dir = None
    if platform.system() == "Windows":
        # find first directory start with 'Win'
        for dir in os.listdir(ClangReplConfig.CLANG_BASE_DIR):
            if dir.startswith('Win') and os.path.isdir(os.path.join(ClangReplConfig.CLANG_BASE_DIR, dir)):
                os_dir = dir
                break
    else:
        os_dir = platform.system()

    if os_dir is not None:
        embedded_prog = os.path.join(ClangReplConfig.CLANG_BASE_DIR, os_dir, "bin", prog)
        if os.path.isfile(embedded_prog) and os.path.exists(embedded_prog):
            return embedded_prog, False

    if is_tool(prog):
        cmd = "where" if platform.system() == "Windows" else "which"
        out = check_output([cmd, prog])
        out = out.decode('utf-8')
        for line in out.splitlines():
            if len(line.strip()) > 0:
                out = line.strip()
                break
        assert os.path.isfile(out)
        assert os.path.exists(out)
        return out, True
    return None, False

class CDocTest:
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
    test_target = {CursorKind.STRUCT_DECL, CursorKind.UNION_DECL, CursorKind.CLASS_DECL,
                        CursorKind.FUNCTION_DECL, CursorKind.OBJC_INTERFACE_DECL, CursorKind.OBJC_CATEGORY_DECL,
                        CursorKind.OBJC_PROTOCOL_DECL, CursorKind.OBJC_INSTANCE_METHOD_DECL,
                        CursorKind.OBJC_CLASS_METHOD_DECL, CursorKind.OBJC_IMPLEMENTATION_DECL,
                        CursorKind.CXX_METHOD, CursorKind.NAMESPACE, CursorKind.CONSTRUCTOR,
                        CursorKind.DESTRUCTOR, CursorKind.FUNCTION_TEMPLATE, CursorKind.CLASS_TEMPLATE,
                        CursorKind.CLASS_TEMPLATE_PARTIAL_SPECIALIZATION}

    test_grouping = {CursorKind.STRUCT_DECL, CursorKind.UNION_DECL, CursorKind.CLASS_DECL,
                          CursorKind.NAMESPACE}
    test_grouping_to_text = {CursorKind.STRUCT_DECL: 'struct', CursorKind.UNION_DECL: 'union',
                                    CursorKind.CLASS_DECL: 'class', CursorKind.NAMESPACE: 'namespace'}

    def __init__(self):
        ClangReplConfig.set_platform(ClangReplConfig.get_default_platform())
        #prog = ClangReplConfig.get_bin_path()
        #self.prog, self.is_tool_found = find_prog(prog)
        dll_platform = PlatformPath.PYTHON_DLL_PATH[ClangReplConfig.PLATFORM_NAME_ENUM.value][ClangReplConfig.get_python_bits().value]
        python_native_bin_dir = os.path.join(
            ClangReplConfig.PYTHON_CLANG_DLL_DIR,
            dll_platform)
        get_dll_or_download(dll_platform, ClangReplConfig.PYTHON_CLANG_LIB, python_native_bin_dir)
        self.prog, self.is_tool_found = _find_prog(os.path.join(python_native_bin_dir, ClangReplConfig.PYTHON_CLANG_LIB))

        if len(ClangReplConfig.get_available_bin_path()) == 0:
            # clang is not installed in the system
            print("Can not find installed clang. Try to install... Please wait")
            install_bundles(platform.system(), None)

        if len(ClangReplConfig.get_available_bin_path()) == 0:
            print("Could not find any clang for this platform")
            sys.exit()

        self.clang_rep = ClangReplConfig.get_bin_path()
        self.my_shell = None
        self._idx = None
        self.get_idx()
        self.tu = None

        if os.name == 'nt':
            self.default_lib = []
        else:
            self.default_lib = []




    def run(self):
        if os.name == 'nt':
            self.my_shell = WinShell(self.clang_rep)
        else:
            self.my_shell = BashShell(self.clang_rep)
        self.my_shell.run()

    def get_shell(self):
        return self.my_shell

    def check_lib_exist(self, lib_file):
        possible_paths = [
            os.path.abspath(lib_file),
            os.path.join(os.getcwd(), lib_file),
            os.path.join(ClangReplConfig.get_bin_dir(), lib_file)
        ]

        abs_path = None
        for path in possible_paths:
            if os.path.exists(path) and os.path.isfile(path):
                abs_path = path
                break

        if abs_path is None:
            print("Could not find library file:", lib_file)
            sys.exit()

    def local_load(self, lib_file, paths):
        possible_paths = []
        for path in paths:
            possible_paths.append(os.path.join(path, lib_file))

        abs_path = None
        for path in possible_paths:
            if os.path.exists(path) and os.path.isfile(path):
                abs_path = path
                break

        if abs_path is None:
            print("Could not find library file:", lib_file)
            sys.exit()

        response = None

        def resp_handler(x):
            nonlocal response
            response = x

        self.get_shell().do_execute('%lib ' + lib_file, resp_handler)
        assert response is None

    def load(self, lib_file):
        #self.check_lib_exist(lib_file)

        response = None

        def resp_handler(x):
            nonlocal response
            response = x

        self.get_shell().do_execute('%lib ' + lib_file, resp_handler)
        if response is None:
            print("Warning! Could not load lib file:", lib_file)

    def include(self, header_file, is_system=False):
        response = None
        def resp_handler(x):
            nonlocal response
            response = x
        if is_system:
            self.get_shell().do_execute('#include <' + header_file + '>', resp_handler)
        else:
            self.get_shell().do_execute('#include "' + header_file + '"', resp_handler)
        if response is None:
            print("Warning! Could not include file:", header_file)


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

    def parse(self, text, file_name):
        self.tu = clang.cindex.TranslationUnit.from_source("dummy.cpp", args=['-std=c++20', '-I' + os.getcwd()],
                                                      unsaved_files=[("dummy.cpp", text)],
                                                      options=clang.cindex.TranslationUnit.PARSE_NONE)
        assert self.tu is not None
        class ByPass:
            def __init__(self, cursor, file_name):
                file_name = file_name.replace('\\', '/')
                file_name = file_name.replace('/', '::')
                self._cursor = cursor
                self.displayname = file_name
                self.spelling = file_name

            def __setattr__(self, key, value):
                if key in ['displayname', 'spelling', '_cursor']:
                    self.__dict__[key] = value
                else:
                    setattr(self._cursor, key, value)

            def __getattr__(self, name):
                if name in ['displayname', 'spelling', '_cursor'] or name is None:
                    if name in self.__dict__:
                        return self.__dict__[name]
                    else:
                        return None
                return getattr(self._cursor, name)

            def __call__(self, *args, **kwargs):
                return self._cursor(*args, **kwargs)

        self.wrapptedRootCursor = ByPass(self.tu.cursor, file_name)
        # self.tu = self.get_idx().parse('tmp.cpp', args=['-std=c++20', '-I' + this_src_file_dir],, unsaved_files=[('tmp.cpp', text)],
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
        root_node = Node.build_tree(self.wrapptedRootCursor) # replace self.tu.cursor with self.wrapptedRootCursor
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

    def parse_result_test_node(self, file_content, tests_nodes, file_name):
        result_comments = []
        self.parse(file_content, file_name)
        self._get_func_class_comment_with_text(result_comments)
        self.filter_test(result_comments, tests_nodes)

    def merge_comments(self, c_test_node, h_test_node):
        inserted = []
        for node in c_test_node:
            inserted.append(node)
        if h_test_node is not None:
            for node in h_test_node:
                inserted.append(node)

        for node in inserted:
            # first child is comment
            if len(node.test.tests) > 0:
                test_name = node.test.tests[0].cmd.strip()
                if test_name.startswith('//'):
                    test_name = test_name[2:]
                    test_name = test_name.strip().replace(' ', '_').replace('\t', '_')
                    node.end_text = node.end_text + ':' + test_name
        inserted_map = {}
        for node in inserted:
            if node.full_path() in inserted_map.keys():
                inserted_map[node.full_path()].append(node)
            else:
                inserted_map[node.full_path()] = [node]
        for key in inserted_map.keys():
            if len(inserted_map[key]) > 1:
                for i in range(0, len(inserted_map[key])):
                    inserted_map[key][i].end_text = inserted_map[key][i].end_text + ':' + str(i+1)
        return inserted

    def get_test_nodes(self, h_file_content, c_file_content):
        c_tests_nodes = []
        h_tests_nodes = []
        #self.parse_result_test_node(c_file_content, c_tests_nodes)
        self.parse_result_test_node(h_file_content, h_tests_nodes)
        merged_node = self.merge_comments(c_tests_nodes, h_tests_nodes)
        return merged_node

    def run_verify(self, local_target_lib, cdt_target_lib_dir, cdt_run_testcase, merged_node, name=None, header_extension='.h'):
        # if target_lib is string make it list
        if isinstance(local_target_lib, str):
            local_target_lib = [local_target_lib]

        filtered_node = []
        if cdt_run_testcase is not None and len(cdt_run_testcase) > 0:
            for node in merged_node:
                if node.full_path() in cdt_run_testcase:
                    filtered_node.append(node)
        else:
            filtered_node.extend(merged_node)

        merged_node.clear()
        merged_node.extend(filtered_node)

        for node in merged_node:
            self.run()
            for target_lib in self.default_lib:
                self.load(target_lib)
            for target_lib in local_target_lib:
                self.local_load(target_lib, cdt_target_lib_dir)
            self.include('cstdio', True)
            self.include('iostream', True)
            if name is not None:
                self.include(name + '.' + header_extension)
            node.test.run(self.get_shell())



