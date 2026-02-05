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
    
    def __init__(self):
        """
        Initialize the AI description processor.
        
        Note: Client is passed per-request, not stored in instance
        """
        self.language_detector = LanguageDetector()
        self.translator = TranslationService()
        self.extractor = AIComponentExtractor()
    
    async def process(
        self,
        description_text: str,
        model_name: str,
        client,  # Add client parameter
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
                "components": [
                    {"marker": "10", "name": "外壳"},
                    ...
                ],
                "processing_time": 1.23
            }
        """
        start_time = time.time()
        
        try:
            # 直接提取组件，将语言检测和翻译集成到提示词中
            logger.info("Extracting components with integrated language detection and translation...")
            try:
                components = await self.extractor.extract(
                    description_text,
                    model_name,
                    client,  # Pass client
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
                    "components": components,
                    "processing_time": round(processing_time, 2)
                }
            }
            
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
