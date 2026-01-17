# 项目目录大清理计划 2026

## 🚨 当前问题分析

### 根目录混乱状况
- **44个 .md 文档文件** 散落在根目录
- **13个 test_*.py 测试文件** 未归类
- **多个临时/调试文件** 需要清理
- **重复文档** 需要合并
- **过时文件** 需要删除

## 📋 清理计划

### 第一阶段：文档整理

#### 1. 部署相关文档 → `docs/deployment/`
- DEPLOYMENT_CHECKLIST.md
- DEPLOYMENT_STATUS.md
- RENDER_DEPLOYMENT_GUIDE.md
- RENDER_DEPLOYMENT_SUMMARY.md
- 如何部署到Render.md
- 部署完成.md
- 修复部署错误说明.md
- 紧急修复-Render配置.md

#### 2. 功能修复文档 → `docs/fixes/`
- CLAIMS_EXPORT_ENHANCEMENT_COMPLETE.md
- CLAIMS_EXPORT_ENHANCEMENT_FINAL.md
- CLAIMS_EXPORT_FIX_VERIFICATION.md
- CLAIMS_FIX_VERIFICATION.md
- 功能七修复用户指南.md
- 功能七修复部署状态.md
- 功能七完整性分析报告.md
- 功能七导出修复完成.md
- 功能七更新通知.md
- 完整修复指南.md
- 导出功能修复说明.md
- 导出功能调试指南.md
- 权利要求处理器修复总结.md
- 登录问题解决方案.md
- 紧急修复-添加调试日志.md
- 语法错误修复说明.md

#### 3. 功能说明文档 → `docs/features/`
- API_KEY_设计说明.md
- 任务持久化功能说明.md
- 智能列识别功能说明.md
- 应用文件关系说明.md

#### 4. 项目管理文档 → `docs/project/`
- PROJECT_REFACTORING_COMPLETE.md
- PATENT_QUERY_INTEGRATION_COMPLETE.md
- PATENT_QUERY_VISUALIZATION_PROGRESS.md
- SPEC_DOCUMENTATION_COMPLETE.md
- CSS_FIX_APPLIED.md
- CSS_IMPROVEMENTS_SUMMARY.md
- DIRECTORY_CLEANUP_COMPLETE.md

#### 5. 用户指南文档 → `docs/guides/`
- 快速开始.md
- 文档更新说明.md
- 替换GitHub仓库代码步骤.md
- 专利查询功能修复部署状态.md
- 专利查询功能部署问题解决方案.md
- 修复完成-等待部署.md

#### 6. 保留在根目录
- README.md (主要说明)
- QUICK_DEPLOY.md (快速部署)
- TEST_RESULTS.md (测试结果)

### 第二阶段：测试文件整理

#### 移动到 `tests/` 目录
- test_claims_fix.py
- test_claims_processor_functionality.py
- test_claims_with_auth.py
- test_column_detection.py
- test_complete_extraction.py
- test_export_bytesio.py
- test_export_enhancement.py
- test_export_fix.py
- test_export_http.py
- test_integrated_functionality.py
- test_patent_query_api.py
- test_sequence_restart_detection.py
- test_visualization_demo.py

### 第三阶段：临时文件清理

#### 需要删除的文件
- .hypothesis/ 目录 (测试缓存)
- __pycache__/ 目录 (Python缓存)
- 重复的备份文件

## 🎯 预期效果

### 整理前
```
根目录: 60+ 个文件
├── 44个 .md 文档
├── 13个 test_*.py 文件
├── 多个临时文件
└── 核心文件
```

### 整理后
```
根目录: 10个核心文件
├── README.md
├── QUICK_DEPLOY.md
├── TEST_RESULTS.md
├── app.py
├── app_new.py
├── requirements.txt
├── setup.py
├── pytest.ini
├── users.json
└── wsgi.py

docs/
├── deployment/     # 部署文档 (8个)
├── fixes/          # 修复文档 (16个)
├── features/       # 功能文档 (4个)
├── project/        # 项目文档 (7个)
├── guides/         # 用户指南 (6个)
└── README.md       # 文档索引

tests/              # 所有测试文件 (25个)
```

## 📊 改进指标

| 指标 | 当前 | 目标 | 改进 |
|------|------|------|------|
| 根目录文件数 | 60+ | 10 | ↓ 83% |
| 文档分类 | 无 | 5类 | ✅ |
| 测试集中度 | 分散 | 集中 | ✅ |
| 查找效率 | 低 | 高 | ✅ |
