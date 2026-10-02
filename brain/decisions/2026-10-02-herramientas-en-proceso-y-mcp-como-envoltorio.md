# Herramientas en proceso; MCP solo como envoltorio publicable

**Fecha:** 2026-10-02
**Dueño:** Petru (propuesta del agente; revocable con decisión nueva)
**Contexto:** el PRD pide MCP propios publicables aparte (`mcp-obs`,
`mcp-twitch`, `mcp-media`) y a la vez latencia p50 < 1,5 s. Si el núcleo
hablara con sus propias herramientas como clientes MCP por stdio, cada
acción pagaría IPC y serialización, y la capa de políticas quedaría fuera
del proceso que ejecuta.
**Decisión:** cada paquete `mcp-*` exporta un array de `ToolDefinition`
(esquema zod, nivel por defecto, handler, undo) que el núcleo importa en
proceso y ejecuta siempre a través de su executor (política → confirmación
→ handler → deshacer → registro). El mismo paquete trae un `bin` MCP stdio
que registra esas definiciones para Claude Desktop u otros clientes; ese
binario no aplica políticas y lo declara. Los MCP de terceros se conectan
con el cliente MCP del SDK a partir de F3.
**Alternativas consideradas:** núcleo como cliente MCP de sus propios
servidores — descartada por latencia y porque las políticas quedarían
repartidas; no publicar MCP — descartada porque contradice el PRD
("interoperable").
