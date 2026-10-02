import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readState, updateState, logDecision, searchBrain, STATE_FILES } from "./core.js";

export function buildServer() {
  const server = new McpServer({ name: "clober-brain", version: "1.0.0" });

  server.registerTool(
    "read_state",
    {
      title: "Read state",
      description:
        "Lee un archivo del project brain de Clober, ruta relativa a /brain " +
        "(ej: 'INDEX.md', 'state/features.md', 'decisions/2026-09-14-....md').",
      inputSchema: { path: z.string().describe("ruta relativa a /brain") },
    },
    async ({ path: relPath }) => {
      const text = await readState(relPath);
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "update_state",
    {
      title: "Update state",
      description:
        `Sobreescribe un archivo de /brain/state/ (${STATE_FILES.join(", ")}) con contenido nuevo. ` +
        "Estampa automáticamente la cabecera de última actualización con la fecha de hoy.",
      inputSchema: {
        file: z.enum(STATE_FILES).describe("nombre del archivo dentro de /brain/state/"),
        content: z.string().describe("contenido markdown completo del archivo (sin la cabecera de fecha)"),
      },
    },
    async ({ file, content }) => {
      const result = await updateState(file, content);
      return { content: [{ type: "text", text: `Actualizado ${result.file} (${result.bytes} bytes).` }] };
    }
  );

  server.registerTool(
    "log_decision",
    {
      title: "Log decision",
      description:
        "Añade una entrada nueva y append-only a /brain/decisions/. Nunca edites una decisión existente: " +
        "si algo cambia, registra una decisión nueva que referencie a la anterior en el contexto.",
      inputSchema: {
        title: z.string().describe("título de la decisión"),
        context: z.string().describe("qué problema o disyuntiva motivó esto"),
        decision: z.string().describe("qué se decidió"),
        alternatives: z.string().describe("qué otras opciones había y por qué se descartaron"),
        slug: z.string().optional().describe("slug opcional para el nombre de archivo; por defecto se deriva del título"),
      },
    },
    async ({ title, context, decision, alternatives, slug }) => {
      const result = await logDecision({ title, context, decision, alternatives, slug });
      return { content: [{ type: "text", text: `Creado ${result.file}.` }] };
    }
  );

  server.registerTool(
    "search",
    {
      title: "Search brain",
      description: "Busca un texto en todo /brain (state, decisions, glossary, INDEX) y devuelve las líneas que coinciden.",
      inputSchema: { query: z.string().describe("texto a buscar, sin distinguir mayúsculas") },
    },
    async ({ query }) => {
      const results = await searchBrain(query);
      const text =
        results.length === 0
          ? `Sin resultados para "${query}".`
          : results.map((r) => `${r.file}:${r.line}: ${r.text}`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}
