"""
Translation Service Module

Translates non-Chinese patent description text to Chinese using AI models.
"""

import logging
import asyncio
import re
from typing import Optional, List, Dict
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
    
    # Translation prompt template for single text
    TRANSLATION_PROMPT = """你是一个专业的专利文献翻译专家。请将以下{source_lang}文本翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记(如10、20、图1等)
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 不要添加任何解释或注释,只返回翻译结果

原文:
{text}

请直接返回中文翻译:"""

    # Batch translation prompt template for claims
    BATCH_CLAIMS_TRANSLATION_PROMPT = """你是一个专业的专利文献翻译专家。请将以下{source_lang}专利权利要求翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记(如10、20、图1等)
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 保持权利要求的编号和格式
5. 不要添加任何解释或注释,只返回翻译结果

原文:
{text}

请按照以下格式返回翻译结果，每条权利要求单独一行，以"权利要求 X:"开头：
权利要求 1: [翻译内容]
权利要求 2: [翻译内容]
..."""

    # Batch translation prompt template for description
    BATCH_DESCRIPTION_TRANSLATION_PROMPT = """你是一个专业的专利文献翻译专家。请将以下{source_lang}专利说明书翻译为中文。

要求:
1. 保持专利术语的准确性
2. 保留所有数字标记(如10、20、图1等)
3. 翻译要流畅自然,符合中文专利文献的表达习惯
4. 保持段落结构，用空行分隔不同段落
5. 不要添加任何解释或注释,只返回翻译结果

原文:
{text}

请直接返回中文翻译，保持段落格式:"""
    
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
    
    async def translate_claims_batch(
        self,
        claims: List[str],
        source_lang: str,
        client,
        model_name: str = "glm-4-flash"
    ) -> List[Dict[str, str]]:
        """
        Translate multiple patent claims to Chinese in a single API call.
        
        Args:
            claims: List of claim texts to translate
            source_lang: Source language code (e.g., 'en', 'ja', 'ko')
            client: ZhipuAI client instance
            model_name: AI model to use for translation
            
        Returns:
            List of dictionaries with 'original', 'translated', and 'index' keys
        """
        if not client:
            raise TranslationServiceUnavailable(
                "Translation service is not available. "
                "Please check API key configuration."
            )
        
        if not claims:
            return []
        
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
        
        # Format claims with numbers
        formatted_claims = "\n\n".join([
            f"权利要求 {i+1}: {claim}" 
            for i, claim in enumerate(claims) 
            if claim and len(str(claim).strip()) > 0
        ])
        
        # Format the batch translation prompt
        prompt = self.BATCH_CLAIMS_TRANSLATION_PROMPT.format(
            source_lang=source_lang_name,
            text=formatted_claims
        )
        
        try:
            logger.info(f"Batch translating {len(claims)} claims from {source_lang} to Chinese using {model_name}")
            
            # Call AI model for batch translation
            response = await asyncio.to_thread(
                self._call_ai_model,
                prompt,
                model_name,
                client
            )
            
            # Parse the response to extract individual claim translations
            translated_claims = self._parse_claims_translation_response(response, claims)
            
            logger.info(f"Batch translation completed. Translated {len(translated_claims)} claims")
            
            return translated_claims
            
        except Exception as e:
            logger.error(f"Batch translation failed: {str(e)}")
            # Fallback to individual translations
            logger.info("Falling back to individual translation")
            results = []
            for i, claim in enumerate(claims):
                if claim and len(str(claim).strip()) > 0:
                    try:
                        translated = await self.translate_to_chinese(
                            text=claim,
                            source_lang=source_lang,
                            client=client,
                            model_name=model_name
                        )
                        results.append({
                            'original': claim,
                            'translated': translated,
                            'index': i + 1
                        })
                    except Exception as inner_e:
                        logger.error(f"Individual translation failed for claim {i+1}: {str(inner_e)}")
                        results.append({
                            'original': claim,
                            'translated': f'[翻译失败: {str(inner_e)}]',
                            'index': i + 1
                        })
            return results
    
    def _parse_claims_translation_response(self, response: str, original_claims: List[str]) -> List[Dict[str, str]]:
        """
        Parse the AI response to extract individual claim translations.
        
        Args:
            response: The AI response text
            original_claims: The original list of claims
            
        Returns:
            List of dictionaries with 'original', 'translated', and 'index' keys
        """
        results = []
        
        # Try to parse "权利要求 X:" format
        pattern = r'权利要求\s*(\d+)[:：]\s*(.*?)(?=权利要求\s*\d+[:：]|$)'
        matches = re.findall(pattern, response, re.DOTALL)
        
        if matches:
            # Create a dictionary of index -> translated text
            translated_dict = {}
            for idx_str, translated_text in matches:
                try:
                    idx = int(idx_str)
                    translated_dict[idx] = translated_text.strip()
                except ValueError:
                    continue
            
            # Build results in the same order as original claims
            for i, original in enumerate(original_claims):
                if original and len(str(original).strip()) > 0:
                    idx = i + 1
                    translated = translated_dict.get(idx, f'[解析失败，原始响应: {response[:200]}...]')
                    results.append({
                        'original': original,
                        'translated': translated,
                        'index': idx
                    })
        else:
            # Fallback: split by newlines and try to match
            lines = [line.strip() for line in response.split('\n') if line.strip()]
            claim_idx = 0
            for line in lines:
                # Try to find claim number at the start
                match = re.match(r'^(?:权利要求\s*)?(\d+)[:：\s]+(.+)', line)
                if match:
                    try:
                        idx = int(match.group(1))
                        translated = match.group(2).strip()
                        if claim_idx < len(original_claims):
                            results.append({
                                'original': original_claims[claim_idx],
                                'translated': translated,
                                'index': idx
                            })
                            claim_idx += 1
                    except (ValueError, IndexError):
                        continue
            
            # If still no results, treat entire response as one translation
            if not results and original_claims:
                results.append({
                    'original': original_claims[0],
                    'translated': response.strip(),
                    'index': 1
                })
        
        return results
    
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
