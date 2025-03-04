
git clone  --depth 1 -b private/ormastes_current https://github.com/ormastes/llvm-project.git llvm
mkdir llvm-build
cd llvm-build

mkdir Win_i386_MT
cd Win_i386_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_i386_MT.zip -r ./Win_i386_MT/* -mx9

mkdir Win_i386_MD
cd Win_i386_MD
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_i386_MD.zip -r ./Win_i386_MD/* -mx9

mkdir Win_x64_MT
cd Win_x64_MT
cmake -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_x64_MT.zip -r ./Win_x64_MT/* -mx9

mkdir Win_x64_MD
cd Win_x64_MD
cmake  -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_x64_MD.zip -r ./Win_x64_MD/* -mx9

mkdir Win_i386_MT_SHARED
cd Win_i386_MT_SHARED
cmake -DBUILD_SHARED_LIBS=ON -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_i386_MT_SHARED.zip -r ./Win_i386_MT_SHARED/* -mx9

mkdir Win_i386_MD_SHARED
cd Win_i386_MD_SHARED
cmake -DLLVM_BUILD_LLVM_DYLIB=ON  -DLLVM_LINK_LLVM_DYLIB=ON  -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -A Win32 -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_i386_MD_SHARED.zip -r ./Win_i386_MD_SHARED/* -mx9

mkdir Win_x64_MT_SHARED
cd Win_x64_MT_SHARED
cmake -DLLVM_BUILD_LLVM_DYLIB=ON  -DLLVM_LINK_LLVM_DYLIB=ON -DCMAKE_CXX_FLAGS_RELEASE="/MT" -DCMAKE_CXX_FLAGS_DEBUG="/MTd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_x64_MT_SHARED.zip -r ./Win_x64_MT_SHARED/* -mx9

mkdir Win_x64_MD_SHARED
cd Win_x64_MD_SHARED
cmake  -DLLVM_BUILD_LLVM_DYLIB=ON  -DLLVM_LINK_LLVM_DYLIB=ON -DCMAKE_CXX_FLAGS_RELEASE="/MD" -DCMAKE_CXX_FLAGS_DEBUG="/MDd" -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86 -DLLVM_ENABLE_PROJECTS=clang -G "Visual Studio 17 2022"  ../../llvm/llvm
cmake --build . --target clang clang-repl -j 16
cd ..
7z a Win_x64_MD_SHARED.zip -r ./Win_x64_MD_SHARED/* -mx9
