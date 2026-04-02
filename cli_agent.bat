@echo off
REM CLI Agent 启动脚本 (Windows)
REM Usage: cli_agent.bat [options]

cd /d "%~dp0"

python -m cli_agent.main %*
