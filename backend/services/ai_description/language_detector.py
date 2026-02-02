"""
Language Detector Module

Detects the language of patent description text using langdetect library.
"""

import logging
from typing import Optional
from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)


class LanguageDetector:
    """
    Detects the language of text content.
    
    Uses the langdetect library to identify the primary language
    of patent description text.
    """
    
    def __init__(self):
        """Initialize the language detector."""
        pass
    
    def detect(self, text: str) -> str:
        """
        Detect the language of the given text.
        
        Args:
            text: Input text to detect language from
            
        Returns:
            Language code (e.g., 'zh', 'en', 'ja', 'ko', 'de', 'fr')
            
        Raises:
            LangDetectException: If language detection fails
        """
        if not text or len(text.strip()) < 10:
            raise LangDetectException(
                "Text too short for reliable language detection. "
                "Please provide at least 10 characters."
            )
        
        try:
            # Detect language
            language_code = detect(text)
            logger.info(f"Detected language: {language_code} for text length: {len(text)}")
            return language_code
            
        except LangDetectException as e:
            logger.error(f"Language detection failed: {str(e)}")
            raise LangDetectException(
                f"Unable to detect text language: {str(e)}. "
                "Please ensure the text is long enough and contains valid characters."
            )
    
    def is_chinese_fast(self, text: str) -> bool:
        """
        Fast Chinese detection without using langdetect.
        Checks for presence of Chinese characters.

        Args:
            text: Input text to check

        Returns:
            True if text contains significant Chinese characters
        """
        if not text:
            return False

        import re
        # Count Chinese characters (CJK Unified Ideographs)
        chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
        chinese_ratio = len(chinese_chars) / len(text) if text else 0

        # Consider it Chinese if >20% of characters are Chinese
        is_chinese = chinese_ratio > 0.2

        logger.info(f"Fast Chinese detection: {chinese_ratio*100:.1f}% Chinese chars, result: {is_chinese}")
        return is_chinese

    def is_chinese(self, text: str) -> bool:
        """
        Check if the text is in Chinese.

        First tries fast detection for obvious cases, then falls back to langdetect.

        Args:
            text: Input text to check

        Returns:
            True if the text is Chinese, False otherwise
        """
        # Try fast detection first
        if self.is_chinese_fast(text):
            return True

        # If fast detection is inconclusive, use langdetect
        try:
            return self.detect(text) == 'zh'
        except LangDetectException:
            # If detection fails, assume not Chinese
            return False
