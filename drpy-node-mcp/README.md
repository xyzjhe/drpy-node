# drpy-node MCP Server

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 实现的辅助服务，旨在帮助 AI 助手更方便地维护 `drpy-node` 项目。

通过这个 MCP 服务，AI 可以直接安全地访问项目文件系统、管理爬虫源、检查路由信息以及执行基本的运维操作。

## 目录

- [drpy-node MCP Server](#drpy-node-mcp-server)
  - [目录](#目录)
  - [安装与运行](#安装与运行)
    - [1. 安装依赖](#1-安装依赖)
    - [2. 运行服务](#2-运行服务)
  - [客户端配置 (Trae/Claude Desktop)](#客户端配置-traeclaude-desktop)
  - [可用工具 (Tools)](#可用工具-tools)
    - [文件系统操作](#文件系统操作)
    - [爬虫源管理](#爬虫源管理)
    - [高级开发工具 (New)](#高级开发工具-new)
    - [系统维护](#系统维护)
  - [AI 交互示例 (Best Practice)](#ai-交互示例-best-practice)
  - [配置说明](#配置说明)

## 安装与运行

本服务位于项目的 `drpy-node-mcp` 目录下，拥有独立的依赖环境。

### 1. 安装依赖

初次使用前，请确保在 `drpy-node-mcp` 目录下安装了必要的 Node.js 依赖：

```bash
cd drpy-node-mcp
npm install
```

### 2. 运行服务

该服务使用 Stdio 传输协议，通常由支持 MCP 的客户端（如 Claude Desktop、Cursor、VS Code 插件等）自动启动。

如果需要手动调试运行：

```bash
node index.js
```

## 客户端配置 (Trae/Claude Desktop)

要将此 MCP 服务添加到 Trae 或其他支持 MCP 的客户端，请在客户端的 MCP 配置文件（通常是 `config.json`）中添加以下内容：

```json
{
  "mcpServers": {
    "drpy-node-mcp": {
      "command": "node",
      "args": [
        "E:/gitwork/drpy-node/drpy-node-mcp/index.js"
      ]
    }
  }
}
```

> **注意**: 请确保 `args` 中的路径是您本地机器上 `index.js` 的绝对路径。

## 可用工具 (Tools)

本服务提供以下工具供 AI 调用：

### 文件系统操作

*   **`list_directory`**
    *   **描述**: 列出项目中的文件和目录。
    *   **参数**: `path` (可选，默认为项目根目录 `.`)
    *   **用途**: 探索项目结构。

*   **`read_file`**
    *   **描述**: 读取指定文件的内容。
    *   **参数**: `path` (必填，相对于项目根目录的文件路径)
    *   **用途**: 读取代码、配置文件等。

*   **`write_file`**
    *   **描述**: 写入内容到文件（如果目录不存在会自动创建）。
    *   **参数**:
        *   `path` (必填)
        *   `content` (必填)
    *   **用途**: 修改代码、新建文件。

*   **`delete_file`**
    *   **描述**: 删除指定的文件或目录。
    *   **参数**: `path` (必填)
    *   **用途**: 清理废弃文件。

### 爬虫源管理

*   **`list_sources`**
    *   **描述**: 专门列出 `spider/js/` 和 `spider/catvod/` 目录下的所有爬虫源文件。
    *   **参数**: 无
    *   **用途**: 快速获取当前项目中的所有爬虫源列表，无需遍历整个目录。

*   **`check_syntax`**
    *   **描述**: 检查指定 JavaScript 文件的语法是否正确（使用 `node --check`）。
    *   **参数**: `path` (必填)
    *   **用途**: 在修改或创建 JS 文件后，验证是否存在语法错误。

### 高级开发工具 (New)

*   **`fetch_spider_url`**
    *   **描述**: 使用 `drpy-node` 的请求库抓取 URL 内容，支持自定义 Header 和 Method。
    *   **参数**:
        *   `url` (必填): 目标 URL。
        *   `options` (可选): 请求配置对象。
            *   `method`: HTTP 方法 (GET, POST)。
            *   `headers`: 请求头 (User-Agent, Cookie, Referer 等)。
            *   `data`: 请求体数据 (POST 数据)。
    *   **用途**: AI 在编写源之前，先调用此工具确认网站的可访问性，测试反爬策略（如是否需要特定 UA 或 Cookie），并获取原始内容以供分析。

*   **`debug_spider_rule`**
    *   **描述**: 调试 drpy 爬虫规则，支持解析 HTML 内容或在线抓取 URL。
    *   **参数**: 
        *   `html` (可选): 需要解析的 HTML 文本内容。
        *   `url` (可选): 需要抓取的网页 URL（若未提供 `html`，则会自动请求此 URL）。
        *   `rule` (必填): drpy 解析规则 (如 `.list li`, `a&&href`, `body&&Text`)。
        *   `mode` (必填): 解析模式，可选 `pdfa` (列表), `pdfh` (HTML), `pd` (URL)。
        *   `baseUrl` (可选): 用于拼接相对链接的基础 URL。
        *   `options` (可选): 请求配置 (method, headers, data)。
    *   **用途**: AI 在编写或修复源时，可直接使用此工具验证选择器是否正确，无需运行完整爬虫。

*   **`get_spider_template`**
    *   **描述**: 获取标准的 `drpy` JS 爬虫源模板代码。
    *   **参数**: 无
    *   **特性**: 
        *   **默认使用基础写法**: `一级`, `二级`, `搜索`, `推荐` 均采用字符串/对象规则，简单易懂。
        *   **保留高级选项**: 包含注释掉的 `async function` 模板，供复杂场景（如动态加载、加密参数）使用。
    *   **用途**: AI 创建新源时，优先使用基础模板；仅在基础规则无法满足需求时，才启用高级异步函数。

*   **`get_drpy_libs_info`**
    *   **描述**: 获取 `drpy-node` 运行环境中可用的全局变量、辅助函数及开发规范。
    *   **参数**: 无
    *   **包含信息**:
        *   全局函数: `request`, `pdfa`, `pdfh`, `ungzip`, `$.require` 等
        *   开发规范: 明确指出优先使用字符串/对象规则，避免滥用异步函数。
        *   上下文变量 (`this`): `input`, `MY_PAGE`, `MY_CATE` 等
        *   第三方库: `Cheerio`, `CryptoJS`, `Underscore`
    *   **用途**: 帮助 AI 了解当前的沙箱环境支持哪些能力，以便正确使用 `this` 上下文和内置库。

*   **`validate_spider`**
    *   **描述**: 对爬虫源文件进行深度校验，包括 JS 语法检查和 `drpy` 规则结构检查。
    *   **参数**: `path` (必填)
    *   **检查项**:
        *   JS 语法正确性 (`node --check`)
        *   `rule` 对象及必要字段 (`title`, `url`) 存在性
        *   高级特性检测: 异步解析函数、代理规则 (`proxy_rule`)、本地导入 (`$.require`)
        *   逻辑一致性: `filterable` 与 `filter_def` 的对应关系
    *   **用途**: 在编写完源文件后，进行最终的质量把关，确保源码符合 drpy-node 的运行规范。

### 系统维护

*   **`get_routes_info`**
    *   **描述**: 分析 `controllers/index.js`，返回当前系统注册的所有 Fastify 路由控制器信息。
    *   **参数**: 无
    *   **用途**: 帮助 AI 理解当前的 API 和页面路由结构。

*   **`restart_service`**
    *   **描述**: 尝试通过 PM2 重启 `drpys` 服务。
    *   **参数**: 无
    *   **注意**: 仅在服务器环境安装了 PM2 且服务名为 `drpys` 时有效。

## AI 交互示例 (Best Practice)

配置完成后，您可以直接用自然语言向 AI 提出需求，AI 会自动选择合适的工具。以下是几个典型场景：

### 场景 1：修改现有爬虫源

**用户指令**:
> "请帮我检查一下 '360影视[官].js' 这个源，把它的 api 地址更新为 'https://new-api.360.com'，修改完记得检查一下语法。"

**AI 执行流程**:
1.  调用 `list_sources` 确认文件名。
2.  调用 `read_file` 读取 `spider/js/360影视[官].js` 的内容。
3.  在内存中修改代码。
4.  调用 `write_file` 将新代码写回。
5.  调用 `check_syntax` 确保没有引入语法错误。

### 场景 2：排查服务启动问题

**用户指令**:
> "我最近加了几个新路由，但是服务启动好像有问题，帮我看看现在注册了哪些控制器，然后重启一下服务。"

**AI 执行流程**:
1.  调用 `get_routes_info` 获取当前 `controllers/index.js` 中的注册信息。
2.  向用户汇报发现的路由。
3.  调用 `restart_service` 重启 PM2 服务。

### 场景 3：创建新源

**用户指令**:
> "在 js 目录下帮我新建一个名为 'test_spider.js' 的源，写入一个基础的 drpy 模板。"

**AI 执行流程**:
1.  调用 `write_file` 创建 `spider/js/test_spider.js` 并写入模板代码。
2.  调用 `list_sources` 确认文件已创建。

### 场景 4：智能创建与校验爬虫源 (New)

**用户指令**:
> "我要写一个新网站的源，网站叫 '酷酷影视'，首页是 'https://kuku.com'。需要支持二级页面的异步解析，并且有防盗链处理。请用 drpy 模板帮我写好结构，如果不确定环境里有哪些库，先查一下。"

**AI 执行流程**:
1.  调用 `get_spider_template` 获取标准模板。
2.  调用 `get_drpy_libs_info` 确认 `pdfh` 等函数是否可用。
3.  基于模板和用户提供的网址，生成代码并调用 `write_file` 写入 `spider/js/酷酷影视.js`。
4.  最后调用 `validate_spider` 对新文件进行语法和结构双重检查，确保可以直接运行。

## 配置说明

*   **安全限制**: 所有文件操作都被限制在 `drpy-node` 项目根目录下，无法访问项目外部的文件。
*   **依赖**: 本服务依赖于 `@modelcontextprotocol/sdk`, `fs-extra`, `zod` 等库。
