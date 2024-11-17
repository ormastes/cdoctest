import clang.cindex
import os
from clang_repl_kernel import ClangReplKernel

h = '''
#pragma once
/*
>>> fac(5)
120
*/
class Fac {
public:
int fac(int n);
};
'''
c = '''
#include "dummy.h"
namespace test {
int Fac::fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
}
'''
# TokenKind.PUNCTUATION,  CursorKind.COMPOUND_STMT remove current comment
# TokenKind.IDENTIFIER CursorKind.FUNCTION_DECL process comment if exists
# TokenKind.COMMENT CursorKind.INVALID_FILE add comment

# if main
if __name__ == '__main__':
    clang.cindex.Config.set_library_file('C:/Program Files/LLVM/bin/libclang.dll')
    idx = clang.cindex.Index.create()
    this_src_file_dir = os.path.dirname(os.path.abspath(__file__))

    #tu = idx.parse('sample.cpp', args=['-std=c++11', '-I'+this_src_file_dir],  unsaved_files=[('sample.cpp', h)],
    #               options=clang.cindex.TranslationUnit.PARSE_INCOMPLETE)

    #clang_parseTranslationUnit
    tu = clang.cindex.TranslationUnit.from_source('sample.cpp', args=['-std=c++11', '-I' + this_src_file_dir], unsaved_files=[('sample.cpp', c)],
                                                  options=clang.cindex.TranslationUnit.PARSE_NONE)

    for t in tu.get_tokens(extent=tu.cursor.extent):
        print('>', t.kind, t.spelling, t.location.line, t.location.column, t.cursor.kind, t.cursor.spelling,
              t.cursor.location.line, t.cursor.location.column, t.cursor.extent.start.line, t.cursor.extent.start.column,
              t.cursor.extent.end.line, t.cursor.extent.end.column, t.cursor.extent.start.offset,
              t.cursor.extent.end.offset, t.cursor)

    function_calls = []
    function_declarations = []

    def traverse(node):
        print(node.kind, node.spelling)

        for child in node.get_children():
            traverse(child)

        if node.type == clang.cindex.CursorKind.CALL_EXPR:
            function_calls.append(node)

        if node.type == clang.cindex.CursorKind.FUNCTION_DECL:
            function_declarations.append(node)


        print('Found %s [line=%s, col=%s]' % (node.displayname, node.location.line, node.location.column))

    traverse(tu.cursor)
