import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="cdoctest",
    version="0.0.3",
    author="Yoon, Jonghyun",
    author_email="ormastes@gmail.com",
    description="doctest for C/C++ which run tests by using clang-repl interaction comments.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ormastes/cdoctest",
    packages=['cdoctest'],#setuptools.find_packages(),
    include_package_data=True,
    exclude_package_data={'': ['test']},
    install_requires=['clang', 'clang_repl_kernel>=0.1.8',, 'libclang'],
    classifiers=[
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
    ],
)