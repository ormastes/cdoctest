
git clone  --depth 1 -b private/ormastes_current https://github.com/ormastes/llvm-project.git llvm
mkdir llvm-build
cd llvm-build

mkdir Linux
cd Linux
cmake  -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Ninja" ../../llvm/llvm
cmake --build . --target clang clang-repl -j 32
cd ..

zip -r -9 linux.zip linux
# https://mega.nz/folder/iFdXmb6L#RKO8HmgjgVj3Mv3M1LYE7g/file/fN9EkbrK

mkdir Linux_SHARED
cd Linux_SHARED
cmake -DBUILD_SHARED_LIBS=ON  -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Ninja" ../../llvm/llvm
cmake --build . --target clang clang-repl -j 32
cd ..

zip -r -9 Linux_SHARED.zip Linux_SHARED