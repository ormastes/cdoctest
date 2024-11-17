clang  -fPIC -c -o sample.o sample.cpp
clang -shared sample.o -o sample.so

# windows -fPIC is not needed
# clang-cl -c -o sample.o sample.cpp
# clang -shared sample.o -o sample.dll