import pytest
from clang_repl_kernel.install import install_bundles
import os
from clang_repl_kernel import ClangReplConfig

def test_install_bundles_winmg64():
    install_bundles('WinMG64')
    assert os.path.exists(ClangReplConfig.get_bin_path()), "WinMG64 installation failed"

def test_install_bundles_winmg32():
    install_bundles('WinMG32')
    assert os.path.exists(ClangReplConfig.get_bin_path()), "WinMG32 installation failed"