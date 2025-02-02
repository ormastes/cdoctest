#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Set PATH (if necessary, adjust for Linux)
#export PATH="/mingw64/bin:$PATH"

# Remove existing build directory if it exists
if [ -d "build" ]; then
    rm -rf build
fi

# Create and enter the build directory
mkdir build
cd build

# Run CMake with Ninja generator
cmake .. -G Ninja -DCMAKE_TOOLCHAIN_FILE=../toolchain.cmake
cmake --build .
cd ..