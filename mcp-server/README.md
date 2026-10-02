# clober-brain-mcp

Servidor MCP que envuelve `/brain` para que cualquier agente (Claude Code,
Claude.ai u otro cliente MCP) lea y actualice el project brain de Clober.
Cuatro tools: `read_state`, `update_state`, `log_decision`, `search`.
Lógica en `src/core.js` (sin dependencia de MCP, testeable sola);
`src/server.js` la expone como tools MCP; `src/index.js` (stdio) y
`src/http.js` (HTTP remoto) son los dos transportes.

No forma parte del workspace pnpm de Clober: tiene su propio `npm install`.

## Uso local (Claude Code)

Registrado en `/.mcp.json` (raíz del repo, checked in):

```
claude mcp add --scope project clober-brain -- node mcp-server/src/index.js
```

Antes del primer uso: `cd mcp-server && npm install`. La primera vez que
abras `claude` en este proyecto, aprueba el servidor (`claude mcp list` para
ver el estado).

## Test

```
npm test
```

Corre `src/core.selfcheck.js`: ejercita las 4 operaciones contra el
`/brain` real (lectura, escritura con restauración, creación y borrado de
una decisión de prueba, búsqueda) y falla si algo se rompe.

## Uso remoto (Claude.ai — custom connector)

`src/http.js` expone las mismas tools por Streamable HTTP en `/mcp`,
protegido con un Bearer token (`MCP_TOKEN`, obligatorio — el proceso
aborta si no está definido, porque `update_state` y `log_decision`
escriben en el repo y no deben quedar abiertos sin autenticación).

```
MCP_TOKEN=<token-largo-y-aleatorio> PORT=8787 npm run start:http
```

**Sin desplegar.** Para que Claude.ai lo consuma como connector hace falta
un host con HTTPS público, y eso es una decisión de infraestructura
(proveedor, dominio, coste, rotación del token) de Petru — tarea T7 en
`/brain/state/gestion.md`.
