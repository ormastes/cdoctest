# C/C++ DocTest

A C/C++ DocTest that runs tests using `clang-repl` interaction comments. Supports Linux (macOS is untested; Windows DLLs are not supported).

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
>>> printf("%d\n", fac.fac(7));
5040
*/
int Fac::fac(int n) {
    return (n > 1) ? n * fac(n - 1) : 1;
}
/**
>>> test::Fac fac;
>>> printf("%d\n", fac.fac2(5));
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
>>> printf("%d\n", fac.fac(5));
120
>>> printf("%d\n", fac.fac2(5));
120
*/
namespace test {
class Fac {
public:
/**
>>> test::Fac fac;
>>> printf("%d\n", fac.fac(5));
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

## Installing `clang-repl` Manually

Due to GitHub's LFS limit, you need to install `clang-repl` manually until a better binary distribution method is available.

Place the `clang-repl` binary in the `clang_repl_kernel/[Linux|Windows]` directory (e.g., `clang_repl_kernel/Windows/clang-repl.exe`).

### Fixing a Bug in `clang-repl`

There is a minor bug in `clang-repl`. You can clone a branch with the fix applied:

```bash
git clone -b private/ormastes_current https://github.com/ormastes/llvm-project.git
```

Alternatively, modify `llvm/lib/LineEditor/LineEditor.cpp` by adding a call to flush the output buffer after printing the prompt.

### Building `clang-repl`

Refer to the [Clang REPL documentation](https://clang.llvm.org/docs/ClangRepl.html) for detailed instructions:

```bash
cd llvm-project
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo -DLLVM_ENABLE_PROJECTS=clang -G "Unix Makefiles" ../llvm
cmake --build . --target clang clang-repl -j n
```

### Support vscode extension
Handle next input to interact with vscode extension.
list
```
cdoctest --cdt_cmake_build_path=cmake/build --cdt_cmake_target=sample --cdt_list_testcase
${test_suite_name}::${test_case_name},${file_path},${line_number},start_col,end_line,end_col
```
run
```
cdoctest --cdt_cmake_build_path=cmake/build --cdt_cmake_target=sample  --cdt_run_testcase=${test_suite_name}::${test_case_name}
output.vsc >> contents xml <unitest-results failedtests="0" ><test suite="" name="" passMessage="" ...>
```
