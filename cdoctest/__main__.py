import argparse
import os

import clang.cindex

from cdoctest import CDocTest
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

# if main
if __name__ == '__main__':
    # args "target file", "target tc", "target lib"
    parser = argparse.ArgumentParser(
        prog='cdoctest',
        description='It run doctest for C/C++ code')
    parser.add_argument('-cdtt', '--cdt_target', help='target file', required=True) # todo directory
    parser.add_argument('-cdtce', '--cdt_c_extension', help='target c file extension', default='cpp')
    parser.add_argument('-cdthe', '--cdt_header_extension', help='target h file extension', default='h')
    parser.add_argument('-cdttc', '--cdt_testcase_extension', help='target tc', default='*')
    parser.add_argument('-cdtl', '--cdt_target_lib', help='target lib', required=True)
    parser.add_argument('-cdtcip', '--cdt_cplus_include_path', help='target lib type')

    args = parser.parse_args()

    cdoctest = CDocTest()
    c_tests_nodes = []
    Shell.env = os.environ.copy()
    if args.cdt_cplus_include_path is not None:
        Shell.env['CPLUS_INCLUDE_PATH'] = args.cdt_cplus_include_path

    target_file = args.cdt_target

    assert os.path.isfile(target_file) and os.path.exists(target_file)
    with open(target_file, 'r') as f:
        c_file_content = f.read()
        cdoctest.parse_result_test_node(c_file_content, c_tests_nodes)
        merged_node = cdoctest.merge_comments(c_tests_nodes, None)

        target_file_name = os.path.basename(target_file).split('.')[0]
        cdoctest.run_verify(args.cdt_target_lib, merged_node, target_file_name, args.cdt_header_extension)

        for i in range(len(merged_node)):
            print(merged_node[i].path, 'pass' if merged_node[i].test.is_pass else 'fail')
            for test in merged_node[i].test.tests:
                if test.is_pass:
                    print('>', str(test), 'pass')
                else:
                    print('>', str(test), 'fail')
                    print('expected: ', test.outputs)
                    print('actual: ', test.output_result)

