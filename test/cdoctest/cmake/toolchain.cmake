
# Determine the platform
if(WIN32)
    set(CLANG_DIR_PREFIX "Win")
    set(EXE_POSTFIX ".exe")
elseif(UNIX)
    set(CLANG_DIR_PREFIX "Lin")
    set(EXE_POSTFIX "")
else()
    message(FATAL_ERROR "Unsupported platform")
endif()

# Locate Clang directory relative to this script's location and make it absolute
file(GLOB CLANG_FOLDERS
     "${CMAKE_CURRENT_LIST_DIR}/../../../clang_repl_kernel/clang/${CLANG_DIR_PREFIX}*")

# Check if any valid directory exists
list(LENGTH CLANG_FOLDERS NUM_CLANG_FOLDERS)
if(NUM_CLANG_FOLDERS EQUAL 0)
    message(FATAL_ERROR "No suitable Clang directory found in ../../../clang_repl_kernel/clang/")
endif()

# Use the first matching directory
list(GET CLANG_FOLDERS 0 CLANG_DIR)
set(CLANG_PATH "${CLANG_DIR}")

message(STATUS "Using Clang from: ${CLANG_PATH}")

# Set Clang as the compiler
set(CMAKE_C_COMPILER "${CLANG_PATH}/bin/clang${EXE_POSTFIX}")
set(CMAKE_CXX_COMPILER "${CLANG_PATH}/bin/clang++${EXE_POSTFIX}")
