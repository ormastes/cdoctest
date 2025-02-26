# C/C++ DocTest 한글 번역

C/C++ DocTest는 `clang-repl` 대화를 주석을 사용하여 테스트를 실행합니다. Linux를 지원합니다(macOS는 테스트되지 않았습니다.).

## 필수 요구사항

- `clang-repl-kernel` 버전 0.1.8
- `libclang`이 설치되어 제대로 작동해야 함

## 사용법

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

### Linux에서 공유 라이브러리 빌드하기

```bash
clang -c -o sample.o sample.cpp
clang -shared sample.o -o sample.so
```

### Windows에서 DLL 빌드하기

```bash
clang-cl -c -o sample.o sample.cpp
clang -shared sample.o -o sample.dll
```

### Linux에서 소스 코드와 공유 라이브러리로 테스트 실행하기

```bash
python3 -m cdoctest -cdtt=sample.h -cdtl=sample.so -cdtip=.
```

### Windows에서 소스 코드와 DLL로 테스트 실행하기

```bash
python -m cdoctest -cdtt=sample.h -cdtl=sample.dll -cdtip=.
```

## `clang-repl` 수동 설치하기

GitHub의 LFS 제한으로 인해, 더 나은 바이너리 배포 방법이 제공될 때까지 `clang-repl`을 수동으로 설치해야 합니다.

`clang-repl` 바이너리를 `clang_repl_kernel/[Linux|Windows]` 디렉토리에 배치하세요 (예: `clang_repl_kernel/Windows/clang-repl.exe`).

### `clang-repl`의 버그 수정하기

`clang-repl`에 작은 버그가 있습니다. 수정된 버전이 적용된 브랜치를 클론할 수 있습니다:

```bash
git clone -b private/ormastes_current https://github.com/ormastes/llvm-project.git
```

또는 프롬프트를 출력한 후 출력 버퍼를 플러시하는 호출을 추가하여 `llvm/lib/LineEditor/LineEditor.cpp`를 수정하세요.

### `clang-repl` 빌드하기

자세한 지침은 [Clang REPL 문서](https://clang.llvm.org/docs/ClangRepl.html)를 참조하세요:

```bash
cd llvm-project
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo -DLLVM_ENABLE_PROJECTS=clang -G "Unix Makefiles" ../llvm
cmake --build . --target clang clang-repl -j n
```

### vscode 확장 프로그램 지원
vscode 확장 프로그램과 상호 작용하기 위한 다음 입력을 처리합니다.
목록
```
cdoctest --cdt_cmake_build_path=cmake/build --cdt_cmake_target=sample --cdt_list_testcase
${test_suite_name}::${test_case_name},${file_path},${line_number},start_col,end_line,end_col
```
실행
```
cdoctest --cdt_cmake_build_path=cmake/build --cdt_cmake_target=sample  --cdt_run_testcase=${test_suite_name}::${test_case_name}
output.vsc >> contents xml <unitest-results failedtests="0" ><test suite="" name="" passMessage="" ...>
```
