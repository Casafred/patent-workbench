/**
 * 智能分类标引模块 - 配置常量
 */

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
    layers: [],
    multiLabel: false,
    maxLabels: 1,
    model: 'GLM-4.7-Flash',
    temperature: 0.1,
    createdAt: null,
    updatedAt: null
};

export const DEFAULT_LAYER = {
    level: 1,
    name: '',
    description: '',
    labels: [],
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
