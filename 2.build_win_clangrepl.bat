
git clone  --depth 1 -b private/ormastes_current https://github.com/ormastes/llvm-project.git llvm
mkdir llvm-build
cd llvm-build

mkdir i386_MT
cd i386_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

7z a i386_MT.zip -r ./i386_MT/* -mx9

mkdir i386_MD
cd i386_MD
cmake -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

7z a i386_MD.zip -r ./i386_MD/* -mx9

mkdir x64_MT
cd x64_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022" ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

7z a x64_MT.zip -r ./x64_MT/* -mx9

mkdir x64_MD
cd x64_MD
cmake  -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022" ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

7z a x64_MD.zip -r ./x64_MD/* -mx9
