cmake_minimum_required(VERSION 3.14)
# 3.14 needed for python cmake api

# Set the project name and version
project(Sample VERSION 1.0)

# Add the source file
add_library(sample SHARED sample.cpp)
# add include directories
target_include_directories(sample PUBLIC ${CMAKE_SOURCE_DIR}/include)

add_executable(sampleMain sampleMain.cpp)
target_link_libraries(sampleMain sample)