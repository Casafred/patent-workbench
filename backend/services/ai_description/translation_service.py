"""
Translation Service Module

Translates non-Chinese patent description text to Chinese using AI models.
"""

import logging
import asyncio
from typing import Optional
from zhipuai import ZhipuAI

logger = logging.getLogger(__name__)


class TranslationServiceUnavailable(Exception):
    """Exception raised when translation service is unavailable."""
    pass


class TranslationService:
    """
    Translates text to Chinese using AI models.
    
    Integrates with ZhipuAI API to perform translation tasks.
    """
    
    # Translation prompt template
    TRANSLATION_PROMPT = """你是一个专业的专利文献翻译专家。请将以下{source_lang}文本翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记(如10、20、图1等)
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 不要添加任何解释或注释,只返回翻译结果

原文:
{text}

请直接返回中文翻译:"""
    
    def __init__(self):
        """
        Initialize the translation service.
        
        Note: Client is created per-request, not stored in instance
        """
        pass
    
    async def translate_to_chinese(
        self,
        text: str,
        source_lang: str,
        client,  # Add client parameter
        model_name: str = "glm-4-flash"
    ) -> str:
        """
        Translate text to Chinese.
        
        Args:
            text: Source text to translate
            source_lang: Source language code (e.g., 'en', 'ja', 'ko')
            client: ZhipuAI client instance
            model_name: AI model to use for translation
            
        Returns:
            Translated Chinese text
            
        Raises:
            TranslationServiceUnavailable: If translation service is not available
        """
        if not client:
            raise TranslationServiceUnavailable(
                "Translation service is not available. "
                "Please check API key configuration."
            )
        
        # Map language codes to full names
        lang_names = {
            'en': '英文',
            'ja': '日文',
            'ko': '韩文',
            'de': '德文',
            'fr': '法文',
            'es': '西班牙文',
            'ru': '俄文'
        }
        
        source_lang_name = lang_names.get(source_lang, source_lang)
        
        # Format the translation prompt
        prompt = self.TRANSLATION_PROMPT.format(
            source_lang=source_lang_name,
            text=text
        )
        
        try:
            logger.info(f"Translating text from {source_lang} to Chinese using {model_name}")
            
            # Call AI model for translation
            response = await asyncio.to_thread(
                self._call_ai_model,
                prompt,
                model_name,
                client  # Pass client
            )
            
            translated_text = response.strip()
            logger.info(f"Translation completed. Original length: {len(text)}, Translated length: {len(translated_text)}")
            
            return translated_text
            
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            raise TranslationServiceUnavailable(
                f"Translation service error: {str(e)}. "
                "Please try again later or use Chinese description text."
            )
    
    def _call_ai_model(self, prompt: str, model_name: str, client) -> str:
        """
        Call AI model API (synchronous).
        
        Args:
            prompt: Prompt text
            model_name: Model name
            client: ZhipuAI client instance
            
        Returns:
            AI model response text
        """
        try:
            # Debug: log model_name type and value
            logger.info(f"Calling AI model with model_name: {model_name} (type: {type(model_name)})")
            
            # Ensure model_name is a string
            if not isinstance(model_name, str):
                logger.error(f"model_name is not a string: {type(model_name)}, value: {model_name}")
                # Try to convert to string
                model_name = str(model_name)
                logger.info(f"Converted model_name to string: {model_name}")
            
            # Use the same message structure as patent.py and chat.py
            messages = [
                {
                    "role": "system",
                    "content": "你是一位专业的专利文献翻译专家。请准确翻译专利文本，保持专业术语的准确性。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=False,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI model call failed: {str(e)}")
            raise
