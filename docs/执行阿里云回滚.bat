@echo off
chcp 65001 >nul
echo ======================================
echo 阿里云服务器安全回滚
echo ======================================
echo.
echo 这个脚本会：
echo 1. 创建备份分支保存OCR修复
echo 2. 回滚到 db0dba5 之前的版本
echo 3. 重启服务
echo.
echo 如果回滚错了，可以随时恢复！
echo.
pause

echo.
echo 上传回滚脚本到服务器...
scp 阿里云安全回滚.sh root@43.99.101.195:/tmp/

echo.
echo 执行回滚...
ssh root@43.99.101.195 "bash /tmp/阿里云安全回滚.sh"

echo.
echo ======================================
echo 回滚完成！
echo ======================================
echo.
echo 访问测试: http://43.99.101.195
echo.
pause
