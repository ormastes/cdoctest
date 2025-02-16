#pragma once
/**
>>> test::Fac fac;
>>> std::cout << fac.fac(5) << std::endl;//printf("%d\n",fac.fac(5));
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
>>> printf("%d\n",fac.fac(5));
120
*/
    Fac() {}
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
    int fac(int n);
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
    int fac() {
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
        return 1;
    }
/**
>>> //first
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
    int fac2(int n);

/**
>>> //second
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
    int fac2() {
        return 0;
    }
};
}
