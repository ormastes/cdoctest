#include "sample.h"
namespace test {
/**
>>> test::Fac fac;
>>> std::cout << fac.fac(7) << std::endl;
5040
*/
int Fac::fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
/**
>>> test::Fac fac;
>>> std::cout << fac.fac2(5) << std::endl;
120
*/
int Fac::fac2(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
}
