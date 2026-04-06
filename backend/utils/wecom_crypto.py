"""
企业微信消息加解密工具

用于处理企业微信回调消息的加解密
"""

import base64
import hashlib
import random
import socket
import struct
import time
import xml.etree.ElementTree as ET
from Crypto.Cipher import AES


class PKCS7Encoder:
    """PKCS7编码器"""
    block_size = 32

    @classmethod
    def encode(cls, text):
        text_length = len(text)
        amount_to_pad = cls.block_size - (text_length % cls.block_size)
        if amount_to_pad == 0:
            amount_to_pad = cls.block_size
        pad = chr(amount_to_pad)
        return text + pad * amount_to_pad

    @classmethod
    def decode(cls, decrypted):
        pad = ord(decrypted[-1])
        if pad < 1 or pad > 32:
            pad = 0
        return decrypted[:-pad]


class WecomCrypto:
    """企业微信消息加解密"""

    def __init__(self, token, encoding_aes_key, corp_id):
        self.token = token
        self.encoding_aes_key = encoding_aes_key
        self.corp_id = corp_id
        self.key = base64.b64decode(encoding_aes_key + "=")
        assert len(self.key) == 32

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

    def encrypt(self, text):
        """加密消息"""
        text = text.encode('utf-8')
        text = PKCS7Encoder.encode(text)
        
        random_str = ''.join(random.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(16))
        text = random_str.encode() + struct.pack("I", socket.htonl(len(text))) + text + self.corp_id.encode()
        
        cipher = AES.new(self.key, AES.MODE_CBC, self.key[:16])
        encrypted = cipher.encrypt(text)
        return base64.b64encode(encrypted).decode()

    def decrypt(self, encrypt):
        """解密消息"""
        cipher = AES.new(self.key, AES.MODE_CBC, self.key[:16])
        decrypted = cipher.decrypt(base64.b64decode(encrypt))
        
        decrypted = PKCS7Encoder.decode(decrypted)
        
        content_len = socket.ntohl(struct.unpack("I", decrypted[16:20])[0])
        content = decrypted[20:20 + content_len].decode('utf-8')
        from_corp_id = decrypted[20 + content_len:].decode('utf-8')
        
        if from_corp_id != self.corp_id:
            raise Exception("Corp ID mismatch")
        
        return content

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

    def encrypt_response(self, reply, nonce, timestamp):
        """加密回复消息"""
        encrypt = self.encrypt(reply)
        signature = self.get_signature(timestamp, nonce, encrypt)
        
        response = f"""<xml>
<Encrypt><![CDATA[{encrypt}]]></Encrypt>
<MsgSignature><![CDATA[{signature}]]></MsgSignature>
<TimeStamp>{timestamp}</TimeStamp>
<Nonce><![CDATA[{nonce}]]></Nonce>
</xml>"""
        return response
