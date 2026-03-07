"""
Classification API routes.

This module handles classification-related operations including
prompt optimization, cold start analysis, and result processing.
"""

import json
import traceback
from flask import Blueprint, request
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response

classification_bp = Blueprint('classification', __name__)


@classification_bp.route('/classify/optimize_prompt', methods=['POST'])
def optimize_prompt():
    """
    Optimize classification prompt using AI.
    
    Request body:
        - prompt: Original prompt to optimize
        - schema: Classification schema (optional)
    
    Returns:
        - optimized_prompt: Optimized prompt
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    original_prompt = req_data.get('prompt', '')
    schema = req_data.get('schema', {})
    
    if not original_prompt:
        return create_response(error="提示词不能为空")
    
    try:
        optimize_system = """你是一个提示词优化专家。你的任务是优化分类标引的提示词，使其更加清晰、准确、易于模型理解。

优化原则：
1. 保持原有结构和核心要求
2. 使分类原则更加明确具体
3. 确保输出格式要求清晰
4. 添加有助于模型理解的示例说明
5. 避免歧义和模糊表述"""

        optimize_user = f"""请优化以下分类标引提示词，使其更加清晰有效。保持JSON输出格式要求不变，只优化分类原则和描述部分：

{original_prompt}"""

        response = client.chat.completions.create(
            model='GLM-4.7-Flash',
            messages=[
                {"role": "system", "content": optimize_system},
                {"role": "user", "content": optimize_user}
            ],
            temperature=0.3
        )
        
        optimized = response.choices[0].message.content
        
        return create_response(data={
            'original_prompt': original_prompt,
            'optimized_prompt': optimized
        })
    except Exception as e:
        print(f"Error in optimize_prompt: {traceback.format_exc()}")
        return create_response(error=f"优化提示词时发生错误: {str(e)}")


@classification_bp.route('/classify/cold_start', methods=['POST'])
def cold_start_analysis():
    """
    Analyze data samples and suggest classification schema.
    
    Request body:
        - samples: List of text samples to analyze
        - options: Additional options (optional)
    
    Returns:
        - analysis: Analysis result with suggested schema
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    samples = req_data.get('samples', [])
    options = req_data.get('options', {})
    
    if not samples:
        return create_response(error="样本数据不能为空")
    
    try:
        sample_text = "\n\n".join([
            f"### 样本{i+1}\n{str(s)[:1000]}"
            for i, s in enumerate(samples[:15])
        ])
        
        system_prompt = """你是一个专业的数据分类分析师。你的任务是分析给定的文本数据，识别其特征和模式，并提出合理的分类体系建议。

你需要：
1. 分析数据的主题、领域、结构特征
2. 识别可能的分类维度
3. 为每个分类维度提出具体的分类标签
4. 给出分类原则和判断标准

输出格式必须是有效的JSON。"""

        user_prompt = f"""请分析以下{len(samples)}条数据样本，提出一个合理的分类体系建议。

## 数据样本

{sample_text}

## 输出要求

请严格按照以下JSON格式输出分析结果：

```json
{{
  "dataCharacteristics": {{
    "domain": "数据所属领域",
    "mainTopics": ["主题1", "主题2"],
    "structureFeatures": "数据结构特征描述"
  }},
  "suggestedSchema": {{
    "name": "分类体系名称",
    "layers": [
      {{
        "name": "层级名称",
        "description": "分类原则描述",
        "labels": ["标签1", "标签2", "标签3"]
      }}
    ],
    "multiLabel": false,
    "reasoning": "分类体系设计理由"
  }},
  "recommendations": ["其他建议"]
}}
```

请确保：
1. 分类标签具体且互斥
2. 分类原则清晰可操作
3. 标签数量适中（每个层级3-10个标签为宜）
4. 考虑实际应用场景"""

        if options.get('hint'):
            user_prompt += f"\n\n## 用户提示\n{options['hint']}"

        response = client.chat.completions.create(
            model=options.get('model', 'GLM-4.7-Flash'),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5
        )
        
        content = response.choices[0].message.content
        
        json_match = content.split('```json')[-1].split('```')[0] if '```json' in content else content
        if '{' in json_match:
            json_match = '{' + json_match.split('{', 1)[1]
        if '}' in json_match:
            json_match = json_match.rsplit('}', 1)[0] + '}'
        
        analysis = json.loads(json_match)
        
        return create_response(data={
            'analysis': analysis,
            'sampleCount': len(samples)
        })
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return create_response(data={
            'analysis': {
                'dataCharacteristics': {
                    'domain': '未知',
                    'mainTopics': [],
                    'structureFeatures': '解析失败'
                },
                'suggestedSchema': None,
                'recommendations': []
            },
            'rawContent': content if 'content' in dir() else '',
            'parseError': str(e)
        })
    except Exception as e:
        print(f"Error in cold_start_analysis: {traceback.format_exc()}")
        return create_response(error=f"冷启动分析时发生错误: {str(e)}")


