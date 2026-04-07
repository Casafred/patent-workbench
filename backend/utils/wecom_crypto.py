"""
企业微信消息加解密工具

用于处理企业微信回调消息的加解密
"""

import base64
import hashlib
import random
import socket
import struct
import xml.etree.ElementTree as ET
from Crypto.Cipher import AES


class WecomCrypto:
    """企业微信消息加解密"""

    def __init__(self, token, encoding_aes_key, corp_id):
        self.token = token
        self.encoding_aes_key = encoding_aes_key
        self.corp_id = corp_id
        # EncodingAESKey 需要补 = 号
        self.key = base64.b64decode(encoding_aes_key + "=")
        if len(self.key) != 32:
            raise ValueError("EncodingAESKey decoded length must be 32")

    def get_signature(self, timestamp, nonce, encrypt):
        """计算签名"""
        sort_list = [self.token, timestamp, nonce, encrypt]
        sort_list.sort()
        sha = hashlib.sha1()
        sha.update("".join(sort_list).encode())
        return sha.hexdigest()

    def verify_signature(self, signature, timestamp, nonce, encrypt):
        """验证签名"""
        return signature == self.get_signature(timestamp, nonce, encrypt)

    def decrypt(self, encrypt):
        """解密消息"""
        cipher = AES.new(self.key, AES.MODE_CBC, self.key[:16])
        decrypted = cipher.decrypt(base64.b64decode(encrypt))
        
        # 去除补位
        pad_len = decrypted[-1]
        decrypted = decrypted[:-pad_len]
        
        # 解析内容：16字节随机字符串 + 4字节消息长度 + 消息内容 + corp_id
        content_len = socket.ntohl(struct.unpack("I", decrypted[16:20])[0])
        content = decrypted[20:20 + content_len]
        from_corp_id = decrypted[20 + content_len:].decode('utf-8')
        
        if from_corp_id != self.corp_id:
            raise Exception(f"Corp ID mismatch: {from_corp_id} != {self.corp_id}")
        
        return content.decode('utf-8')

    def parse_message(self, post_data, msg_signature, timestamp, nonce):
        """解析消息"""
        try:
            xml_tree = ET.fromstring(post_data)
            encrypt = xml_tree.find("Encrypt").text
        except Exception:
            raise Exception("Invalid XML format")
        
        if not self.verify_signature(msg_signature, timestamp, nonce, encrypt):
            raise Exception("Signature verification failed")
        
        content = self.decrypt(encrypt)
        
        try:
            xml_tree = ET.fromstring(content)
            message = {}
            for child in xml_tree:
                message[child.tag] = child.text
            return message
        except Exception:
            raise Exception("Invalid decrypted content")
