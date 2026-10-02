import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";
import { type CoreMessage, parseSidecarMessage, type SidecarMessage } from "@clober/shared";
import { type WebSocket, WebSocketServer } from "ws";

export const DEFAULT_PORT = 7531;
const HOST = "127.0.0.1";

export interface LocalServerOptions {
  /** 0 picks a free port (tests). */
  port: number;
  token: string;
  onSidecarMessage: (message: SidecarMessage) => void;
  onSidecarStatus?: (connected: boolean) => void;
  onInvalidMessage?: (error: string) => void;
}

export interface LocalServer {
  readonly port: number;
  sendToSidecar(message: CoreMessage): boolean;
  close(): Promise<void>;
}

/**
 * HTTP + WebSocket server bound to 127.0.0.1 only (PLAN.md §3.2).
 * Rejects any request whose Host is not this server, so web pages cannot
 * reach it through DNS rebinding, and requires the local token on /audio.
 */
export async function startLocalServer(options: LocalServerOptions): Promise<LocalServer> {
  let port = options.port;
  let sidecar: WebSocket | null = null;
  const wss = new WebSocketServer({ noServer: true });

  const hostAllowed = (req: IncomingMessage) =>
    req.headers.host === `${HOST}:${port}` || req.headers.host === `localhost:${port}`;

  const http = createServer((req, res) => {
    if (!hostAllowed(req)) {
      res.writeHead(403).end();
      return;
    }
    // The dock UI is served here from F1.12.
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("Clober core\n");
  });

  const reject = (socket: Duplex, status: number, text: string) => {
    socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  };

  http.on("upgrade", (req, socket, head) => {
    const path = new URL(req.url ?? "/", "http://local").pathname;
    if (!hostAllowed(req)) return reject(socket, 403, "Forbidden");
    if (path !== "/audio") return reject(socket, 404, "Not Found");
    if (req.headers["x-clober-token"] !== options.token) return reject(socket, 401, "Unauthorized");
    if (sidecar) return reject(socket, 409, "Conflict");

    wss.handleUpgrade(req, socket, head, (ws) => {
      sidecar = ws;
      options.onSidecarStatus?.(true);
      ws.on("message", (data) => {
        const parsed = parseSidecarMessage(data.toString());
        if (parsed.ok) options.onSidecarMessage(parsed.value);
        else options.onInvalidMessage?.(parsed.error);
      });
      ws.on("close", () => {
        if (sidecar === ws) sidecar = null;
        options.onSidecarStatus?.(false);
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(options.port, HOST, () => resolve());
  });
  port = (http.address() as AddressInfo).port;

  return {
    port,
    sendToSidecar(message) {
      if (!sidecar || sidecar.readyState !== sidecar.OPEN) return false;
      sidecar.send(JSON.stringify(message));
      return true;
    },
    async close() {
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
