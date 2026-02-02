"""
Text Preprocessor Module

Preprocesses patent description text based on OCR results to reduce token usage.
"""

import re
import logging
from typing import List, Set

logger = logging.getLogger(__name__)


class TextPreprocessor:
    """
    Preprocesses patent description text by extracting only relevant sentences.

    Reduces AI processing time and token usage by filtering out irrelevant content.
    """

    @staticmethod
    def extract_relevant_sentences(text: str, target_markers: Set[str], context_window: int = 1) -> str:
        """
        Extract sentences containing target markers from the text.

        Args:
            text: Full patent description text
            target_markers: Set of markers detected by OCR (e.g., {'10', '20', '30'})
            context_window: Number of sentences before/after to include for context

        Returns:
            Filtered text containing only relevant sentences
        """
        if not target_markers or not text:
            return text

        logger.info(f"Preprocessing text with {len(target_markers)} target markers")

        # Split text into sentences (支持中英文句子分割)
        # 使用常见的句子结束符：。！？；.!?;
        sentence_pattern = r'[。！？；.!?;]'
        sentences = re.split(sentence_pattern, text)
        sentences = [s.strip() for s in sentences if s.strip()]

        logger.info(f"Split text into {len(sentences)} sentences")

        # Find sentences containing target markers
        relevant_indices = set()

        for i, sentence in enumerate(sentences):
            # Check if sentence contains any target marker
            # 使用词边界匹配，避免误匹配（如"100"匹配到"10"）
            for marker in target_markers:
                # Create pattern: match marker as standalone word/number
                # 支持中文环境：数字前后可以是汉字、空格、标点等
                pattern = r'(?<![0-9])' + re.escape(marker) + r'(?![0-9])'

                if re.search(pattern, sentence):
                    # Add current sentence and context
                    start_idx = max(0, i - context_window)
                    end_idx = min(len(sentences), i + context_window + 1)
                    relevant_indices.update(range(start_idx, end_idx))
                    break

        if not relevant_indices:
            logger.warning("No relevant sentences found, using first 500 chars as fallback")
            # Fallback: return first portion if no matches found
            return text[:500] if len(text) > 500 else text

        # Extract relevant sentences in order
        relevant_indices = sorted(relevant_indices)
        filtered_sentences = [sentences[i] for i in relevant_indices]
        filtered_text = '。'.join(filtered_sentences) + '。'

        # Calculate compression ratio
        original_length = len(text)
        filtered_length = len(filtered_text)
        compression_ratio = (1 - filtered_length / original_length) * 100 if original_length > 0 else 0

        logger.info(
            f"Filtered text: {filtered_length} chars (from {original_length}), "
            f"compression: {compression_ratio:.1f}%, "
            f"retained {len(relevant_indices)} sentences"
        )

        return filtered_text

    @staticmethod
    def is_chinese_text(text: str) -> bool:
        """
        Fast check if text is primarily Chinese (without using langdetect).

        Args:
            text: Text to check

        Returns:
            True if text contains significant Chinese characters
        """
        if not text:
            return False

        # Count Chinese characters (CJK Unified Ideographs)
        chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
        chinese_ratio = len(chinese_chars) / len(text) if text else 0

        # Consider it Chinese if >30% of characters are Chinese
        is_chinese = chinese_ratio > 0.3

        if is_chinese:
            logger.info(f"Fast detected Chinese text ({chinese_ratio*100:.1f}% Chinese chars)")

        return is_chinese

    @staticmethod
    def extract_numbers_from_ocr(ocr_results: List[dict]) -> Set[str]:
        """
        Extract unique marker numbers from OCR results.

        Args:
            ocr_results: List of OCR detection results with 'number' field

        Returns:
            Set of unique marker numbers
        """
        markers = set()
        for result in ocr_results:
            number = result.get('number', '').strip()
            if number:
                markers.add(number)

        logger.info(f"Extracted {len(markers)} unique markers from OCR results: {markers}")
        return markers
