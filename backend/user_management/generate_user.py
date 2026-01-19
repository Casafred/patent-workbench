# generate_user.py
import json
import argparse
from pathlib import Path
from werkzeug.security import generate_password_hash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR = Path(__file__).parent.absolute()
USERS_FILE = SCRIPT_DIR / 'users.json'

def load_users():
    """加载用户数据"""
    try:
        with open(USERS_FILE, 'r') as f:
            users = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        users = {}
        print(f"'{USERS_FILE}' 未找到或为空，将创建一个新的。")
    return users

def save_users(users):
    """保存用户数据"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)
    print(f"\n操作完成！'{USERS_FILE}' 已更新。请记得将此文件提交到你的 Git 仓库。")

def list_users():
    """列出所有用户"""
    users = load_users()
    if not users:
        print("当前没有用户。")
        return
    
    print("\n--- 用户列表 ---")
    for username in users:
        print(f"- {username}")

def add_user(username, password):
    """添加或更新用户"""
    users = load_users()
    hashed_password = generate_password_hash(password)
    users[username] = hashed_password
    save_users(users)
    print(f"\n用户 '{username}' 已添加/更新。")
    print(f"生成的哈希值为: {hashed_password[:30]}...") # 只显示一部分

def delete_user(username):
    """删除用户"""
    users = load_users()
    if username in users:
        del users[username]
        save_users(users)
        print(f"\n用户 '{username}' 已删除。")
    else:
        print(f"\n错误：用户 '{username}' 不存在。")

def interactive_mode():
    """交互式模式"""
    users = load_users()
    print("--- 本地用户管理工具 ---")
    
    while True:
        print("\n请选择操作：")
        print("1. 添加/更新用户")
        print("2. 删除用户")
        print("3. 列出所有用户")
        print("4. 退出")
        
        choice = input("请输入选项编号: ").strip()
        
        if choice == "1":
            username = input("请输入要添加/更新的用户名: ").strip()
            if not username:
                print("用户名不能为空，请重新输入。")
                continue
                
            password = input(f"请输入 '{username}' 的密码: ").strip()
            if not password:
                print("密码不能为空，请重新输入。")
                continue
            
            hashed_password = generate_password_hash(password)
            users[username] = hashed_password
            
            print(f"\n用户 '{username}' 已添加/更新。")
            print(f"生成的哈希值为: {hashed_password[:30]}...") # 只显示一部分
            
        elif choice == "2":
            username = input("请输入要删除的用户名: ").strip()
            if not username:
                print("用户名不能为空，请重新输入。")
                continue
            
            if username in users:
                del users[username]
                print(f"\n用户 '{username}' 已删除。")
            else:
                print(f"\n错误：用户 '{username}' 不存在。")
                
        elif choice == "3":
            if not users:
                print("当前没有用户。")
            else:
                print("\n--- 用户列表 ---")
                for username in users:
                    print(f"- {username}")
                    
        elif choice == "4":
            break
            
        else:
            print("无效的选项，请重新输入。")
    
    # 将更新后的用户数据写回文件
    save_users(users)

def main():
    """用户管理工具主函数"""
    parser = argparse.ArgumentParser(
        description='用户管理工具 - 用于管理 users.json 文件中的用户',
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 交互式模式
    subparsers.add_parser('interactive', help='进入交互式用户管理模式')
    
    # 列出用户
    subparsers.add_parser('list', help='列出所有用户')
    
    # 添加用户
    add_parser = subparsers.add_parser('add', help='添加或更新用户')
    add_parser.add_argument('username', help='用户名')
    add_parser.add_argument('password', help='密码')
    
    # 删除用户
    delete_parser = subparsers.add_parser('delete', help='删除用户')
    delete_parser.add_argument('username', help='用户名')
    
    args = parser.parse_args()
    
    if args.command == 'interactive':
        interactive_mode()
    elif args.command == 'list':
        list_users()
    elif args.command == 'add':
        add_user(args.username, args.password)
    elif args.command == 'delete':
        delete_user(args.username)
    else:
        # 默认进入交互式模式
        interactive_mode()

if __name__ == '__main__':
    # 在运行此脚本前，请确保你已经安装了 werkzeug
    # pip install werkzeug
    main()