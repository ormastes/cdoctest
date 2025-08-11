"""Tests for the main module."""

import pytest
from src.main import add, multiply, main


def test_add():
    """Test the add function."""
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0


def test_multiply():
    """Test the multiply function."""
    assert multiply(2, 3) == 6
    assert multiply(-1, 5) == -5
    assert multiply(0, 10) == 0


def test_main(capsys):
    """Test the main function."""
    main()
    captured = capsys.readouterr()
    assert "Python environment is set up and running!" in captured.out
