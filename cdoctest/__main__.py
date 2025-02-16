import argparse
import os
import sys
import runpy

import clang.cindex

from cdoctest import CDocTest
from cdoctest import CMakeApi
from clang_repl_kernel import ClangReplKernel, Shell

s = '''
>>> fac(5)
120
*/
int fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
'''
# TokenKind.PUNCTUATION,  CursorKind.COMPOUND_STMT remove current comment
# TokenKind.IDENTIFIER CursorKind.FUNCTION_DECL process comment if exists
# TokenKind.COMMENT CursorKind.INVALID_FILE add comment
def init_include_path(cdt_include_path):
    if cdt_include_path is not None:
        cdt_include_path = ';'.join(cdt_include_path)
        # if linux replace ';' to ':'
        if os.name == 'posix':
            Shell.env['CPLUS_INCLUDE_PATH'] = cdt_include_path.replace(';', ':')
        else:
            Shell.env['CPLUS_INCLUDE_PATH'] = cdt_include_path


def run_test(cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, merged_node, target_file, args):
    target_file_name = os.path.basename(target_file).split('.')[0]
    cdoctest.run_verify(cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, merged_node, target_file_name, args.cdt_header_extension)

    output_file = args.cdt_output_xml
    if output_file is not None:
        with open(output_file, 'w') as f:
            fail_count = 0
            num_test = len(merged_node)
            for i in range(len(merged_node)):
                if not merged_node[i].test.is_pass:
                    fail_count += 1
            # https://github.com/unittest-cpp/unittest-cpp/blob/master/UnitTest%2B%2B/XmlTestReporter.cpp
            f.write('<unitest-results tests="'+str(num_test)+'" failedtests="'+str(fail_count)+'" >\n')
            for i in range(len(merged_node)):
                f.write('<test suite="'+merged_node[i].suite()+'" name="'+merged_node[i].name()+'" />\n')
            f.write('</unitest-results>\n')

    for i in range(len(merged_node)):
        print(merged_node[i].full_path(), 'pass' if merged_node[i].test.is_pass else 'fail')
        for test in merged_node[i].test.tests:
            if test.is_pass:
                print('>', str(test), 'pass')
            else:
                print('>', str(test), 'fail')
                print('expected: ', test.outputs)
                print('actual: ', test.output_result)

def list_test(cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, merged_node, target_file, args):
    for i in range(len(merged_node)):
        node = merged_node[i]
        print(node.full_path() + ','+ str(node.id_token.extent.start.line) + ',' \
            + str(node.id_token.extent.start.column) + ',' + str(node.id_token.extent.end.line) + ',' \
            + str(node.id_token.extent.end.column))

def do_job(job_function, target_files, cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, args):
    for target_file in target_files:
        abs_target_file = os.path.abspath(target_file)
        assert os.path.exists(abs_target_file) and os.path.isfile(abs_target_file)
        relative_path_from_cwd = os.path.relpath(abs_target_file, os.getcwd())
        with open(abs_target_file, 'r') as f:
            c_file_content = f.read()
            cdoctest.parse_result_test_node(c_file_content, c_tests_nodes, relative_path_from_cwd)
            merged_node = cdoctest.merge_comments(c_tests_nodes, None)
            job_function(cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, merged_node, abs_target_file, args)


