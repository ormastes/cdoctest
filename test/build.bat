set PATH=..\clang_repl_kernel\clang\WinMG32\bin;%PATH%
clang  -fPIC -c -o sample.o sample.cpp
clang -shared sample.o -o sample.dll