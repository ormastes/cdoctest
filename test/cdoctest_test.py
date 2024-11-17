from cdoctest import CDocTest
from clang_repl_kernel import ClangReplConfig, Shell
import platform
import pytest


# function, class, module, session
@pytest.fixture(scope='session')
def cdoctest():
    return CDocTest()


def test_find_dll(cdoctest):
    assert cdoctest.prog.endswith(ClangReplConfig.DLIB)


def test_get_idx(cdoctest):
    idx = cdoctest.get_idx()
    assert idx is not None


def test_get_func_class_comment_with_text(cdoctest):
    file_content = """
/**
>>> fac(5)
120
*/
int fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}    
    """
    result_comments = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)
    assert len(result_comments) == 1
    assert result_comments[0].comment_token.spelling == '/**\n>>> fac(5)\n120\n*/'
    assert result_comments[0].text == 'fac'


def test_multiple_func_class_comment_with_text(cdoctest):
    file_content = """
/**
>>> fac(5)
120
*/
int fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
/**
>>> fac2(5)
120
*/
int fac2(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
    """
    result_comments = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)
    assert len(result_comments) == 2
    assert result_comments[0].comment_token.spelling == '/**\n>>> fac(5)\n120\n*/'
    assert result_comments[0].text == 'fac'
    assert result_comments[1].comment_token.spelling == '/**\n>>> fac2(5)\n120\n*/'
    assert result_comments[1].text == 'fac2'


def test_class_comment_with_text(cdoctest):
    file_content = """
/**
>>> Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
class Fac {
public:
/**
>>> Fac fac;
>>> fac.fac(5);
120
*/
    int fac(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    int fac2(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
};
    """
    result_comments = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)
    assert len(result_comments) == 2
    assert result_comments[0].comment_token.spelling == '/**\n>>> Fac fac;\n>>> fac.fac(5);\n120\n>>> fac.fac2(5);\n120\n*/'
    assert result_comments[0].text == 'Fac'
    assert result_comments[1].comment_token.spelling == '/**\n>>> Fac fac;\n>>> fac.fac(5);\n120\n*/'
    assert result_comments[1].text == 'fac'


def test_set_path(cdoctest):
    file_content = """
namespace test {
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
class Fac {
public:
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
*/
    int fac(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    int fac2(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
};
}
    """
    result_comments = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)

    assert len(result_comments) == 2
    assert result_comments[0].comment_token.spelling== '/**\n>>> test::Fac fac;\n>>> fac.fac(5);\n120\n>>> fac.fac2(5);\n120\n*/'
    assert result_comments[0].text == 'Fac'
    assert result_comments[0].path == 'sample.cpp::test::Fac'

    assert result_comments[1].comment_token.spelling == '/**\n>>> test::Fac fac;\n>>> fac.fac(5);\n120\n*/'
    assert result_comments[1].text == 'fac'
    assert result_comments[1].path == 'sample.cpp::test::Fac::fac'

def test_set_path_with_namespace(cdoctest):
    file_content = """
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
namespace test {
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
class Fac {
public:
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
*/
    int fac(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    int fac2(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
};
}
    """
    result_comments = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)
    assert len(result_comments) == 3
    assert result_comments[0].comment_token.spelling == '/**\n>>> test::Fac fac;\n>>> fac.fac(5);\n120\n>>> fac.fac2(5);\n120\n*/'
    assert result_comments[0].text == 'test'
    assert result_comments[0].path == 'sample.cpp::test'

    assert result_comments[1].comment_token.spelling == '/**\n>>> test::Fac fac;\n>>> fac.fac(5);\n120\n>>> fac.fac2(5);\n120\n*/'
    assert result_comments[1].text == 'Fac'
    assert result_comments[1].path == 'sample.cpp::test::Fac'

    assert result_comments[2].comment_token.spelling  == '/**\n>>> test::Fac fac;\n>>> fac.fac(5);\n120\n*/'
    assert result_comments[2].text == 'fac'
    assert result_comments[2].path == 'sample.cpp::test::Fac::fac'

def test_filter_test(cdoctest):
    file_content = """
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
namespace test {
/**
j;fldkjf;lasdfjkl;sd
dfsdfsdf
fdfsdfsdfsd
flasdkfj;lsdfkj
120
*/
class Fac {
public:
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
*/
    int fac(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    int fac2(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
};
}
    """
    result_comments = []
    tests_nodes = []
    cdoctest.parse(file_content)
    cdoctest._get_func_class_comment_with_text(result_comments)
    cdoctest.filter_test(result_comments, tests_nodes)
    assert len(tests_nodes) == 2
    assert tests_nodes[0].test.tests[0].cmd == 'test::Fac fac;'
    assert tests_nodes[0].test.tests[0].outputs == []
    assert tests_nodes[0].test.tests[1].cmd == 'fac.fac(5);'
    assert tests_nodes[0].test.tests[1].outputs == ['120']
    assert tests_nodes[0].test.tests[2].cmd == 'fac.fac2(5);'
    assert tests_nodes[0].test.tests[2].outputs == ['120']
    assert tests_nodes[0].text == 'test'
    assert tests_nodes[0].path == 'sample.cpp::test'

    assert tests_nodes[1].test.tests[0].cmd == 'test::Fac fac;'
    assert tests_nodes[1].test.tests[0].outputs == []
    assert tests_nodes[1].test.tests[1].cmd == 'fac.fac(5);'
    assert tests_nodes[1].test.tests[1].outputs == ['120']
    assert tests_nodes[1].text == 'fac'
    assert tests_nodes[1].path == 'sample.cpp::test::Fac::fac'




