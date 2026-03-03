## IPC分类查询功能集成方案

### 一、功能概述

新增"功能九：IPC分类智能查询"标签页，集成 WIPO IPCCAT API，提供以下功能：
1. **IPC分类预测**：输入技术描述，自动预测IPC分类号
2. **IPC分类树浏览**：层级展示A-H八个部的分类结构
3. **IPC关键词搜索**：关键词搜索相关IPC分类
4. **与专利详情联动**：点击IPC号跳转查看详情

### 二、文件结构

```
新增文件：
├── backend/routes/ipc.py                    # 后端API路由
├── frontend/components/tabs/ipc-lookup.html # 前端标签页组件
├── frontend/css/pages/ipc-lookup.css        # 样式文件
├── js/modules/ipc/
│   ├── ipc-core.js                          # 核心功能
│   ├── ipc-search.js                        # 搜索功能
│   ├── ipc-tree.js                          # 树形浏览
│   └── ipc-init.js                          # 初始化模块
└── js/modules/init/init-ipc.js              # 主初始化入口

修改文件：
├── backend/routes/__init__.py               # 注册新蓝图
├── backend/config/tabs_config.json          # 添加新标签页配置
├── frontend/components/tab-navigation.html  # 添加新标签按钮
├── frontend/index.html                      # 添加组件容器和脚本引用
└── frontend/css/main.css                    # 导入新样式
```

### 三、实现步骤

#### 步骤1：后端API开发 (backend/routes/ipc.py)
- 创建 `/api/ipc/predict` - IPC分类预测接口
- 创建 `/api/ipc/tree` - 获取IPC分类树
- 创建 `/api/ipc/search` - 关键词搜索接口
- 创建 `/api/ipc/detail` - 获取分类详情
- 添加请求限流和缓存机制

#### 步骤2：前端标签页组件 (frontend/components/tabs/ipc-lookup.html)
- 子标签页导航（预测/浏览/搜索）
- IPC预测界面：文本输入、参数选择、结果展示
- IPC树形浏览：可展开的层级结构
- IPC搜索界面：关键词搜索、结果列表

#### 步骤3：CSS样式 (frontend/css/pages/ipc-lookup.css)
- 与现有风格一致的绿色主题
- 树形结构样式
- 搜索结果卡片样式
- 响应式布局

#### 步骤4：JS模块开发
- `ipc-core.js`：API调用、状态管理
- `ipc-search.js`：搜索功能实现
- `ipc-tree.js`：树形浏览实现
- `ipc-init.js`：模块初始化

#### 步骤5：集成配置
- 更新标签页配置
- 注册后端蓝图
- 添加前端脚本引用

#### 步骤6：测试验证
- 测试API连接
- 测试各功能模块
- 测试与专利详情页联动

### 四、API设计

```
GET /api/ipc/predict
  参数：q(文本), lang(语言), level(层级), limit(数量)
  返回：预测的IPC分类列表

GET /api/ipc/tree
  参数：version(IPC版本), level(层级), key(节点key)
  返回：分类树节点数据

GET /api/ipc/search
  参数：q(关键词), version, lang
  返回：匹配的IPC分类列表

GET /api/ipc/detail
  参数：symbol(IPC符号), version, lang
  返回：分类详细信息
```

### 五、注意事项

1. WIPO API有调用频率限制，需在后端实现限流
2. 添加结果缓存，减少重复请求
3. 错误处理和用户提示
4. 中文语言支持