
git clone  --depth 1 -b private/ormastes_current https://github.com/ormastes/llvm-project.git llvm
mkdir llvm-build
cd llvm-build

mkdir i386
cd i386
cmake -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 4
cd ..

mkdir x64
cd x64
cmake -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Ninja" ../../llvm/llvm
cmake --build . --target clang clang-repl -j 4
cd ..
