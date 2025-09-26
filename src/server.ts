
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "../package.json";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: packageJson.name,
  version: packageJson.version
}, {
  capabilities: {
    tools: {}
  },
  instructions: `
# Source Map Parser MCP Server

这是一个专门用于解析 JavaScript 错误堆栈跟踪的 MCP 服务器，通过 Source Map 将压缩/混淆后的错误位置映射回原始源代码位置。

## 主要功能

### parse_stack 工具
解析错误堆栈跟踪，将压缩代码中的行号列号映射到原始源代码位置。

**使用场景：**
- 生产环境错误调试
- 压缩代码错误定位
- 源代码映射分析

**参数说明：**
- \`stacks\`: 堆栈跟踪对象数组，每个对象包含：
  - \`line\`: 错误所在行号
  - \`column\`: 错误所在列号
  - \`sourceMapUrl\`: 对应的 Source Map 文件 URL

**返回结果：**
- 成功时返回映射后的源代码位置和上下文代码
- 失败时返回错误信息

## 环境变量配置

- \`SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE\`: 设置源代码上下文行数（默认: 1）
- \`SOURCE_MAP_PARSER_RESOURCE_CACHE_MAX_SIZE\`: 缓存大小限制（默认: 200MB）

## 使用示例

\`\`\`json
{
  "tool": "parse_stack",
  "arguments": {
    "stacks": [
      {
        "line": 1,
        "column": 1234,
        "sourceMapUrl": "https://example.com/assets/main.js.map"
      }
    ]
  }
}
\`\`\`

该工具特别适用于调试生产环境中的 JavaScript 错误，能够快速定位到原始源代码中的具体位置。
  `.trim()
});

// Register tools with contextOffsetLine from environment variable
registerTools(server, {
  contextOffsetLine: process.env.SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE ? parseInt(process.env.SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE) : 1,
});

export default server;