if __name__ == '__main__':
    # args "target file", "target tc", "target lib"
    parser = argparse.ArgumentParser(
        prog='cdoctest',
        description='It run doctest for C/C++ code')
    parser.add_argument('-cdtsrp', '--cdt_src_root_path', help='Source file root path. Default is current directory.', default=os.getcwd())

    parser.add_argument('-cdttf', '--cdt_target_file', help='target file')
    parser.add_argument('-cdtl', '--cdt_target_lib', help='target lib, separate by ";"')
    parser.add_argument('-cdtlp', '--cdt_lib_path', help='target lib dir path, separate by ";"')
    parser.add_argument('-cdtip', '--cdt_include_path', help='target include path, separate by ";"')

    parser.add_argument('-cdtcpe', '--cdt_cpp_extension', help='target cpp file extension', default='cpp')
    parser.add_argument('-cdtce', '--cdt_c_extension', help='target c file extension', default='c')
    parser.add_argument('-cdthe', '--cdt_header_extension', help='target h file extension', default='h')

    parser.add_argument('-v', '--verbose', help='verbose mode', default=False, action='store_true')

    parser.add_argument('-cdtct', '--cdt_cmake_target', help='target to test, current build target will be used if not present.')
    parser.add_argument('-cdtcbp', '--cdt_cmake_build_path', help='cmake build path to search cmake api.')

    parser.add_argument('-cdtlt', '--cdt_list_testcase', help='list all available test cases. Use "2> error.log" when there is a system message', default=False, action='store_true')
    parser.add_argument('-cdtrt', '--cdt_run_testcase', help='run a or lists of test cases, separate by ";"')
    parser.add_argument('-cdtox', '--cdt_output_xml', help='output xml file', default='output.vsc')


    # 1. cmake dll from target 
    # 2. cmake cpp/c/header from dlls
    # 3. derive headers from cpp
    # 4. list tests on a file
    # 5. dir and file base show test lists
    # input build path, target

    args = parser.parse_args()

    none_cmake_args = ["cdt_target_file", "cdt_target_lib"]
    cmake_args = ["cdt_cmake_build_path", "cdt_cmake_target"]
    exist_none_cmake_args = any([getattr(args, arg) is not None for arg in none_cmake_args])
    exist_cmake_args = any([getattr(args, arg) is not None for arg in cmake_args])

    if exist_none_cmake_args and exist_cmake_args:
        raise Exception("Cannot use cmake "+", ".join(none_cmake_args)+" and "+", ".join(cmake_args)+" together.")

    if args.cdt_list_testcase is not False and args.cdt_run_testcase is not None:
        raise Exception("Cannot use --cdt_list_testcase and --cdt_run_testcase together.")


    if args.cdt_target_file is None and args.cdt_cmake_build_path is None:
        raise Exception("Either target file --cdt_target_file or cmake build path --cdt_cmake_build_path should be provided.")

    verbose = args.verbose

    cdoctest = CDocTest()
    c_tests_nodes = []
    Shell.env = os.environ.copy()

    # cdt_src_root_path make current working directory
    os.chdir(args.cdt_src_root_path)

    # cdt_target_file
    target_files = [] if args.cdt_target_file is None else\
        args.cdt_target_file if isinstance(args.cdt_target_file, list) else [args.cdt_target_file]

    # args.cdt_target_lib
    cdt_target_lib = [] if args.cdt_target_lib is  None else [args.cdt_target_lib]

    # cdt_target_lib
    cdt_target_lib_dir = [os.getcwd()] + ([] if args.cdt_lib_path is None else args.cdt_lib_path.split(';') )
    cdt_target_lib_dir = [os.path.abspath(path) for path in cdt_target_lib_dir]

    # cdt_include_path
    cdt_include_path =  [os.getcwd()] + ([] if args.cdt_include_path is None else args.cdt_include_path.split(';') )
    cdt_include_path = [os.path.abspath(path) for path in cdt_include_path]

    # cdt_c_extension cdt_header_extension is simple just bypass

    # cdt_cmake_target
    cdt_cmake_target = args.cdt_cmake_target

    # cdt_cmake_build_path
    cdt_cmake_build_path = args.cdt_cmake_build_path
    if cdt_cmake_build_path is not None:
        assert os.path.exists(cdt_cmake_build_path) and os.path.isdir(cdt_cmake_build_path)
        assert cdt_cmake_target is not None
        cmakeApi = CMakeApi(cdt_cmake_build_path, cdt_cmake_target, verbose)
        cdt_cmake_target = cmakeApi.get_target()
        cdt_target_lib = cdt_target_lib + cmakeApi.get_all_libs_artifact()
        cdt_include_path = cdt_include_path +list(cmakeApi.get_all_include_path())
        target_files = list(cmakeApi.get_all_candidate_sources_headers(target_files, args.cdt_c_extension, args.cdt_cpp_extension, args.cdt_header_extension))

    # cdt_include_path
    init_include_path(cdt_include_path)

    # cdt_run_testcase
    cdt_run_testcase = [] if args.cdt_run_testcase is None else args.cdt_run_testcase.split(';')

    # cdt_list_testcase
    if args.cdt_list_testcase:
        do_job(list_test, target_files, cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, args)

    else:
        do_job(run_test, target_files, cdt_target_lib, cdt_target_lib_dir, cdt_run_testcase, args)

    # Don't know why exception yet.
    try:
        def __new_del__(self):
            if clang is not None and clang.cindex is not None and clang.cindex.conf is not None:
                clang.cindex.conf.lib.clang_disposeIndex(self)

        clang.cindex.Index.__del__ = __new_del__

        del clang.cindex.Index
    except Exception:
        pass