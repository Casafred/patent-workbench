"""
AI Component Extractor Module

Extracts drawing markers and component names from patent descriptions using AI.
"""

import json
import logging
import asyncio
import os
from typing import List, Dict, Optional
from zhipuai import ZhipuAI

logger = logging.getLogger(__name__)


class AIComponentExtractor:
    """
    Extracts component markers from patent descriptions using AI models.
    
    Uses AI to intelligently identify drawing markers (like "10", "20", "图1")
    and their corresponding component names from Chinese patent description text.
    """
    
    def __init__(self, api_key: str):
        """
        Initialize the AI component extractor.
        
        Args:
            api_key: ZhipuAI API key
        """
        self.api_key = api_key
        self.client = None
        if api_key:
            try:
                self.client = ZhipuAI(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize ZhipuAI client: {str(e)}")
        
        self.prompt_template = self._load_default_template()
    
    def _load_default_template(self) -> str:
        """
        Load the default prompt template from file.
        
        Returns:
            Default prompt template string
        """
        template_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'templates',
            'prompts',
            'component_extraction.txt'
        )
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            logger.info(f"Loaded prompt template from {template_path}")
            return template
        except Exception as e:
            logger.error(f"Failed to load prompt template: {str(e)}")
            # Return a fallback template
            return """请从以下专利说明书中抽取所有的附图标记及其对应的部件名称。

请严格按照以下JSON格式返回结果:
{
  "components": [
    {"marker": "10", "name": "外壳"},
    {"marker": "20", "name": "显示屏"}
  ]
}

说明书内容:
{description_text}"""
    
    def _format_prompt(self, template: str, text: str) -> str:
        """
        Format the prompt template with description text.
        
        Args:
            template: Prompt template string
            text: Description text to insert
            
        Returns:
            Formatted prompt string
        """
        return template.replace('{description_text}', text)
    
    def _parse_ai_response(self, response: str) -> List[Dict[str, str]]:
        """
        Parse AI response to extract components list.
        
        Args:
            response: AI model response text
            
        Returns:
            List of component dictionaries with 'marker' and 'name' keys
            
        Raises:
            json.JSONDecodeError: If response is not valid JSON
            ValueError: If response structure is invalid
        """
        # Try to find JSON in the response
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith('```'):
            lines = response.split('\n')
            # Remove first and last lines (``` markers)
            response = '\n'.join(lines[1:-1])
            # Remove json language identifier if present
            if response.startswith('json'):
                response = response[4:].strip()
        
        try:
            result = json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {response[:200]}")
            raise json.JSONDecodeError(
                f"AI returned invalid JSON format: {str(e)}",
                response,
                e.pos
            )
        
        # Validate structure
        if not isinstance(result, dict):
            raise ValueError("AI response must be a JSON object")
        
        if "components" not in result:
            raise ValueError("AI response missing 'components' field")
        
        components = result["components"]
        
        if not isinstance(components, list):
            raise ValueError("'components' field must be a list")
        
        # Validate each component
        for i, comp in enumerate(components):
            if not isinstance(comp, dict):
                raise ValueError(f"Component {i} must be an object")
            if "marker" not in comp or "name" not in comp:
                raise ValueError(f"Component {i} missing 'marker' or 'name' field")
            if not isinstance(comp["marker"], str) or not isinstance(comp["name"], str):
                raise ValueError(f"Component {i} 'marker' and 'name' must be strings")
        
        return components
    
    async def extract(
        self,
        description_text: str,
        model_name: str,
        custom_prompt: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Extract component markers from description text.
        
        Args:
            description_text: Patent description text (in Chinese)
            model_name: AI model name to use
            custom_prompt: Optional custom prompt template
            
        Returns:
            List of dictionaries with 'marker' and 'name' keys
            Example: [{"marker": "10", "name": "外壳"}, ...]
            
        Raises:
            Exception: If AI model call fails or response parsing fails
        """
        if not self.client:
            raise Exception("AI client not initialized. Please check API key.")
        
        # Use custom prompt if provided, otherwise use default
        template = custom_prompt if custom_prompt else self.prompt_template
        
        # Format the prompt
        prompt = self._format_prompt(template, description_text)
        
        try:
            logger.info(f"Extracting components using model {model_name}")
            
            # Call AI model
            response = await asyncio.to_thread(
                self._call_ai_model,
                prompt,
                model_name
            )
            
            # Parse response
            components = self._parse_ai_response(response)
            
            logger.info(f"Successfully extracted {len(components)} components")
            return components
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            raise Exception(
                "AI返回格式错误,请尝试修改提示词或使用规则分词模式"
            )
        except ValueError as e:
            logger.error(f"Response validation error: {str(e)}")
            raise Exception(
                f"AI返回数据结构错误: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Component extraction failed: {str(e)}")
            raise Exception(f"部件标记抽取失败: {str(e)}")
    
    def _call_ai_model(self, prompt: str, model_name: str) -> str:
        """
        Call AI model API (synchronous).
        
        Args:
            prompt: Prompt text
            model_name: Model name
            
        Returns:
            AI model response text
        """
        try:
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=4000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI model call failed: {str(e)}")
            raise
