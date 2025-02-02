set ERROR=0
set PATH=C:\msys64\mingw64\bin;%PATH%

if exist build (rmdir /s /q build || set ERROR=1)
if %ERROR% neq 0 exit /b %ERROR%

mkdir build  || exit /b %errorlevel%
cd build || exit /b %errorlevel%
cmake .. -G Ninja -DCMAKE_TOOLCHAIN_FILE=../toolchain.cmake  || exit /b %errorlevel%
cmake --build .  || exit /b %errorlevel%
cd ..

