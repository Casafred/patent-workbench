"""
Text Segment Extractor Module (Refactored)

Extracts relevant sentences from patent specifications based on OCR-detected markers.
Key improvements:
- Pure letter markers are completely skipped
- Each sentence is extracted independently (no concatenation)
- Structured output with marker annotations
"""

import re
import logging
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class MarkerSentence:
    """Represents a sentence containing one or more markers."""
    marker: str
    sentence: str
    marker_context: str  # The context around the marker in the sentence


@dataclass
class ExtractionResult:
    """Result of the extraction process."""
    marker_sentences: List[MarkerSentence] = field(default_factory=list)
    found_markers: Set[str] = field(default_factory=set)
    skipped_letter_markers: Set[str] = field(default_factory=set)
    not_found_markers: Set[str] = field(default_factory=set)
    original_length: int = 0
    extracted_length: int = 0
    structured_text: str = ""


class TextSegmentExtractor:
    """
    Extracts relevant sentences from patent specifications.
    
    Key features:
    - Pure letter markers (A, B, C) are completely skipped
    - Each sentence is extracted independently without concatenation
    - Output is structured with marker annotations
    """
    
    def __init__(self, max_total_length: int = 8000):
        """
        Initialize the extractor.
        
        Args:
            max_total_length: Maximum total length of extracted text (characters)
        """
        self.max_total_length = max_total_length
    
    def _is_pure_letter_marker(self, marker: str) -> bool:
        """
        Check if a marker is a pure letter (should be skipped).
        
        Pure letter markers like "A", "B", "C" are typically section labels,
        not component markers. They should be completely skipped.
        
        Args:
            marker: The marker string to check
            
        Returns:
            True if the marker is a pure letter (should be skipped)
        """
        marker_stripped = marker.strip().upper()
        
        # Single letter
        if len(marker_stripped) == 1 and marker_stripped.isalpha():
            return True
        
        # Pure letters without numbers (like "AB", "ABC")
        if marker_stripped.isalpha() and not any(c.isdigit() for c in marker_stripped):
            return True
        
        return False
    
    def _filter_ocr_markers(self, ocr_markers: Set[str]) -> Tuple[Set[str], Set[str]]:
        """
        Filter OCR markers to remove noise and separate letter markers.
        
        Returns:
            Tuple of (valid_markers, skipped_letter_markers)
        """
        valid_markers = set()
        skipped_letter_markers = set()
        
        for marker in ocr_markers:
            marker_stripped = marker.strip()
            
            # Skip empty markers
            if not marker_stripped:
                continue
            
            # Skip figure references
            marker_upper = marker_stripped.upper()
            if marker_upper.startswith('FIG') or marker_upper.startswith('图'):
                continue
            
            # Check if pure letter marker
            if self._is_pure_letter_marker(marker_stripped):
                skipped_letter_markers.add(marker_stripped)
                logger.info(f"[过滤] 跳过纯字母标记: {marker_stripped}")
                continue
            
            valid_markers.add(marker_stripped)
        
        return valid_markers, skipped_letter_markers
    
    def extract_relevant_sentences(
        self, 
        specification: str, 
        ocr_markers: Set[str]
    ) -> ExtractionResult:
        """
        Extract relevant sentences from specification based on OCR markers.
        
        Each sentence is extracted independently with marker annotations.
        No sentence concatenation is performed.
        
        Args:
            specification: Full patent specification text
            ocr_markers: Set of marker numbers detected by OCR
            
        Returns:
            ExtractionResult containing structured extraction results
        """
        result = ExtractionResult(original_length=len(specification))
        
        if not specification:
            return result
        
        # Filter markers
        valid_markers, skipped_letter_markers = self._filter_ocr_markers(ocr_markers)
        result.skipped_letter_markers = skipped_letter_markers
        
        logger.info(f"[文本提取] 原始OCR标记: {ocr_markers}")
        logger.info(f"[文本提取] 有效标记: {valid_markers}")
        logger.info(f"[文本提取] 跳过的纯字母标记: {skipped_letter_markers}")
        
        if not valid_markers:
            logger.warning("No valid markers after filtering")
            result.not_found_markers = ocr_markers - skipped_letter_markers
            return result
        
        # Split into sentences
        sentences = self._split_into_sentences(specification)
        logger.info(f"[文本提取] 分句数量: {len(sentences)}")
        
        # Build marker pattern
        marker_pattern = self._build_marker_pattern(valid_markers)
        
        # Find sentences containing markers
        marker_sentence_map: Dict[str, List[str]] = {}  # marker -> list of sentences
        
        for sentence in sentences:
            if not sentence.strip():
                continue
            
            matches = marker_pattern.findall(sentence)
            if matches:
                for match in matches:
                    marker = match
                    if marker not in marker_sentence_map:
                        marker_sentence_map[marker] = []
                    
                    # Avoid duplicate sentences for the same marker
                    if sentence not in marker_sentence_map[marker]:
                        marker_sentence_map[marker].append(sentence)
                        logger.info(f"[文本提取] 标记 {marker} 匹配句子: {sentence[:60]}...")
        
        # Build result
        found_markers = set(marker_sentence_map.keys())
        result.found_markers = found_markers
        result.not_found_markers = valid_markers - found_markers
        
        # Create structured output
        structured_lines = []
        total_length = 0
        
        for marker in sorted(found_markers, key=lambda x: (len(x), x)):
            sentences_for_marker = marker_sentence_map[marker]
            
            for sentence in sentences_for_marker:
                # Create structured entry
                marker_sentence = MarkerSentence(
                    marker=marker,
                    sentence=sentence.strip(),
                    marker_context=self._extract_marker_context(sentence, marker)
                )
                result.marker_sentences.append(marker_sentence)
                
                # Build structured text line
                structured_line = f"[标记{marker}] {sentence.strip()}"
                
                # Check length limit
                if total_length + len(structured_line) > self.max_total_length:
                    logger.warning(f"[文本提取] 达到最大长度限制，停止提取")
                    break
                
                structured_lines.append(structured_line)
                total_length += len(structured_line) + 1  # +1 for newline
        
        result.structured_text = '\n'.join(structured_lines)
        result.extracted_length = total_length
        
        logger.info(f"[文本提取] 提取了 {len(result.marker_sentences)} 个句子")
        logger.info(f"[文本提取] 找到的标记: {found_markers}")
        logger.info(f"[文本提取] 未找到的标记: {result.not_found_markers}")
        logger.info(f"[文本提取] 跳过的纯字母标记: {skipped_letter_markers}")
        
        return result
    
    def _extract_marker_context(self, sentence: str, marker: str) -> str:
        """
        Extract context around the marker in the sentence.
        
        Returns a short string showing the marker with surrounding text.
        """
        pattern = self._build_marker_pattern({marker})
        match = pattern.search(sentence)
        
        if match:
            start = max(0, match.start() - 10)
            end = min(len(sentence), match.end() + 10)
            return sentence[start:end]
        
        return marker
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Handles Chinese and English sentence delimiters.
        Preserves the delimiters at the end of each sentence.
        """
        # Split by sentence endings
        sentence_endings = r'([。！？；\n]+)'
        parts = re.split(sentence_endings, text)
        
        sentences = []
        i = 0
        while i < len(parts):
            if i + 1 < len(parts) and re.match(sentence_endings, parts[i + 1]):
                combined = parts[i] + parts[i + 1]
                if combined.strip():
                    sentences.append(combined)
                i += 2
            else:
                if parts[i].strip():
                    sentences.append(parts[i])
                i += 1
        
        return sentences
    
    def _build_marker_pattern(self, markers: Set[str]) -> re.Pattern:
        """
        Build a regex pattern to match any of the given markers.
        
        Uses negative lookbehind/lookahead to ensure marker is not part of a larger number.
        """
        if not markers:
            return re.compile(r'(?!a)a')
        
        # Sort by length (longest first) to avoid partial matches
        sorted_markers = sorted(markers, key=len, reverse=True)
        escaped_markers = [re.escape(m) for m in sorted_markers]
        marker_group = '|'.join(escaped_markers)
        
        # Match marker that is not part of a larger alphanumeric sequence
        pattern = rf'(?<![0-9A-Za-z])({marker_group})(?![0-9A-Za-z])'
        
        return re.compile(pattern, re.IGNORECASE)


def extract_relevant_segments(
    specification: str, 
    ocr_markers: Set[str],
    context_sentences: int = 0,  # Not used in refactored version
    max_total_length: int = 8000
) -> Dict:
    """
    Extract relevant segments from specification.
    
    This function maintains backward compatibility with the original API
    while using the refactored extraction logic.
    
    Args:
        specification: Full patent specification text
        ocr_markers: Set of marker numbers detected by OCR
        context_sentences: Ignored (kept for backward compatibility)
        max_total_length: Maximum total length of extracted text
        
    Returns:
        Dictionary with extraction results
    """
    extractor = TextSegmentExtractor(max_total_length=max_total_length)
    result = extractor.extract_relevant_sentences(specification, ocr_markers)
    
    # Convert to backward-compatible format
    return {
        'extracted_text': result.structured_text,
        'found_markers': result.found_markers,
        'not_found_markers': result.not_found_markers,
        'skipped_letter_markers': result.skipped_letter_markers,
        'segment_count': len(result.marker_sentences),
        'original_length': result.original_length,
        'extracted_length': result.extracted_length,
        'marker_sentences': [
            {
                'marker': ms.marker,
                'sentence': ms.sentence,
                'context': ms.marker_context
            }
            for ms in result.marker_sentences
        ]
    }
