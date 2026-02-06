@echo off
chcp 65001 >nul
echo ====================================
echo 阿里云服务器回滚到同步前版本
echo ====================================
echo.

echo 请确认你要执行以下操作：
echo 1. 连接到阿里云服务器
echo 2. 查看最近的提交历史
echo 3. 回滚到同步GitHub之前的版本
echo.
pause

echo.
echo [步骤1] 连接到阿里云服务器...
echo 请手动执行以下命令：
echo.
echo ssh root@你的服务器IP
echo.
echo 然后执行以下命令：
echo.
echo # 进入项目目录
echo cd /root/patent_system
echo.
echo # 查看最近的提交历史（找到同步前的commit）
echo git log --oneline -20
echo.
echo # 查看当前状态
echo git status
echo.
echo # 回滚到指定的commit（替换为你要回滚的commit hash）
echo git reset --hard [commit_hash]
echo.
echo # 或者回滚到上一个commit
echo git reset --hard HEAD~1
echo.
echo # 或者回滚到上N个commit
echo git reset --hard HEAD~N
echo.
echo # 重启服务
echo sudo systemctl restart patent_system
echo.
echo # 查看服务状态
echo sudo systemctl status patent_system
echo.
echo ====================================
echo 回滚完成！
echo ====================================
pause
