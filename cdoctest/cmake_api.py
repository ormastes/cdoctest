import json
import os
import re
from pathlib import Path
from ordered_set import OrderedSet
from cmake_file_api import CMakeProject, ObjectKind
from cmake_file_api.reply.v1.api import CMakeFileApiV1


class CMakeApi:
    def __init__(self, build_path, target_name, include_target, exclude_target, verbose=False):
        self.project = CMakeProject(build_path)
        self.project.cmake_file_api.instrument_all()
        self.project.configure(quiet=True)
        self._build_path = build_path
        self.source_path = self._get_source_path(self.project)
        self._include_target = include_target
        self._exclude_target = exclude_target
        self._all_target_lib_dict = {}
        self._all_target_sources = set()
        self._all_target_includes = set()
        self._all_libs_artifact_set = set()
        self.verbose = verbose

        results = self.project .cmake_file_api.inspect_all()
        if verbose:
            print("cmake path:", self.project .cmake_file_api.index().cmake.paths.cmake)
            print("version:", self.project .cmake_file_api.index().cmake.version.string)

        codemodel_v2 = results[ObjectKind.CODEMODEL][2]
        self.codemodel_v2 = codemodel_v2
        # For simplicity, select the first configuration (many projects have only one)
        self.config = codemodel_v2.configurations[0]

        self._source_path = self.project.source_path

        self._targets = self.config.targets
        if verbose:
            print("targets:", self._targets)
        self._target = None
        self._target_name = target_name
        self.set_target_name(target_name)

        assert os.path.exists(build_path), f"Build path '{build_path}' does not exist."
        assert self._target is not None , f"Target '{target_name}' not found in the CMake configuration."

    def get_target(self):
        return self._target

    def _get_source_path(self, project):
        source_path = self.project.source_path
        if source_path is None or not os.path.exists(source_path):
            print(f"Error: Source path '{source_path}' does not exist.")
            exit(1)
        return os.path.abspath(source_path)

    def get_artifact_path(self, target, idx=0):
        artifact_path = target.target.artifacts[idx]
        path = Path(artifact_path)
        if path.is_absolute():
            return str(path)
        else:
            return os.path.join(self._build_path,path)

    def _get_artifact_path(self, artifact_paths, target):
        artifact = self.get_artifact_path(target)
        artifact_paths.add(artifact)

    def get_all_libs_artifact(self):
        return list(self._all_libs_artifact_set)

    def _get_target_by_name(self, target_name):
        return next((target for target in  self._targets if target.name == target_name), None)


    def set_target_name(self, target_name):
        self._all_target_includes = []
        self._all_target_sources = []
        self._all_target_lib_dict = {}
        self._target = self._get_target_by_name(target_name)
        self._get_shared_libs(self._all_target_lib_dict, self._target)
        for lib in self._all_target_lib_dict.values():
            self._get_include_paths(self._all_target_includes, lib)
            self._get_target_sources(self._all_target_sources, lib)
            self._get_artifact_path(self._all_libs_artifact_set, lib)
        assert self._target is not None, f"Target '{target_name}' not found in the CMake configuration."
        if self.verbose:
            print("shared libraries of target:", self._all_target_lib_dict.keys())
            print("include directories of target:", self._all_target_includes)
            print("source files of target:", self._all_target_sources)
        self._all_target_includes = OrderedSet(self._all_target_includes)
        self._all_target_sources = OrderedSet(self._all_target_sources)

    def get_build_path(self):
        return self._build_path

    def get_targets(self):
        return self._targets

    def _get_target_sources(self, sources, target):
        if not self.is_target_testing(target):
            return
        for source in target.target.sources:
            path = Path(source.path)
            if path.is_absolute():
                sources.append(str(path))
            else:
                sources.append(os.path.join(self._source_path, path))

    def get_all_sources(self):
        return self._all_target_sources

    def is_target_testing(self, target):
        if target.target.type.value == "STATIC_LIBRARY":
            return False

        if len(self._include_target) > 0:
            for include_target in self._include_target:
                if re.match(include_target, target.target.name)\
                        or re.match(include_target, target.target.nameOnDisk):
                    return True
            return False

        if len(self._exclude_target) > 0:
            for exclude_target in self._exclude_target:
                if re.match(exclude_target, target.name):
                    return False
            return True

        return True

    def _get_include_paths(self, include_path, target):
        for include in target.target.compileGroups[0].includes: # todo
            path = Path(include.path)
            if path.is_absolute():
                include_path.append(str(path))
            else:
                include_path.append(os.path.join(self._source_path, path))

    def get_all_include_path(self):
        return self._all_target_includes

    def _get_shared_libs(self, shared_lib_dic, target):
        # if target is shared library
        if target.target.type.value == "SHARED_LIBRARY":
            shared_lib_dic[target.id] = target
        for lib in target.target.dependencies:
            if lib.target.type.value != "SHARED_LIBRARY":
                print(f"Warning: '{lib.target.name}' is not a shared library.")
                continue
            self._get_shared_libs(shared_lib_dic, lib)


    def get_all_shared_lib(self):
        return self._all_target_lib_dict.values()

    def get_all_candidate_sources_headers(self, target_files, c_ext, cpp_ext, h_ext):
        headers = []
        h_postfix = "." + h_ext
        cpp_postfix = "." + cpp_ext
        c_postfix = "." + c_ext
        for source in self._all_target_sources | set(target_files):
            src_ext = os.path.splitext(source)
            src = src_ext[0]
            ext = src_ext[1]
            if ext in [c_postfix, cpp_postfix]:
                header = src + h_postfix
                if os.path.exists(header):
                    headers.append(header)
                else:
                    file_name = os.path.basename(header)
                    for include_dir in self._all_target_includes:
                        header = os.path.join(include_dir, file_name)
                        if os.path.exists(header):
                            headers.append(header)
                            break
                    if not os.path.exists(header):
                        print(f"Warning: Header file '{header}' not found.")
        return OrderedSet(set(headers) | self._all_target_sources | set(target_files))




