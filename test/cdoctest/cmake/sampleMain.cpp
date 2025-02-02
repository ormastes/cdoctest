#include "sample.h"
#include <iostream>

int main() {
    test::Fac fac;
    std::cout << fac.fac(5) << std::endl;
    std::cout << fac.fac2(5) << std::endl;
    return 0;
}