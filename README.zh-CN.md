# Source Map 解析器

[![smithery badge](https://smithery.ai/badge/@MasonChow/source-map-parser-mcp)](https://smithery.ai/server/@MasonChow/source-map-parser-mcp)

🌐 **语言**: [English](README.md) | [简体中文](README.zh-CN.md)

本项目实现了一个基于 WebAssembly 的 Source Map 解析器，能够将 JavaScript 错误堆栈信息映射回源代码，并提取相关的上下文信息，开发者可以方便地将 JavaScript 错误堆栈信息映射回源代码，快速定位和修复问题。希望本项目的文档能帮助开发者更好地理解和使用该工具

## MCP 串接

> 注意: 需要 Node.js 18+ 版本支持

方式一：NPX 直接运行

```bash
npx -y source-map-parser-mcp@latest
```

方式二：下载构建产物

从 [GitHub Release](https://github.com/MasonChow/source-map-parser-mcp/releases) 页面下载对应版本的构建产物，然后运行：

```bash
node dist/main.es.js
```

## 功能概述

1. **堆栈解析**：根据提供的行号、列号和 Source Map 文件，解析出对应的源代码位置。
2. **批量解析**：支持同时解析多个堆栈信息，返回批量结果。
3. **上下文提取**：可以提取指定行数的上下文代码，帮助开发者更好地理解错误发生的环境。

## MCP 服务工具说明

### `operating_guide`

获取 MCP 服务的使用说明。提供到通过聊天交互的方式了解到该 MCP 服务如何使用

### `parse_stack`

传入堆栈信息和 Source Map 地址进行解析。

#### 请求示例

- stacks ：堆栈信息，包含行号、列号和 Source Map 地址。
  - line ：行号，必填。
  - column ：列号，必填。
  -
- ctxOffset ：上下文行数，默认值为 5。

```json
{
  "stacks": [
    {
      "line": 10,
      "column": 5,
      "sourceMapUrl": "https://example.com/source.map"
    }
  ],
  "ctxOffset": 5
}
```

```json
{
  "stacks": [
    {
      "line": 10,
      "column": 5,
      "sourceMapUrl": "https://example.com/source.map"
    }
  ],
  "ctxOffset": 5
}
```

#### 响应示例

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"success\":true,\"token\":{\"line\":10,\"column\":5,\"sourceCode\":[{\"line\":8,\"isStackLine\":false,\"raw\":\"function foo() {\"},{\"line\":9,\"isStackLine\":false,\"raw\":\"  console.log('bar');\"},{\"line\":10,\"isStackLine\":true,\"raw\":\"  throw new Error('test');\"},{\"line\":11,\"isStackLine\":false,\"raw\":\"}\"}],\"src\":\"index.js\"}}]"
    }
  ]
}
```

### 4. 解析结果说明

- `success`：表示解析是否成功。
- `token`：解析成功时返回的 Token 对象，包含源代码行号、列号、上下文代码等信息。
- `error`：解析失败时返回的错误信息。

## 进阶用法

部分团队出于安全性或性能考虑，不希望直接将 Source Map 暴露给浏览器进行解析，而是对 Source Map 的上传路径进行一定的处理。例如，将路径 `/assets/index.js` 转换为 `source_backup/index.js.map`。

在这种情况下，可以通过提示词规则引导模型完成路径转换。

### 提示词示例

```markdown
**Source Map 工具使用指南**

以下是 Source Map 远程地址的解析规则，其中 `origin_url` 表示堆栈中的错误地址。

1. 根据堆栈的源码路径，替换 Source Map 的资源地址：
   `https://example.com${origin_url.replace('/assets/', '/source_backup/')}.map`

2. 如果所有规则均未匹配成功，则使用以下回退规则：
   `${origin_url}.map` 并重新尝试。
```

## FAQ

### 1. WebAssembly 模块加载失败

如果工具返回以下错误信息，请按照以下步骤排查问题：

> parser init error: WebAssembly.instantiate(): invalid value type 'externref', enable with --experimental-wasm-reftypes @+86

1. **检查 Node.js 版本**：确保 Node.js 版本为 18 或更高。如果版本低于 18，请升级 Node.js。
2. **启用实验性标志**：如果 Node.js 版本为 18+ 但仍然遇到问题，请使用以下命令启动工具：
   ```bash
   npx --node-arg=--experimental-wasm-reftypes -y source-map-parser-mcp@latest
   ```

## 本地开发指南

### 1. 安装依赖

确保已安装 Node.js 和 npm，然后运行以下命令安装项目依赖：

```bash
npm install
```

### 2. 链接 MCP 服务

运行以下命令启动 MCP 服务器：

```bash
npx tsx src/main.ts
```

### 内部逻辑概要

#### 1. 主要文件说明

- **`stack_parser_js_sdk.js`**：WebAssembly 模块的 JavaScript 封装，提供了堆栈解析的核心功能。
- **`parser.ts`**：解析器的主要实现，负责初始化 WebAssembly 模块、获取 Source Map 内容并解析堆栈信息。
- **`server.ts`**：MCP 服务器的实现，提供了 `parse_stack` 工具接口，供外部调用。

#### 2. 修改解析逻辑

如果需要修改解析逻辑，可以编辑 `parser.ts` 文件中的 `getSourceToken` 方法。

#### 3. 添加新工具

在 `server.ts` 文件中，可以通过 `server.tool` 方法添加新的工具接口。

## 注意事项

1. **Source Map 文件**：确保提供的 Source Map 文件地址可访问，且文件格式正确。
2. **上下文行数**：`ctxOffset` 参数控制提取的上下文行数，建议根据实际需求调整。
3. **错误处理**：解析过程中可能会遇到网络错误、文件格式错误等问题，建议在调用时做好错误处理。

## 贡献指南

欢迎提交 Issue 和 Pull Request，共同改进本项目。

## 许可证

本项目采用 MIT 许可证，详情请参阅 [LICENSE](LICENSE) 文件。