@classification_bp.route('/classify/analyze_result', methods=['POST'])
def analyze_result():
    """
    Analyze classification result for confidence and issues.
    
    Request body:
        - result: Classification result to analyze
        - schema: Classification schema (optional)
    
    Returns:
        - analysis: Analysis result
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    result = req_data.get('result', {})
    schema = req_data.get('schema', {})
    
    try:
        analysis = {
            'isValid': True,
            'confidence': 0,
            'confidenceLevel': 'unknown',
            'issues': [],
            'suggestions': []
        }
        
        if not result:
            analysis['isValid'] = False
            analysis['issues'].append('分类结果为空')
            return create_response(data=analysis)
        
        classification = result.get('classification', {})
        confidence = result.get('confidence', {})
        
        if not classification:
            analysis['isValid'] = False
            analysis['issues'].append('缺少分类结果')
        
        if confidence:
            conf_values = [v for v in confidence.values() if isinstance(v, (int, float))]
            if conf_values:
                avg_conf = sum(conf_values) / len(conf_values)
                analysis['confidence'] = round(avg_conf, 3)
                
                if avg_conf < 0.6:
                    analysis['confidenceLevel'] = 'low'
                    analysis['issues'].append('整体确信度过低')
                    analysis['suggestions'].append('建议人工复核')
                elif avg_conf < 0.8:
                    analysis['confidenceLevel'] = 'medium'
                else:
                    analysis['confidenceLevel'] = 'high'
        
        layers = schema.get('layers', [])
        for layer in layers:
            layer_name = layer.get('name', '')
            if layer_name and layer_name not in classification:
                analysis['issues'].append(f'层级"{layer_name}"缺少分类结果')
        
        return create_response(data=analysis)
    except Exception as e:
        print(f"Error in analyze_result: {traceback.format_exc()}")
        return create_response(error=f"分析结果时发生错误: {str(e)}")


@classification_bp.route('/classify/batch_analyze', methods=['POST'])
def batch_analyze():
    """
    Batch analyze classification results.
    
    Request body:
        - results: List of classification results
        - schema: Classification schema (optional)
    
    Returns:
        - stats: Batch analysis statistics
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    req_data = request.get_json()
    results = req_data.get('results', [])
    schema = req_data.get('schema', {})
    
    try:
        stats = {
            'total': len(results),
            'valid': 0,
            'invalid': 0,
            'byConfidence': {
                'low': 0,
                'medium': 0,
                'high': 0
            },
            'avgConfidence': 0,
            'layerStats': {}
        }
        
        total_confidence = 0
        conf_count = 0
        
        layers = schema.get('layers', [])
        for layer in layers:
            layer_name = layer.get('name', '')
            if layer_name:
                stats['layerStats'][layer_name] = {
                    'total': 0,
                    'labelDistribution': {}
                }
        
        for result in results:
            classification = result.get('classification', {})
            confidence = result.get('confidence', {})
            
            if classification:
                stats['valid'] += 1
            else:
                stats['invalid'] += 1
            
            if confidence:
                conf_values = [v for v in confidence.values() if isinstance(v, (int, float))]
                if conf_values:
                    avg = sum(conf_values) / len(conf_values)
                    total_confidence += avg
                    conf_count += 1
                    
                    if avg < 0.6:
                        stats['byConfidence']['low'] += 1
                    elif avg < 0.8:
                        stats['byConfidence']['medium'] += 1
                    else:
                        stats['byConfidence']['high'] += 1
            
            for layer_name, label in classification.items():
                if layer_name in stats['layerStats']:
                    stats['layerStats'][layer_name]['total'] += 1
                    
                    labels = [label] if not isinstance(label, list) else label
                    for l in labels:
                        if l not in stats['layerStats'][layer_name]['labelDistribution']:
                            stats['layerStats'][layer_name]['labelDistribution'][l] = 0
                        stats['layerStats'][layer_name]['labelDistribution'][l] += 1
        
        if conf_count > 0:
            stats['avgConfidence'] = round(total_confidence / conf_count, 3)
        
        return create_response(data=stats)
    except Exception as e:
        print(f"Error in batch_analyze: {traceback.format_exc()}")
        return create_response(error=f"批量分析时发生错误: {str(e)}")


