#include "sample.h"
namespace test {
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(7));
5040
*/
int Fac::fac(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac2(5));
120
*/
int Fac::fac2(int n) {
    return (n>1) ? n*fac(n-1) : 1;
}
}
