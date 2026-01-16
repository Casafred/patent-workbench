# 数据结构修复说明

## 问题

前端代码期望的数据结构与后端返回的不匹配：

### 后端返回的结构
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_cells_processed": 10,
      "total_claims_extracted": 20,
      "independent_claims_count": 5,
      "dependent_claims_count": 15,
      "language_distribution": {...},
      "error_count": 0
    },
    "claims": [
      {
        "claim_number": 1,
        "claim_type": "independent",
        "claim_text": "...",
        "language": "zh",
        "referenced_claims": [],
        "confidence_score": 0.95
      }
    ],
    "errors": []
  }
}
```

### 前端期望的结构（错误）
```javascript
result.total_cells_processed  // ❌ 错误
result.claims_data            // ❌ 错误
```

### 正确的访问方式
```javascript
result.summary.total_cells_processed  // ✅ 正确
result.claims                         // ✅ 正确
```

## 修复内容

### 1. loadClaimsResults 函数
```javascript
// 修复前
const result = responseData.result || data.result;
claimsProcessedData = result;
displayClaimsResults(result);

// 修复后
// 后端返回的结构是 {summary: {...}, claims: [...], errors: [...]}
claimsProcessedData = responseData;
displayClaimsResults(responseData);
```

### 2. displayClaimsResults 函数
```javascript
// 修复前
document.getElementById('claims_stat_cells').textContent = result.total_cells_processed || 0;
result.claims_data.forEach(claim => {...});

// 修复后
const summary = result.summary || {};
const claims = result.claims || [];
document.getElementById('claims_stat_cells').textContent = summary.total_cells_processed || 0;
claims.forEach(claim => {...});
```

## 测试步骤

1. **刷新浏览器页面** (Ctrl+F5 或 Cmd+Shift+R) 以加载更新后的 JavaScript
2. 重新上传文件并处理
3. 确认结果正确显示

## 已修复的文件

- `js/claimsProcessorIntegrated.js`
