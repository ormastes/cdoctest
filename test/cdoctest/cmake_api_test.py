import unittest
import os
import subprocess
import sys
import runpy

from cdoctest import CMakeApi
from cdoctest import CDocTest

is_built = True
cmake_abs_dir = None
cmake_build_abs_dir = None
def init():
    global is_built
    global cmake_abs_dir
    global cmake_build_abs_dir

    cmake_dir = os.path.join(os.getcwd(), "cmake")

    cmake_abs_dir = os.path.abspath(cmake_dir)
    cmake_build_abs_dir = os.path.join(cmake_abs_dir, "build")



    if is_built:
        return
    # Determine the script to run based on the platform
    if os.name == "nt":  # Windows
        build_script = "build.bat"
        shell_cmd = True  # Use shell=True for Windows batch scripts
        print("Windows")
    else:  # Linux/macOS
        build_script = "./build.sh"
        shell_cmd = False  # Use shell=False for Unix shell scripts
        print("Linux/macOS")

    # Change to the 'cmake' directory
    if not os.path.exists(cmake_dir):
        print(f"Error: Directory '{cmake_dir}' does not exist!")
        sys.exit(1)

    os.chdir(cmake_dir)
    # Execute the build script
    try:
        print(f"Running {build_script} in {cmake_dir}...")
        subprocess.run(build_script, shell=shell_cmd, check=True)
        print("Build completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Build failed with error: {e}")
        sys.exit(1)

    is_built = True


class CMakeAPITest(unittest.TestCase):

    def test_get_build_target(self):
        init()
        api = CMakeApi(cmake_build_abs_dir, "sampleMain")
        target = api.get_target()
        self.assertEqual(target.name, "sampleMain")
        self.assertEqual(target.target.type.value, "EXECUTABLE")
        expected_path = os.path.join(cmake_build_abs_dir, "sampleMain.exe")
        self.assertEqual(api.get_artifact_path(target), expected_path)
        self.assertEqual(api.get_all_include_path()[0], os.path.join(cmake_abs_dir, "include"))
        self.assertTrue("sample" in [lib.target.name for lib in api.get_all_shared_lib()])
        self.assertEqual(api.get_all_sources()[0], os.path.join(cmake_abs_dir, "sample.cpp"))
        self.assertEqual(api.get_all_libs_artifact()[0], os.path.join(cmake_build_abs_dir, "libsample.dll"))
        print("done")

    def test_get_all_candidate_sources_headers(self):
        init()
        api = CMakeApi(cmake_build_abs_dir, "sampleMain")
        target_files = api.get_all_sources()
        c_ext = "c"
        cpp_ext = "cpp"
        h_ext = "h"
        headers = api.get_all_candidate_sources_headers(target_files, c_ext, cpp_ext, h_ext)
        self.assertTrue(os.path.join(cmake_abs_dir, "sample.cpp") in headers)
        self.assertTrue(os.path.join(cmake_abs_dir, "include\\sample.h") in headers)
        print("done")

    def test_actual_simple_run(self):
        init()
        # cdoctest main
        sys.argv = [
            'cdoctest',  # This is typically the module or script name.
            '-cdtt=cmake/include/sample.h',
            '-cdtl=cmake/build/libsample.dll',
            '-cdtip=cmake/include'
        ]

        # Execute the __main__.py of 'mypackage'
        runpy.run_module('cdoctest', run_name="__main__", alter_sys=True)
        print("done")

    def test_actual_cmake_run(self):
        init()
        # cdoctest main
        sys.argv = [
            'cdoctest',  # This is typically the module or script name.
            '--cdt_cmake_build_path=cmake/build',
            '--cdt_cmake_target=sample'
        ]

        # Execute the __main__.py of 'mypackage'
        runpy.run_module('cdoctest', run_name="__main__", alter_sys=True)
        # take output and print
        print("done")

    def test_actual_cmake_list(self):
        init()
        # cdoctest main
        sys.argv = [
            'cdoctest',  # This is typically the module or script name.
            '--cdt_cmake_build_path=cmake/build',
            '--cdt_cmake_target=sample',
            '--cdt_list_testcase'
        ]

        # Execute the __main__.py of 'mypackage'
        runpy.run_module('cdoctest', run_name="__main__", alter_sys=True)
        # take output and print
        print("done")

    def test_actual_cmake_run_a_testcase(self):
        init()
        # cdoctest main
        sys.argv = [
            'cdoctest',  # This is typically the module or script name.
            '--cdt_cmake_build_path=cmake/build',
            '--cdt_cmake_target=sample',
            '--cdt_run_testcase=cmake::include::sample.h::test::namespace'
        ]

        # Execute the __main__.py of 'mypackage'
        runpy.run_module('cdoctest', run_name="__main__", alter_sys=True)
        # take output and print
        print("done")


if __name__ == '__main__':
    unittest.main()
