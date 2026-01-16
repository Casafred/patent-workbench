"""
专利权利要求处理器安装配置
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="patent-claims-processor",
    version="1.0.0",
    author="Patent Claims Processor Team",
    description="一个用于解析Excel文件中多语言专利权利要求文本的Python包",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "pandas>=1.5.0",
        "openpyxl>=3.0.0",
        "xlrd>=2.0.0",
        "langdetect>=1.0.9",
    ],
    extras_require={
        "test": [
            "pytest>=7.0.0",
            "hypothesis>=6.0.0",
        ],
    },
)