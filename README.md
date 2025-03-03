# C/C++ DocTest

A C/C++ DocTest that runs tests using `clang-repl` interaction in comments. Supports Linux (macOS is untested).

## Prerequisites

- `clang-repl-kernel` version 0.1.8
- `libclang` must be installed and functioning properly

## Usage

### `sample.cpp`

```cpp
#include "sample.h"
namespace test {
/**
>>> test::Fac fac;
>>> %<< fac.fac(7);
5040
*/
int Fac::fac(int n) {
    return (n > 1) ? n * fac(n - 1) : 1;
}
/**
>>> test::Fac fac;
>>> %<< fac.fac2(5);
120
*/
int Fac::fac2(int n) {
    return (n > 1) ? n * fac(n - 1) : 1;
}
}
```

### `sample.h`

```cpp
#pragma once
/**
>>> test::Fac fac;
>>> %<< fac.fac(5);
120
>>> %<< fac.fac2(5);
120
*/
namespace test {
class Fac {
public:
/**
>>> test::Fac fac;
>>> %<< fac.fac(5);
120
*/
    int fac(int n);
    int fac2(int n);
};
}
```

### Building the Shared Library on Linux

```bash
clang -c -o sample.o sample.cpp
clang -shared sample.o -o sample.so
```

### Building the DLL on Windows

```bash
clang-cl -c -o sample.o sample.cpp
clang -shared sample.o -o sample.dll
```

### Running Tests with Source Code and Shared Library on Linux

```bash
python3 -m cdoctest -cdtt=sample.h -cdtl=sample.so -cdtip=.
```

### Running Tests with Source Code and DLL on Windows

```bash
python -m cdoctest -cdtt=sample.h -cdtl=sample.dll -cdtip=.
```

### Support vscode extension
Can be used with vscode extension [cdoctest_vscode_extension](https://github.com/ormastes/cdoctest_vscode_extension)