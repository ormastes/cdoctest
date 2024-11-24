
git clone  --depth 1 -b private/ormastes_current https://github.com/ormastes/llvm-project.git llvm
mkdir llvm-build
cd llvm-build

mkdir i386_MT
cd i386_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

mkdir i386_MD
cd i386_MD
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..


mkdir x64_MT
cd x64_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

mkdir x64_MD
cd x64_MD
cmake  -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

mkdir i386_MT_SHARED
cd i386_MT
cmake -DBUILD_SHARED_LIBS=ON -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

mkdir i386_MD_SHARED
cd i386_MD
cmake -DBUILD_SHARED_LIBS=ON -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..


mkdir x64_MT_SHARED
cd x64_MT
cmake -DBUILD_SHARED_LIBS=ON -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..

mkdir x64_MD_SHARED
cd x64_MD
cmake  -DBUILD_SHARED_LIBS=ON -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..