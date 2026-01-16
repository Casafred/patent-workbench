"""
Chat routes for AI conversation.

This module handles both streaming and synchronous chat requests.
"""

import json
import traceback
from flask import Blueprint, request, Response, jsonify
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client

# Create blueprint
chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/stream_chat', methods=['POST'])
def stream_chat():
    """
    Handle streaming chat requests.
    
    This endpoint supports Server-Sent Events (SSE) for real-time streaming responses.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        error_json = json.dumps(error_response.get_json())
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )

    try:
        req_data = request.get_json(silent=True)
        if req_data is None:
            raise ValueError("Request body is not a valid JSON or is empty.")
    except Exception as e:
        error_json = json.dumps({
            "error": {
                "message": f"Invalid request format: {e}",
                "type": "request_error"
            }
        })
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=400
        )

    client, error_response = get_zhipu_client()
    if error_response:
        error_json = json.dumps({"error": error_response.get_json()['error']})
        return Response(
            f"data: {error_json}\n\n",
            mimetype='text/event-stream',
            status=error_response.status_code
        )
    
    def generate():
        """Generator function for streaming responses."""
        try:
            response = client.chat.completions.create(
                model=req_data.get('model'),
                messages=req_data.get('messages'),
                stream=True,
                temperature=req_data.get('temperature'),
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        except Exception as e:
            error_message = json.dumps({
                "error": {
                    "message": str(e),
                    "type": "generation_error"
                }
            })
            yield f"data: {error_message}\n\n"

    return Response(generate(), mimetype='text/event-stream')


@chat_bp.route('/chat', methods=['POST'])
def simple_chat():
    """
    Handle synchronous chat requests.
    
    This endpoint returns a complete response in a single request.
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    req_data = request.get_json()
    model = req_data.get('model')
    messages = req_data.get('messages')
    temperature = req_data.get('temperature', 0.4)
    
    if not all([model, messages]):
        return jsonify({"error": "model and messages are required."}), 400
    
    try:
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
        print(f"Error in simple_chat: {traceback.format_exc()}")
        error_payload = {
            "error": {
                "message": f"同步调用时发生严重错误: {str(e)}",
                "type": "backend_exception"
            }
        }
        return jsonify(error_payload), 500