@classification_bp.route('/classify/smart_import', methods=['POST'])
def smart_import():
    """
    Parse natural language description into classification schema.
    
    Request body:
        - description: Natural language description of classification schema
        - options: Additional options (optional)
    
    Returns:
        - schema: Parsed classification schema
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    description = req_data.get('description', '')
    options = req_data.get('options', {})
    
    if not description:
        return create_response(error="分类体系描述不能为空")
    
    try:
        system_prompt = """你是一个专业的分类体系设计专家。你的任务是将用户用自然语言描述的分类体系转换为标准的树状结构JSON格式。

你需要：
1. 理解用户描述的分类层级结构
2. 识别每个分类的名称和描述
3. 正确处理多层级嵌套关系
4. 保持分类的完整性和一致性

输出格式必须是有效的JSON，严格按照指定格式输出。"""

        user_prompt = f"""请将以下自然语言描述的分类体系转换为标准的树状JSON结构。

## 用户描述

{description}

## 输出要求

请严格按照以下JSON格式输出分类体系：

```json
{{
  "name": "分类体系名称（根据描述推断）",
  "description": "分类体系整体描述（可选）",
  "categories": [
    {{
      "name": "一级分类名称",
      "description": "该分类的描述或判断标准",
      "children": [
        {{
          "name": "二级分类名称",
          "description": "该分类的描述或判断标准",
          "children": [
            {{
              "name": "三级分类名称",
              "description": "该分类的描述",
              "children": []
            }}
          ]
        }}
      ]
    }}
  ],
  "reasoning": "分类体系设计说明（可选）"
}}
```

## 解析规则

1. **层级识别**：
   - "一级"、"二级"、"三级"等词汇表示层级
   - 缩进、编号（1. 1.1 1.1.1）也表示层级
   - "包含"、"下设"、"分为"等词汇表示父子关系

2. **分类名称**：
   - 提取每个分类的名称
   - 如果用户提供了描述或判断标准，放入description字段

3. **结构处理**：
   - 支持任意层级深度
   - 每个分类项必须包含name和children字段
   - description字段可选，用于存放分类说明
   - 最底层的children为空数组[]

4. **特殊情况**：
   - 如果描述不清晰，根据上下文合理推断
   - 如果没有提供体系名称，根据内容生成合适的名称
   - 保持分类的互斥性和完整性

请确保输出的JSON格式正确，可以直接解析使用。"""

        if options.get('hint'):
            user_prompt += f"\n\n## 补充说明\n{options['hint']}"

        response = client.chat.completions.create(
            model=options.get('model', 'GLM-4.7-Flash'),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        
        json_match = content.split('```json')[-1].split('```')[0] if '```json' in content else content
        if '{' in json_match:
            json_match = '{' + json_match.split('{', 1)[1]
        if '}' in json_match:
            json_match = json_match.rsplit('}', 1)[0] + '}'
        
        parsed_schema = json.loads(json_match)
        
        schema = {
            'id': f'schema_smart_import_{int(__import__("time").time())}',
            'name': parsed_schema.get('name', '智能导入分类体系'),
            'categories': parsed_schema.get('categories', []),
            'model': 'GLM-4.7-Flash',
            'temperature': 0.1,
            'createdAt': __import__("datetime").datetime.now().isoformat(),
            'updatedAt': __import__("datetime").datetime.now().isoformat()
        }
        
        def normalize_categories(categories):
            result = []
            for cat in categories:
                normalized = {
                    'id': f'cat_{int(__import__("time").time() * 1000)}_{__import__("random").randint(100000, 999999)}',
                    'name': cat.get('name', ''),
                    'description': cat.get('description', ''),
                    'children': normalize_categories(cat.get('children', [])),
                    'expanded': True
                }
                result.append(normalized)
            return result
        
        schema['categories'] = normalize_categories(schema['categories'])
        
        return create_response(data={
            'schema': schema,
            'rawContent': content
        })
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return create_response(data={
            'schema': None,
            'rawContent': content if 'content' in dir() else '',
            'parseError': str(e)
        })
    except Exception as e:
        print(f"Error in smart_import: {traceback.format_exc()}")
        return create_response(error=f"智能导入时发生错误: {str(e)}")
