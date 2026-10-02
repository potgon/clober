import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.MCP_TOKEN;

if (!TOKEN) {
  console.error("MCP_TOKEN no está definido. El servidor HTTP expondría escritura en /brain sin autenticación. Abortando.");
  process.exit(1);
}

const server = buildServer();
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
await server.connect(transport);

const httpServer = createServer((req, res) => {
  if (req.headers["authorization"] !== `Bearer ${TOKEN}`) {
    res.writeHead(401, { "content-type": "text/plain" }).end("unauthorized");
    return;
  }
  if (req.method !== "POST" || req.url !== "/mcp") {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : undefined;
    } catch {
      res.writeHead(400, { "content-type": "text/plain" }).end("invalid json");
      return;
    }
    try {
      await transport.handleRequest(req, res, parsed);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" }).end("internal error");
      console.error(err);
    }
  });
});

httpServer.listen(PORT, () => {
  console.error(`clober-brain MCP escuchando en http://localhost:${PORT}/mcp (requiere Bearer token)`);
});
