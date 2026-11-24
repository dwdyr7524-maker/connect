# Universal MCP server

This branch contains a first working implementation of a shared remote MCP server.

## Important: keep the original app safe

The default `main` branch remains the original Claude Connect project. This implementation lives on the separate `mcp-server` branch so it does not replace the app.

## Included tools

- `server_status` — returns server name, version, and available tool categories.
- `calculate` — performs safe arithmetic on two finite numbers.
- `analyze_text` — counts characters, words, and lines; text is not persisted.

The same endpoint can serve multiple independent MCP clients. It does not synchronize provider chats or memories.

## Runtime

- Node.js 22+
- TypeScript
- MCP TypeScript SDK v2
- Streamable HTTP
- Express adapter

## Environment variables

Configure these in the hosting provider's private environment/secrets panel:

- `MCP_AUTH_TOKEN`: a private random bearer token of at least 32 characters.
- `NODE_ENV=production`
- `PORT`: supplied by the host (the app defaults to 3000).
- `ALLOWED_HOSTS`: exact hostname assigned by the hosting provider, without protocol, path, or port.
- `ALLOWED_ORIGINS`: leave empty unless a browser-based client needs an allowed origin.

Never commit a real token or API key. The `.env.example` file contains placeholders only.

## Build and run

```sh
npm install
npm run typecheck
npm run build
npm start
```

- Health check: `/health`
- MCP endpoint: `/mcp`

The MCP endpoint requires `Authorization: Bearer <MCP_AUTH_TOKEN>`.

## Deployment

Deploy the `mcp-server` branch as a Node.js web service with HTTPS:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Add the environment variables above as host secrets/settings.

The public endpoint is the assigned HTTPS service URL followed by `/mcp`. Do not share the token in a public issue, chat, source file, or screenshot.

## Current limitations

This first version has no persistent database, no provider API keys, and no tools that can write to GitHub or change files. Those capabilities can be added later with separate per-tool permissions and explicit approval.
