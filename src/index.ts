import { timingSafeEqual } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const PORT = Number(process.env.PORT ?? 3000);
const TOKEN = process.env.MCP_AUTH_TOKEN ?? "";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && TOKEN.length < 32) {
  throw new Error("MCP_AUTH_TOKEN must be set to a private random value of at least 32 characters.");
}
if (!isProduction && !TOKEN) {
  console.warn("MCP_AUTH_TOKEN is not set. The /mcp endpoint will reject requests until one is configured.");
}

const allowedHosts = (process.env.ALLOWED_HOSTS ?? "localhost,127.0.0.1")
  .split(",").map((value) => value.trim()).filter(Boolean);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);

function tokenMatches(candidate: string): boolean {
  if (!TOKEN || !candidate) return false;
  const expected = Buffer.from(TOKEN, "utf8");
  const received = Buffer.from(candidate, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function createUniversalServer() {
  const server = new McpServer({
    name: "universal-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "server_status",
    {
      title: "Server status",
      description: "Returns the shared MCP server name, version, and available tool categories. Does not expose secrets.",
      inputSchema: z.object({})
    },
    async () => ({
      content: [{
        type: "text",
        text: JSON.stringify({
          name: "Universal MCP",
          version: "1.0.0",
          transport: "Streamable HTTP",
          categories: ["status", "safe-calculation", "text-analysis"],
          note: "All connected AI clients receive the same shared tools."
        }, null, 2)
      }]
    })
  );

  server.registerTool(
    "calculate",
    {
      title: "Basic calculator",
      description: "Performs one basic arithmetic operation on two finite numbers. Does not evaluate code or expressions.",
      inputSchema: z.object({
        operation: z.enum(["add", "subtract", "multiply", "divide"]),
        a: z.number().finite(),
        b: z.number().finite()
      })
    },
    async ({ operation, a, b }) => {
      if (operation === "divide" && b === 0) {
        return { isError: true, content: [{ type: "text", text: "Division by zero is not allowed." }] };
      }
      const result = operation === "add" ? a + b
        : operation === "subtract" ? a - b
        : operation === "multiply" ? a * b
        : a / b;
      return {
        content: [{ type: "text", text: JSON.stringify({ operation, a, b, result }) }]
      };
    }
  );

  server.registerTool(
    "analyze_text",
    {
      title: "Analyze text",
      description: "Counts characters, words, and lines in supplied text. Text is processed in memory and is not saved.",
      inputSchema: z.object({
        text: z.string().max(20000)
      })
    },
    async ({ text }) => {
      const trimmed = text.trim();
      const words = trimmed ? trimmed.split(/\s+/u).length : 0;
      const lines = text.length ? text.split(/\r?\n/u).length : 0;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            characters: text.length,
            charactersWithoutWhitespace: text.replace(/\s/gu, "").length,
            words,
            lines
          })
        }]
      };
    }
  );

  return server;
}

const mcpHandler = createMcpHandler(() => createUniversalServer());
const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts,
  ...(allowedOrigins.length ? { allowedOrigins } : {})
});
const nodeHandler = toNodeHandler(mcpHandler);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "universal-mcp", version: "1.0.0" });
});

app.all("/mcp", (req, res, next) => {
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/iu.exec(header);
  const candidate = match?.[1] ?? "";
  if (!tokenMatches(candidate)) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "Unauthorized. A valid bearer token is required." });
    return;
  }
  next();
}, (req, res) => {
  void nodeHandler(req, res, req.body);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Universal MCP server listening on port ${PORT}`);
  console.log(`MCP endpoint: /mcp | Health endpoint: /health`);
});
