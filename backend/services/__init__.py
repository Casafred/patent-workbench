"""Service layer for business logic."""

from .auth_service import AuthService
from .api_service import get_zhipu_client
from .file_parser_service import FileParserService
from .llm_service import (
    get_llm_client,
    get_zhipu_client as get_zhipu_client_unified,
    get_aliyun_client,
    get_provider_from_request,
    is_aliyun_model,
    is_aliyun_thinking_only_model,
    build_aliyun_request_params,
    get_default_model,
    ALIYUN_MODELS,
    ALIYUN_THINKING_ONLY_MODELS
)

__all__ = [
    'AuthService',
    'get_zhipu_client',
    'FileParserService',
    'get_llm_client',
    'get_aliyun_client',
    'get_provider_from_request',
    'is_aliyun_model',
    'is_aliyun_thinking_only_model',
    'build_aliyun_request_params',
    'get_default_model',
    'ALIYUN_MODELS',
    'ALIYUN_THINKING_ONLY_MODELS'
]
