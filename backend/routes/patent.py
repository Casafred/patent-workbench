"""
Patent search and analysis routes.

This module handles patent search from Google Patents and AI-powered analysis.
Uses improved scraper for better reliability.
"""

import json
import time
import traceback
from flask import Blueprint, request, jsonify
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response
from backend.scraper.simple_scraper import SimplePatentScraper

# Create blueprint
patent_bp = Blueprint('patent', __name__)

# Global scraper instance
_scraper_instance = None


def get_scraper_instance() -> SimplePatentScraper:
    """Get or create the global scraper instance."""
    global _scraper_instance
    
    if _scraper_instance is None:
        _scraper_instance = SimplePatentScraper(delay=2.0)
    
    return _scraper_instance


@patent_bp.route('/patent/search', methods=['POST'])
def search_patents():
    """
    Search for multiple patents from Google Patents.
    
    Request body:
        - patent_numbers: List of patent numbers or string with space/newline separated numbers
    
    Returns:
        List of patent search results
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_numbers = req_data.get('patent_numbers', [])
        crawl_specification = req_data.get('crawl_specification', False)
        
        # Handle string input
        if not isinstance(patent_numbers, list):
            if isinstance(patent_numbers, str):
                patent_numbers = patent_numbers.replace('\n', ' ').split()
            else:
                return create_response(
                    error="patent_numbers must be a list or string",
                    status_code=400
                )
        
        # Limit to 50 patents
        if len(patent_numbers) > 50:
            return create_response(
                error="Maximum 50 patent numbers allowed",
                status_code=400
            )
        
        # Remove duplicates and empty strings
        patent_numbers = [p.strip() for p in patent_numbers if p.strip()]
        patent_numbers = list(set(patent_numbers))
        
        if not patent_numbers:
            return create_response(
                error="No valid patent numbers provided",
                status_code=400
            )
        
        # Use simple scraper
        try:
            scraper = get_scraper_instance()
            results = scraper.scrape_patents_batch(patent_numbers, crawl_specification=crawl_specification)
            
            # Convert results to API format
            api_results = [result.to_dict() for result in results]
            
            return create_response(data=api_results)
            
        except Exception as e:
            print(f"Scraper error: {traceback.format_exc()}")
            return create_response(
                error=f"Failed to scrape patents: {str(e)}",
                status_code=500
            )
    
    except Exception as e:
        print(f"Error in search_patents: {traceback.format_exc()}")
        return create_response(
            error=f"Failed to search patents: {str(e)}",
            status_code=500
        )


@patent_bp.route('/patent/analyze', methods=['POST'])
def analyze_patent():
    """
    Analyze patent data using AI.
    
    Request body:
        - patent_data: Patent data to analyze
        - model: AI model to use (default: 'glm-4-flash')
        - temperature: Temperature parameter (default: 0.4)
    
    Returns:
        AI analysis result
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    try:
        req_data = request.get_json()
        patent_data = req_data.get('patent_data')
        model = req_data.get('model', 'glm-4-flash')
        temperature = req_data.get('temperature', 0.4)
        
        if not patent_data:
            return create_response(
                error="patent_data is required",
                status_code=400
            )
        
        # Build prompt for AI analysis
        prompt = f"请详细解读以下专利信息，并以JSON格式返回结构化的解读结果：\n\n"
        prompt += f"专利号: {patent_data.get('patent_number', 'N/A')}\n"
        prompt += f"标题: {patent_data.get('title', 'N/A')}\n"
        prompt += f"摘要: {patent_data.get('abstract', 'N/A')}\n"
        prompt += f"发明人: {', '.join(patent_data.get('inventors', []))}\n"
        prompt += f"受让人: {', '.join(patent_data.get('assignees', []))}\n"
        prompt += f"申请日期: {patent_data.get('application_date', 'N/A')}\n"
        prompt += f"公开日期: {patent_data.get('publication_date', 'N/A')}\n"
        
        if patent_data.get('claims'):
            claims_text = patent_data.get('claims', 'N/A')
            if isinstance(claims_text, list):
                claims_text = ' '.join(claims_text)
            prompt += f"权利要求: {claims_text[:500]}...\n"
        else:
            prompt += "权利要求: N/A\n"
        
        # 添加JSON格式要求
        prompt += "\n请按照以下JSON格式返回解读结果：\n"
        prompt += "{\n"
        prompt += '  "technical_field": "技术领域",\n'
        prompt += '  "innovation_points": "创新点",\n'
        prompt += '  "technical_solution": "技术方案",\n'
        prompt += '  "application_scenarios": "应用场景",\n'
        prompt += '  "market_value": "市场价值",\n'
        prompt += '  "advantages": "技术优势",\n'
        prompt += '  "limitations": "局限性",\n'
        prompt += '  "summary": "总结"\n'
        prompt += "}\n"
        
        messages = [
            {
                "role": "system",
                "content": "你是一位专业的专利分析师，请详细解读专利的技术内容、创新点和应用价值，并严格按照要求的JSON格式返回结果。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response_from_sdk = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature
        )
        
        json_string = response_from_sdk.model_dump_json()
        clean_dict = json.loads(json_string)
        
        return jsonify(clean_dict)
    except Exception as e:
        print(f"Error in analyze_patent: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"专利解读失败: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500
