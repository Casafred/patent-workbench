#!/bin/bash
# CLI Agent 启动脚本 (Linux/Mac)
# Usage: ./cli_agent.sh [options]

cd "$(dirname "$0")"

python -m cli_agent.main "$@"
