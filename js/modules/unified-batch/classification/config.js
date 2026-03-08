/**
 * 智能分类标引模块 - 配置常量
 */

export const MODEL_CONCURRENCY_LIMITS = {
    'GLM-4.6': 3,
    'GLM-4.6V-FlashX': 3,
    'GLM-4.7': 3,
    'GLM-Image': 1,
    'GLM-Z1-Air': 30,
    'GLM-4.5': 10,
    'embedding-3-pro': 100,
    'GLM-4.6V': 10,
    'GLM-4.7-Flash': 1,
    'GLM-4.7-FlashX': 3,
    'GLM-OCR': 2,
    'GLM-5': 5,
    'GLM-4-Plus': 20,
    'GLM-Z1-Flash': 30,
    'GLM-Z1-AirX': 30,
    'GLM-4.5V': 10,
    'GLM-4.6V-Flash': 1,
    'AutoGLM-Phone': 5,
    'AutoGLM-Phone-Multilingual': 5,
    'GLM-4-0520': 20,
    'Search-Pro': 5,
    'Search-Std': 50,
    'GLM-4.5-Air': 5,
    'GLM-4.5-AirX': 5,
    'GLM-4-AirX': 5,
    'GLM-Realtime': 5,
    'GLM-4-Flash-250414': 5,
    'GLM-4-FlashX-250414': 50,
    'GLM-Realtime-Flash': 5,
    'GLM-Realtime-Air': 5,
    'GLM-4.5-Flash': 2,
    'GLM-4V-Plus-0111': 5,
    'GLM-Zero-Preview': 50,
    'GLM-4-Air': 100,
    'GLM-4-Air-250414': 30,
    'GLM-4-32B-0414-128K': 15,
    'GLM-4-Long': 10,
    'GLM-4-FlashX': 50,
    'GLM-4.1V-Thinking-Flash': 5,
    'GLM-4.1V-Thinking-FlashX': 30,
    'GLM-4-Voice': 5,
    'GLM-4-Flash': 200,
    'GLM-Z1-FlashX': 50,
    'GLM-4-9B': 5,
    'GLM-4V-Plus': 5,
    'GLM-4V-Flash': 10,
    'GLM-4V': 5,
    'Web-Search-Pro': 30,
    'GLM-ASR': 5,
    'Rerank': 50,
    'CogView-4-250304': 5,
    'CogView-3-Plus': 5,
    'CogView-4': 5,
    'CogView-3-Flash': 5,
    'CogView-3': 5,
    'CogVideoX-Flash': 3,
    'CogVideoX': 5,
    'CogVideoX-2': 5,
    'CogTTS-Clone': 2,
    'CogTTS': 5,
    'GLM-TTS': 5,
    'GLM-TTS-Clone': 2,
    'GLM-ASR-2512': 5,
    'ViduQ1-text': 5,
    'Viduq1-Image': 5,
    'Viduq1-Start-End': 5,
    'Vidu2-Image': 5,
    'Vidu2-Start-End': 5,
    'Vidu2-Reference': 5,
    'Embedding-3': 50,
    'Embedding-2': 50,
    'GLM-4-AllTools': 5,
    'GLM-4-Assistant': 5,
    'CodeGeeX-4': 50,
    'GLM-4': 30,
    'CharGLM-4': 5,
    'GLM-3-Turbo': 50,
    'Moderation': 5,
    'CogVideoX-3': 1,
    'GLM-Experimental-Preview': 5
};

export const getConcurrencyForModel = (model) => {
    if (!model) return 1;
    const normalizedName = model.replace(/^glm-/i, 'GLM-').replace(/^GLM-/i, 'GLM-');
    if (MODEL_CONCURRENCY_LIMITS[normalizedName]) {
        return MODEL_CONCURRENCY_LIMITS[normalizedName];
    }
    for (const [key, value] of Object.entries(MODEL_CONCURRENCY_LIMITS)) {
        if (normalizedName.toLowerCase() === key.toLowerCase()) {
            return value;
        }
    }
    return 1;
};

export const ClassificationConfig = {
    MODE_THRESHOLD: 50,
    MODE: {
        ASYNC: 'async',
        BATCH: 'batch',
        AUTO: 'auto'
    },
    ASYNC: {
        POLL_INTERVAL: 5000,
        CONCURRENCY: 5,
        MAX_RETRIES: 3,
        RETRY_DELAY_BASE: 2000
    },
    BATCH: {
        POLL_INTERVAL: 60000,
        AUTO_DOWNLOAD_DELAY: 2000
    },
    INPUT: {
        MAX_COLUMNS: 10,
        MAX_MANUAL_LINES: 100
    },
    LAYER: {
        MIN_LAYERS: 1,
        MAX_LAYERS: 5,
        MAX_LABELS_PER_LAYER: 50
    },
    CONFIDENCE: {
        LOW_THRESHOLD: 0.6,
        MEDIUM_THRESHOLD: 0.8,
        LEVELS: {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high'
        }
    },
    MULTI_LABEL: {
        MAX_LABELS: 5,
        DEFAULT_MAX: 3
    },
    COLD_START: {
        SAMPLE_SIZE: 10,
        MIN_SAMPLE_SIZE: 5
    },
    STORAGE_KEYS: {
        SCHEMAS: 'classification_schemas',
        EXAMPLES: 'classification_examples',
        LAST_STATE: 'classification_last_state',
        HISTORY: 'classification_history'
    }
};

export const DEFAULT_SCHEMA = {
    id: null,
    name: '',
    categories: [],
    model: 'GLM-4.7-Flash',
    temperature: 0.1,
    createdAt: null,
    updatedAt: null
};

export const DEFAULT_CATEGORY = {
    id: '',
    name: '',
    description: '',
    children: [],
    expanded: true
};

export const DEFAULT_LAYER = {
    level: 1,
    name: '',
    description: '',
    labels: [],
    children: [],
    examples: []
};

export const DEFAULT_EXAMPLE = {
    id: null,
    schemaId: null,
    layerLevel: 1,
    input: '',
    correctLabel: '',
    wrongLabel: '',
    type: 'positive',
    confidence: null,
    note: '',
    createdAt: null
};

export const CLASSIFICATION_PROMPT_TEMPLATE = `你是一个专业的分类标引助手。请根据以下分类体系对输入文本进行分类标引。

## 分类体系

{{SCHEMA_DESCRIPTION}}

## 分类原则

{{CLASSIFICATION_RULES}}

## 示例

{{EXAMPLES}}

## 输出要求

请严格按照以下JSON格式输出分类结果：
{
  "classification": {
    {{OUTPUT_FIELDS}}
  },
  "confidence": {
    {{CONFIDENCE_FIELDS}}
  },
  "reasoning": "简要说明分类依据"
}

## 待分类文本

{{INPUT}}

请输出分类结果：`;

export default ClassificationConfig;
