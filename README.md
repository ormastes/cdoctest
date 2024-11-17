A C/C++ DecTest
===========

A C/C++ DecTest which run tests by using clang-repl interaction comments.
It works on Linux. (MacOS is not tested. Windows dll is not supported.)

CAUTION
-------

It worked with clang-repl-kernel 0.1.7. It should be run properly.
And also libclang also should be installed and work properly.


Using the CDocTest
---------------------
sample.cpp
```cpp
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
```
sample.h
```cpp
#pragma once
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
>>> printf("%d\n",fac.fac2(5));
120
*/
namespace test {
class Fac {
public:
/**
>>> test::Fac fac;
>>> printf("%d\n",fac.fac(5));
120
*/
    int fac(int n);
    int fac2(int n);
};
}
```
build library sample.so (linux)
```bash
clang -c -o sample.o sample.cpp
clang -shared sample.o -o sample.so
```
or build library sample.dll for windows.
```bash
clang-cl -c -o sample.o sample.cpp
clang -shared sample.o -o sample.dll
```

run test with source code (cpp or h) with shared library (linux)
```bash
python3 -m cdoctest  -cdtt=sample.h -cdtl=sample.so -cdtcip=.
```
or run test with source code (cpp or h) with dll library with windows.
```bash
python3 -m cdoctest  -cdtt=sample.h -cdtl=sample.dll -cdtcip=.
```
