"""
Text Segment Extractor Module

Extracts relevant text segments from patent specifications based on OCR-detected markers.
This reduces the text length sent to AI for processing, avoiding timeout issues.
"""

import re
import logging
from typing import List, Dict, Set, Tuple

logger = logging.getLogger(__name__)


class TextSegmentExtractor:
    """
    Extracts relevant text segments from patent specifications.
    
    Given a full specification text and a set of OCR-detected markers,
    this class finds and extracts only the relevant sentences/paragraphs
    that contain those markers, with proper context.
    """
    
    def __init__(self, context_sentences: int = 2, max_total_length: int = 8000):
        """
        Initialize the extractor.
        
        Args:
            context_sentences: Number of sentences to include before/after each match (default: 2)
            max_total_length: Maximum total length of extracted text (characters)
        """
        self.context_sentences = context_sentences
        self.max_total_length = max_total_length
    
    def _filter_ocr_markers(self, ocr_markers: Set[str]) -> Set[str]:
        """
        Filter OCR markers to remove noise.
        
        Removes:
        - FIG. X, Fig. X, 图X (figure references, not part markers)
        - Single letters (unless they are part of a valid marker like "A1")
        """
        filtered = set()
        for marker in ocr_markers:
            marker_upper = marker.upper().strip()
            if marker_upper.startswith('FIG') or marker_upper.startswith('图'):
                continue
            if len(marker) == 1 and not marker.isdigit():
                continue
            filtered.add(marker)
        return filtered
    
    def extract_relevant_segments(
        self, 
        specification: str, 
        ocr_markers: Set[str]
    ) -> Dict:
        """
        Extract relevant text segments from specification based on OCR markers.
        
        Args:
            specification: Full patent specification text
            ocr_markers: Set of marker numbers detected by OCR (e.g., {"1", "2", "10", "20"})
            
        Returns:
            Dictionary containing:
            - extracted_text: The relevant text segments joined together
            - found_markers: Set of markers that were found in the specification
            - not_found_markers: Set of markers that were not found
            - segment_count: Number of segments extracted
            - original_length: Length of original specification
            - extracted_length: Length of extracted text
        """
        if not specification:
            return {
                'extracted_text': '',
                'found_markers': set(),
                'not_found_markers': ocr_markers,
                'segment_count': 0,
                'original_length': 0,
                'extracted_length': 0
            }
        
        original_length = len(specification)
        
        if not ocr_markers:
            return {
                'extracted_text': specification[:self.max_total_length],
                'found_markers': set(),
                'not_found_markers': set(),
                'segment_count': 0,
                'original_length': original_length,
                'extracted_length': min(original_length, self.max_total_length)
            }
        
        filtered_markers = self._filter_ocr_markers(ocr_markers)
        logger.info(f"[文本提取] 原始OCR标记: {ocr_markers}")
        logger.info(f"[文本提取] 过滤后标记: {filtered_markers}")
        
        if not filtered_markers:
            logger.warning("All OCR markers were filtered out")
            return {
                'extracted_text': specification[:self.max_total_length],
                'found_markers': set(),
                'not_found_markers': ocr_markers,
                'segment_count': 0,
                'original_length': original_length,
                'extracted_length': min(original_length, self.max_total_length)
            }
        
        sentences = self._split_into_sentences(specification)
        logger.info(f"[文本提取] 分句数量: {len(sentences)}")
        
        marker_pattern = self._build_marker_pattern(filtered_markers)
        
        relevant_indices = set()
        found_markers = set()
        
        for i, sentence in enumerate(sentences):
            matches = marker_pattern.findall(sentence)
            if matches:
                relevant_indices.add(i)
                for match in matches:
                    found_markers.add(match)
                logger.info(f"[文本提取] 句子{i}匹配到标记 {matches}: {sentence[:50]}...")
        
        if not relevant_indices:
            logger.warning(f"None of the OCR markers {filtered_markers} found in specification")
            return {
                'extracted_text': specification[:self.max_total_length],
                'found_markers': set(),
                'not_found_markers': filtered_markers,
                'segment_count': 0,
                'original_length': original_length,
                'extracted_length': min(original_length, self.max_total_length)
            }
        
        expanded_indices = self._expand_context(relevant_indices, len(sentences))
        logger.info(f"[文本提取] 匹配句子索引: {sorted(relevant_indices)}")
        logger.info(f"[文本提取] 扩展后索引: {sorted(expanded_indices)}")
        
        segments = self._extract_segments(sentences, expanded_indices)
        
        extracted_text = self._join_segments(segments)
        
        if len(extracted_text) > self.max_total_length:
            extracted_text = extracted_text[:self.max_total_length]
            logger.warning(f"Extracted text truncated to {self.max_total_length} characters")
        
        not_found_markers = filtered_markers - found_markers
        all_not_found = (ocr_markers - filtered_markers) | not_found_markers
        
        result = {
            'extracted_text': extracted_text,
            'found_markers': found_markers,
            'not_found_markers': all_not_found,
            'segment_count': len(segments),
            'original_length': original_length,
            'extracted_length': len(extracted_text)
        }
        
        logger.info(f"[文本提取] 提取了 {len(segments)} 个段落, {original_length} -> {len(extracted_text)} 字符")
        logger.info(f"[文本提取] 找到的标记: {found_markers}")
        logger.info(f"[文本提取] 未找到的标记: {not_found_markers}")
        
        return result
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Handles Chinese and English sentence delimiters.
        Preserves the delimiters at the end of each sentence.
        """
        sentence_endings = r'([。！？\n]+)'
        parts = re.split(sentence_endings, text)
        
        sentences = []
        i = 0
        while i < len(parts):
            if i + 1 < len(parts) and re.match(sentence_endings, parts[i + 1]):
                sentences.append(parts[i] + parts[i + 1])
                i += 2
            else:
                if parts[i].strip():
                    sentences.append(parts[i])
                i += 1
        
        return sentences
    
    def _build_marker_pattern(self, markers: Set[str]) -> re.Pattern:
        """
        Build a regex pattern to match any of the given markers.
        
        Matches patterns like:
        - "外壳10" - marker after component name
        - "10. 外壳" - marker before component name
        - "（10）" or "(10)" - marker in parentheses
        - "第10实施例" - marker in phrase
        - "10、外壳" - marker with Chinese punctuation
        
        Uses negative lookbehind/lookahead to ensure marker is not part of a larger number.
        """
        if not markers:
            return re.compile(r'(?!a)a')
        
        sorted_markers = sorted(markers, key=len, reverse=True)
        escaped_markers = [re.escape(m) for m in sorted_markers]
        marker_group = '|'.join(escaped_markers)
        
        pattern = rf'(?<![0-9A-Za-z])({marker_group})(?![0-9A-Za-z])'
        
        return re.compile(pattern, re.IGNORECASE)
    
    def _expand_context(self, indices: Set[int], total_sentences: int) -> Set[int]:
        """
        Expand the set of indices to include context sentences.
        """
        expanded = set()
        for idx in indices:
            for offset in range(-self.context_sentences, self.context_sentences + 1):
                new_idx = idx + offset
                if 0 <= new_idx < total_sentences:
                    expanded.add(new_idx)
        return expanded
    
    def _extract_segments(self, sentences: List[str], indices: Set[int]) -> List[List[str]]:
        """
        Extract contiguous segments from sentences based on indices.
        """
        if not indices:
            return []
        
        sorted_indices = sorted(indices)
        segments = []
        current_segment = []
        prev_idx = None
        
        for idx in sorted_indices:
            if prev_idx is None or idx == prev_idx + 1:
                current_segment.append(sentences[idx])
            else:
                if current_segment:
                    segments.append(current_segment)
                current_segment = [sentences[idx]]
            prev_idx = idx
        
        if current_segment:
            segments.append(current_segment)
        
        return segments
    
    def _join_segments(self, segments: List[List[str]]) -> str:
        """
        Join segments into a single text, with clear separation between segments.
        """
        segment_texts = [''.join(seg) for seg in segments]
        return '\n\n'.join(segment_texts)


def extract_relevant_segments(
    specification: str, 
    ocr_markers: Set[str],
    context_sentences: int = 1,
    max_total_length: int = 8000
) -> Dict:
    """
    Convenience function to extract relevant segments.
    
    Args:
        specification: Full patent specification text
        ocr_markers: Set of marker numbers detected by OCR
        context_sentences: Number of context sentences to include
        max_total_length: Maximum total length of extracted text
        
    Returns:
        Dictionary with extraction results
    """
    extractor = TextSegmentExtractor(
        context_sentences=context_sentences,
        max_total_length=max_total_length
    )
    return extractor.extract_relevant_segments(specification, ocr_markers)