def test_merge_comments(cdoctest):
    c_file_content = """
#include "sample.h"
namespace test {
/**
>>> test::Fac fac;
>>> fac.fac(7);
5040
*/
int Fac::fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
/**
>>> test::Fac fac;
>>> fac.fac2(5);
120
*/
int Fac::fac2(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
}
"""
    h_file_content = """
#pragma once
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
>>> fac.fac2(5);
120
*/
namespace test {
/**
j;fldkjf;lasdfjkl;sd
dfsdfsdf
fdfsdfsdfsd
flasdkfj;lsdfkj
120
*/
class Fac {
public:
/**
>>> test::Fac fac;
>>> fac.fac(5);
120
*/
    int fac(int n);
    int fac2(int n);
};
}
    """
    c_tests_nodes = []
    h_tests_nodes = []
    cdoctest.parse_result_test_node(c_file_content, c_tests_nodes)
    cdoctest.parse_result_test_node(h_file_content, h_tests_nodes)
    merged_node = cdoctest.merge_comments(c_tests_nodes, h_tests_nodes)

    assert len(merged_node) == 4
    assert merged_node[0].test.tests[0].cmd == 'test::Fac fac;'
    assert merged_node[0].test.tests[0].outputs == []
    assert merged_node[0].test.tests[1].cmd == 'fac.fac(7);'
    assert merged_node[0].test.tests[1].outputs == ['5040']
    assert merged_node[0].text == 'fac'
    assert merged_node[0].path == 'sample.cpp::test::fac'

    assert merged_node[1].test.tests[0].cmd == 'test::Fac fac;'
    assert merged_node[1].test.tests[0].outputs == []
    assert merged_node[1].test.tests[1].cmd == 'fac.fac2(5);'
    assert merged_node[1].test.tests[1].outputs == ['120']
    assert merged_node[1].text == 'fac2'
    assert merged_node[1].path == 'sample.cpp::test::fac2'

    assert merged_node[2].test.tests[0].cmd == 'test::Fac fac;'
    assert merged_node[2].test.tests[0].outputs == []
    assert merged_node[2].test.tests[1].cmd == 'fac.fac(5);'
    assert merged_node[2].test.tests[1].outputs == ['120']
    assert merged_node[2].test.tests[2].cmd == 'fac.fac2(5);'
    assert merged_node[2].test.tests[2].outputs == ['120']
    assert merged_node[2].text == 'test'
    assert merged_node[2].path == 'sample.cpp::test'

    assert merged_node[3].test.tests[0].cmd == 'test::Fac fac;'
    assert merged_node[3].test.tests[0].outputs == []
    assert merged_node[3].test.tests[1].cmd == 'fac.fac(5);'
    assert merged_node[3].test.tests[1].outputs == ['120']
    assert merged_node[3].text == 'fac'
    assert merged_node[3].path == 'sample.cpp::test::Fac::fac'


def test_run_verify(cdoctest):
    c_file_content = """
    #include "sample.h"
    namespace test {
    /**
    >>> test::Fac fac;
    >>> printf("%d\\n",fac.fac(7));
    5040
    */
    int Fac::fac(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    /**
    >>> test::Fac fac;
    >>> printf("%d\\n",fac.fac2(5));
    120
    */
    int Fac::fac2(int n) {
        return (n>1) ? n*fac(n-1) : 1;
    }
    }
    """
    h_file_content = """
    #pragma once
    /**
    >>> test::Fac fac;
    >>> printf("%d\\n",fac.fac(5));
    120
    >>> printf("%d\\n",fac.fac2(5));
    120
    */
    namespace test {
    /**
    j;fldkjf;lasdfjkl;sd
    dfsdfsdf
    fdfsdfsdfsd
    flasdkfj;lsdfkj
    120
    */
    class Fac {
    public:
    /**
    >>> test::Fac fac;
    >>> printf("%d\\n",fac.fac(5));
    120
    */
        int fac(int n);
        int fac2(int n);
    };
    }
        """
    c_tests_nodes = []
    h_tests_nodes = []
    Shell.env['CPLUS_INCLUDE_PATH'] = '/mnt/c/cling/jupyter/llvm-project_linux/build/lib/clang/18/include'
    cdoctest.parse_result_test_node(c_file_content, c_tests_nodes)
    cdoctest.parse_result_test_node(h_file_content, h_tests_nodes)
    merged_node = cdoctest.merge_comments(c_tests_nodes, h_tests_nodes)

    cdoctest.run_verify('sample.so', merged_node, 'sample', 'h')

    for i in range(len(merged_node)):
        assert merged_node[i].test.is_pass is True
        for test in merged_node[i].test.tests:
            assert test.is_pass is True
