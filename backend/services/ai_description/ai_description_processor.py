"""
AI Description Processor Module

Main coordinator for AI-powered patent description processing.
Handles language detection, translation, and component extraction.
"""

import logging
import time
from typing import Dict, Optional, List
from datetime import datetime

from .language_detector import LanguageDetector, LangDetectException
from .translation_service import TranslationService, TranslationServiceUnavailable
from .ai_component_extractor import AIComponentExtractor

logger = logging.getLogger(__name__)


class AIDescriptionProcessor:
    """
    Coordinates the AI processing pipeline for patent descriptions.
    
    Pipeline:
    1. Detect language of description text
    2. Translate to Chinese if needed
    3. Extract component markers using AI
    """
    
    def __init__(self, api_key: str):
        """
        Initialize the AI description processor.
        
        Args:
            api_key: ZhipuAI API key for AI model access
        """
        self.api_key = api_key
        self.language_detector = LanguageDetector()
        self.translator = TranslationService(api_key)
        self.extractor = AIComponentExtractor(api_key)
    
    async def process(
        self,
        description_text: str,
        model_name: str,
        custom_prompt: Optional[str] = None
    ) -> Dict:
        """
        Process patent description text and extract components.
        
        Args:
            description_text: Patent description text
            model_name: AI model name to use
            custom_prompt: Optional custom prompt for extraction
            
        Returns:
            Dictionary with processing results:
            {
                "language": "en/zh/ja/...",
                "translated_text": "翻译后的文本(如果需要)",
                "components": [
                    {"marker": "10", "name": "外壳"},
                    ...
                ],
                "processing_time": 1.23
            }
        """
        start_time = time.time()
        
        try:
            # Step 1: Detect language
            logger.info("Step 1: Detecting language...")
            try:
                detected_language = self.language_detector.detect(description_text)
                logger.info(f"Detected language: {detected_language}")
            except LangDetectException as e:
                logger.error(f"Language detection failed: {str(e)}")
                return {
                    "success": False,
                    "error": "无法检测文本语言,请确保文本长度足够或手动指定语言",
                    "error_code": "LANGUAGE_DETECTION_FAILED",
                    "suggestion": "建议使用至少50个字符的文本"
                }
            
            # Step 2: Translate if not Chinese
            text_to_process = description_text
            translated_text = None
            
            if detected_language != 'zh' and detected_language != 'zh-cn' and detected_language != 'zh-tw':
                logger.info(f"Step 2: Translating from {detected_language} to Chinese...")
                try:
                    translated_text = await self.translator.translate_to_chinese(
                        description_text,
                        detected_language,
                        model_name
                    )
                    text_to_process = translated_text
                    logger.info("Translation completed successfully")
                except TranslationServiceUnavailable as e:
                    logger.error(f"Translation failed: {str(e)}")
                    # 翻译失败时，尝试直接使用原文进行抽取
                    logger.warning("Translation failed, will try to extract components from original text")
                    text_to_process = description_text
                except Exception as e:
                    logger.error(f"Unexpected translation error: {str(e)}")
                    # 翻译失败时，尝试直接使用原文进行抽取
                    logger.warning("Translation failed, will try to extract components from original text")
                    text_to_process = description_text
            else:
                logger.info("Step 2: Text is already in Chinese, skipping translation")
            
            # Step 3: Extract components
            logger.info("Step 3: Extracting components...")
            try:
                components = await self.extractor.extract(
                    text_to_process,
                    model_name,
                    custom_prompt
                )
                logger.info(f"Extracted {len(components)} components")
            except Exception as e:
                logger.error(f"Component extraction failed: {str(e)}")
                return {
                    "success": False,
                    "error": f"AI模型调用失败: {str(e)}",
                    "error_code": "AI_CALL_FAILED"
                }
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Build result
            result = {
                "success": True,
                "data": {
                    "language": detected_language,
                    "components": components,
                    "processing_time": round(processing_time, 2)
                }
            }
            
            # Add translated text if translation occurred
            if translated_text:
                result["data"]["translated_text"] = translated_text
            
            # Add warning if no components found
            if len(components) == 0:
                result["data"]["warning"] = "未能抽取到附图标记,请检查说明书内容或尝试使用规则分词模式"
            
            logger.info(f"Processing completed in {processing_time:.2f} seconds")
            return result
            
        except Exception as e:
            # Log unexpected errors
            logger.error(
                "AI processing failed",
                extra={
                    "error_type": "UNEXPECTED_ERROR",
                    "model_name": model_name,
                    "text_length": len(description_text),
                    "timestamp": datetime.now().isoformat(),
                    "error_details": str(e)
                }
            )
            
            return {
                "success": False,
                "error": f"处理过程中发生错误: {str(e)}",
                "error_code": "PROCESSING_ERROR"
            }
