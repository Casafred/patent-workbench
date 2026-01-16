# generate_user.py
import json
from werkzeug.security import generate_password_hash

USERS_FILE = 'users.json'

def main():
    """一个简单的命令行工具，用于在本地安全地添加或更新用户到 users.json。"""
    
    try:
        with open(USERS_FILE, 'r') as f:
            users = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        users = {}
        print(f"'{USERS_FILE}' 未找到或为空，将创建一个新的。")

    print("--- 本地用户管理工具 ---")
    
    while True:
        username = input("请输入要添加/更新的用户名 (直接回车退出): ").strip()
        if not username:
            break
            
        password = input(f"请输入 '{username}' 的密码: ").strip()
        if not password:
            print("密码不能为空，请重新输入。")
            continue

        # 生成安全的哈希密码
        hashed_password = generate_password_hash(password)
        users[username] = hashed_password
        
        print(f"\n用户 '{username}' 已添加/更新。")
        print(f"生成的哈希值为: {hashed_password[:30]}...") # 只显示一部分

    # 将更新后的用户数据写回文件
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)
        
    print(f"\n操作完成！'{USERS_FILE}' 已更新。请记得将此文件提交到你的 Git 仓库。")

if __name__ == '__main__':
    # 在运行此脚本前，请确保你已经安装了 werkzeug
    # pip install werkzeug
    main()