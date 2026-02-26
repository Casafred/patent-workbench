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
    
    def __init__(self, context_sentences: int = 1, max_total_length: int = 8000):
        """
        Initialize the extractor.
        
        Args:
            context_sentences: Number of sentences to include before/after each match
            max_total_length: Maximum total length of extracted text (characters)
        """
        self.context_sentences = context_sentences
        self.max_total_length = max_total_length
    
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
        if not specification or not ocr_markers:
            return {
                'extracted_text': specification,
                'found_markers': set(),
                'not_found_markers': ocr_markers,
                'segment_count': 0,
                'original_length': len(specification) if specification else 0,
                'extracted_length': len(specification) if specification else 0
            }
        
        original_length = len(specification)
        
        sentences = self._split_into_sentences(specification)
        
        marker_pattern = self._build_marker_pattern(ocr_markers)
        
        relevant_indices = set()
        found_markers = set()
        
        for i, sentence in enumerate(sentences):
            matches = marker_pattern.findall(sentence)
            if matches:
                relevant_indices.add(i)
                for match in matches:
                    found_markers.add(match)
        
        if not relevant_indices:
            logger.warning(f"None of the OCR markers {ocr_markers} found in specification")
            return {
                'extracted_text': specification[:self.max_total_length],
                'found_markers': set(),
                'not_found_markers': ocr_markers,
                'segment_count': 0,
                'original_length': original_length,
                'extracted_length': min(original_length, self.max_total_length)
            }
        
        expanded_indices = self._expand_context(relevant_indices, len(sentences))
        
        segments = self._extract_segments(sentences, expanded_indices)
        
        extracted_text = self._join_segments(segments)
        
        if len(extracted_text) > self.max_total_length:
            extracted_text = extracted_text[:self.max_total_length]
            logger.warning(f"Extracted text truncated to {self.max_total_length} characters")
        
        not_found_markers = ocr_markers - found_markers
        
        result = {
            'extracted_text': extracted_text,
            'found_markers': found_markers,
            'not_found_markers': not_found_markers,
            'segment_count': len(segments),
            'original_length': original_length,
            'extracted_length': len(extracted_text)
        }
        
        logger.info(f"Extracted {len(segments)} segments, {original_length} -> {len(extracted_text)} chars")
        logger.info(f"Found markers: {found_markers}, Not found: {not_found_markers}")
        
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
        - "1" as standalone number or with Chinese punctuation
        - "1." at start of line
        - "（1）" or "(1)"
        - "1、" 
        - "第1实施例"
        """
        sorted_markers = sorted(markers, key=len, reverse=True)
        escaped_markers = [re.escape(m) for m in sorted_markers]
        marker_group = '|'.join(escaped_markers)
        
        pattern = rf'(?:^|[^\d])(?:({marker_group})(?:[\.、，,：:\s）\)]|[^\d]|$))'
        
        return re.compile(pattern, re.MULTILINE)
    
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
