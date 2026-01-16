"""
Patent search and analysis routes.

This module handles patent search from Google Patents and AI-powered analysis.
"""

import json
import time
import traceback
import requests
from flask import Blueprint, request, jsonify
from bs4 import BeautifulSoup
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response

# Create blueprint
patent_bp = Blueprint('patent', __name__)


def get_patent_data_reliable(patent_id):
    """
    Fetch patent data from Google Patents JSON API.
    
    Args:
        patent_id: Patent identifier
    
    Returns:
        dict: Patent data or None if failed
    """
    patent_id = patent_id.strip()
    url = f"https://patents.google.com/xhr/result?id={patent_id}/en"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return None
        
        raw_data = response.json()
        recap = raw_data.get('recap', {})
        
        extracted_data = {
            "patent_number": patent_id,
            "title": recap.get('title', "无标题"),
            "abstract": recap.get('abstract', "无摘要"),
            "inventors": [i.get('name') for i in recap.get('inventors', []) if i.get('name')],
            "application_date": recap.get('application_date', "无信息"),
            "publication_date": recap.get('publication_date', "无信息"),
            "claims": raw_data.get('claims', "无权利要求信息"),
            "description": raw_data.get('description', "无说明书信息")
        }
        return extracted_data
        
    except Exception as e:
        print(f"爬取专利 {patent_id} 失败: {str(e)}")
        return None


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
        
        # Remove duplicates
        patent_numbers = list(set(patent_numbers))
        
        results = []
        
        for patent_number in patent_numbers:
            try:
                url = f'https://patents.google.com/patent/{patent_number}'
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                }
                
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'lxml')
                patent_data = {}
                
                # Try to parse JSON-LD data
                try:
                    json_ld = soup.find('script', type='application/ld+json')
                    if json_ld:
                        ld_data = json.loads(json_ld.string)
                        
                        if '@graph' in ld_data:
                            for item in ld_data['@graph']:
                                if item.get('@type') == 'Patent':
                                    patent_data['title'] = item.get('name', '')
                                    patent_data['abstract'] = item.get('abstract', '')
                                    patent_data['inventors'] = [inv.get('name', '') for inv in item.get('inventor', [])]
                                    patent_data['application_date'] = item.get('filingDate', '')
                                    patent_data['publication_date'] = item.get('publicationDate', '')
                                    patent_data['assignees'] = [ass.get('name', '') for ass in item.get('assignee', [])]
                                    break
                except Exception as e:
                    print(f"Error parsing JSON-LD for {patent_number}: {e}")
                
                # Fallback to HTML parsing if JSON-LD failed
                if not patent_data.get('title'):
                    title = soup.find('h1')
                    patent_data['title'] = title.get_text().strip() if title else ''
                
                if not patent_data.get('abstract'):
                    abstract = soup.find('div', id='abstract') or soup.find('div', class_='abstract')
                    patent_data['abstract'] = abstract.get_text().strip() if abstract else ''
                
                if not patent_data.get('inventors'):
                    inventors = []
                    inventor_section = soup.find('div', id='inventor')
                    if inventor_section:
                        inventor_elements = inventor_section.find_all('span')
                        for inv in inventor_elements:
                            inventor_name = inv.get_text().strip()
                            if inventor_name and inventor_name != 'Inventors':
                                inventors.append(inventor_name)
                    patent_data['inventors'] = inventors
                
                # Get claims
                try:
                    claims = []
                    claims_section = soup.find('div', id='claims')
                    if claims_section:
                        claim_elements = claims_section.find_all('div', class_='claim')
                        if not claim_elements:
                            claim_elements = claims_section.find_all('p')
                        for claim in claim_elements:
                            claim_text = claim.get_text().strip()
                            if claim_text and len(claim_text) > 10:
                                claims.append(claim_text)
                    patent_data['claims'] = claims
                except Exception as e:
                    patent_data['claims'] = []
                
                # Get description
                try:
                    description = ''
                    description_section = soup.find('div', id='description')
                    if description_section:
                        para_elements = description_section.find_all('p')
                        if para_elements:
                            description = ' '.join([para.get_text().strip() for para in para_elements[:10]])
                    patent_data['description'] = description
                except Exception as e:
                    patent_data['description'] = ''
                
                patent_data['patent_number'] = patent_number
                patent_data['url'] = url
                
                results.append({
                    'patent_number': patent_number,
                    'success': True,
                    'data': patent_data,
                    'url': url
                })
                
                # Add delay to avoid rate limiting
                time.sleep(2)
                
            except requests.exceptions.RequestException as e:
                results.append({
                    'patent_number': patent_number,
                    'success': False,
                    'error': f"Request error: {str(e)}"
                })
            except Exception as e:
                print(f"Error processing {patent_number}: {traceback.format_exc()}")
                results.append({
                    'patent_number': patent_number,
                    'success': False,
                    'error': str(e)
                })
        
        return create_response(data=results)
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
        prompt = f"请详细解读以下专利信息：\n\n"
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
        
        messages = [
            {
                "role": "system",
                "content": "你是一位专业的专利分析师，请详细解读专利的技术内容、创新点和应用价值。"
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
