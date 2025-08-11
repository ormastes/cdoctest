cmake_minimum_required(VERSION 3.10)
project(TestLibrary)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Create shared library
add_library(math_utils SHARED
    math_utils.cpp
)

add_library(calculator SHARED
    calculator.cpp
)

# Create static library versions
add_library(math_utils_static STATIC
    math_utils.cpp
)

add_library(calculator_static STATIC
    calculator.cpp
)

# Create test executable
add_executable(test_runner
    test_main.cpp
)

target_link_libraries(test_runner
    math_utils
    calculator
)

# Set library properties
set_target_properties(math_utils PROPERTIES
    PUBLIC_HEADER math_utils.hpp
)

set_target_properties(calculator PROPERTIES
    PUBLIC_HEADER calculator.hpp
)

# Installation rules
install(TARGETS math_utils calculator
    LIBRARY DESTINATION lib
    PUBLIC_HEADER DESTINATION include
)