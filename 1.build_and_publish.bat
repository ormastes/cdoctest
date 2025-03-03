
# link
# https://onlytojay.medium.com/%ED%8C%8C%EC%9D%B4%EC%8D%AC-pip-install-%ED%8C%A8%ED%82%A4%EC%A7%80-%EB%A7%8C%EB%93%A4%EC%96%B4%EB%B3%B4%EA%B8%B0-42ea68f4fabd

# pip install -r requirements.txt

pip install setuptools wheel twine
python setup.py bdist_wheel

for /f "delims=" %%i in ('dir /b /a-d /o-d dist\*.whl') do (
    set "latest=%%i"
    goto done
)
:done
echo Uploading dist/%latest%
python -m twine upload dist/%latest%
