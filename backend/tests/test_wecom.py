"""
企业微信API连接测试脚本

使用方法:
    python test_wecom.py
    
然后按提示输入企业微信配置信息
"""

import requests
import sys


def test_wecom_connection():
    print("=" * 50)
    print("企业微信API连接测试")
    print("=" * 50)
    print()
    
    corp_id = input("请输入企业ID (CorpID): ").strip()
    if not corp_id:
        print("❌ 企业ID不能为空")
        return
    
    agent_id = input("请输入应用AgentId: ").strip()
    if not agent_id:
        print("❌ AgentId不能为空")
        return
    
    secret = input("请输入应用Secret: ").strip()
    if not secret:
        print("❌ Secret不能为空")
        return
    
    print()
    print("-" * 50)
    print("正在测试连接...")
    print("-" * 50)
    
    print("\n[步骤1] 获取Access Token...")
    url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
    
    try:
        resp = requests.get(url, params={
            'corpid': corp_id,
            'corpsecret': secret
        }, timeout=10)
        result = resp.json()
        
        if result.get('errcode', 0) != 0:
            print(f"❌ 获取Token失败!")
            print(f"   错误码: {result.get('errcode')}")
            print(f"   错误信息: {result.get('errmsg')}")
            print()
            print("可能的原因:")
            print("  1. 企业ID (CorpID) 输入错误")
            print("  2. 应用Secret输入错误或已过期")
            print("  3. IP未加入白名单(如已设置)")
            return
        
        access_token = result['access_token']
        expires_in = result['expires_in']
        print(f"✅ 获取Token成功!")
        print(f"   有效期: {expires_in}秒 ({expires_in // 60}分钟)")
        
    except requests.exceptions.Timeout:
        print("❌ 连接超时，请检查网络")
        return
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求失败: {e}")
        return
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return
    
    print("\n[步骤2] 获取应用信息...")
    app_url = f"https://qyapi.weixin.qq.com/cgi-bin/agent/get?access_token={access_token}&agentid={agent_id}"
    
    try:
        resp = requests.get(app_url, timeout=10)
        result = resp.json()
        
        if result.get('errcode', 0) != 0:
            print(f"❌ 获取应用信息失败!")
            print(f"   错误码: {result.get('errcode')}")
            print(f"   错误信息: {result.get('errmsg')}")
            print()
            print("可能的原因:")
            print("  1. AgentId输入错误")
            print("  2. 该应用不属于此企业")
            return
        
        print(f"✅ 应用信息获取成功!")
        print(f"   应用名称: {result.get('name', '未知')}")
        print(f"   应用描述: {result.get('description', '无')}")
        
    except Exception as e:
        print(f"⚠ 获取应用信息时出错: {e}")
    
    print("\n[步骤3] 测试发送消息...")
    
    test_user = input("\n请输入接收测试消息的用户ID (留空跳过): ").strip()
    
    if test_user:
        print(f"\n正在发送测试消息给用户 [{test_user}]...")
        
        send_url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={access_token}"
        
        message_data = {
            "touser": test_user,
            "msgtype": "text",
            "agentid": int(agent_id),
            "text": {
                "content": "🎉 企业微信API测试成功！\n\n这是一条来自专利工作台的测试消息。"
            },
            "safe": 0
        }
        
        try:
            resp = requests.post(send_url, json=message_data, timeout=10)
            result = resp.json()
            
            if result.get('errcode', 0) == 0:
                print("✅ 消息发送成功!")
                print("   请在企业微信App中查看消息")
            else:
                print(f"❌ 消息发送失败!")
                print(f"   错误码: {result.get('errcode')}")
                print(f"   错误信息: {result.get('errmsg')}")
                
                if result.get('errcode') == 60011:
                    print("\n   提示: 用户ID可能不存在，请检查通讯录中的成员账号")
                elif result.get('errcode') == 60012:
                    print("\n   提示: 用户不在应用的可见范围内，请在应用设置中添加")
                    
        except Exception as e:
            print(f"❌ 发送消息时出错: {e}")
    else:
        print("跳过消息发送测试")
    
    print()
    print("=" * 50)
    print("✅ 测试完成！配置信息正确，可以开始集成")
    print("=" * 50)
    print()
    print("请将以下配置添加到 .env 文件:")
    print(f"  WECOM_CORP_ID={corp_id}")
    print(f"  WECOM_AGENT_ID={agent_id}")
    print(f"  WECOM_SECRET={secret}")
    print()
    print("如何获取用户ID:")
    print("  1. 登录企业微信管理后台")
    print("  2. 进入「通讯录」")
    print("  3. 点击成员，查看「账号」字段即为用户ID")


if __name__ == '__main__':
    try:
        test_wecom_connection()
    except KeyboardInterrupt:
        print("\n\n已取消测试")
        sys.exit(0)
