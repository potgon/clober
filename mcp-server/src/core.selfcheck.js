import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { readState, updateState, logDecision, searchBrain, STATE_DIR, DECISIONS_DIR } from "./core.js";

// read_state: lee INDEX.md real
const index = await readState("INDEX.md");
assert.ok(index.includes("# INDEX"), "read_state debería devolver el INDEX.md real");

// read_state: rechaza salir de /brain
await assert.rejects(() => readState("../CLAUDE.md"), /fuera de \/brain/);

// update_state: escribe y estampa cabecera, sin duplicarla en escrituras repetidas
const before = await fs.readFile(path.join(STATE_DIR, "gestion.md"), "utf8");
await updateState("gestion.md", "contenido de prueba");
const afterFirst = await fs.readFile(path.join(STATE_DIR, "gestion.md"), "utf8");
assert.match(afterFirst, /^<!-- última actualización: \d{4}-\d{2}-\d{2} -->\n\ncontenido de prueba$/);
await updateState("gestion.md", afterFirst);
const afterSecond = await fs.readFile(path.join(STATE_DIR, "gestion.md"), "utf8");
assert.strictEqual((afterSecond.match(/última actualización/g) || []).length, 1, "no debe duplicar la cabecera");
await fs.writeFile(path.join(STATE_DIR, "gestion.md"), before, "utf8"); // restaurar

// update_state: rechaza archivo fuera de la whitelist
await assert.rejects(() => updateState("glossary.md", "x"), /no reconocido/);

// log_decision: crea archivo y rechaza slug duplicado el mismo día
const probe = await logDecision({
  title: "Selfcheck probe decision",
  context: "verificar el servidor MCP",
  decision: "crear y borrar un archivo de prueba",
  alternatives: "ninguna, es un test",
  slug: "selfcheck-probe-decision",
});
const probePath = path.join(DECISIONS_DIR, path.basename(probe.file));
assert.ok(await fs.stat(probePath));
await assert.rejects(
  () => logDecision({ title: "Selfcheck probe decision", context: "x", decision: "x", alternatives: "x", slug: "selfcheck-probe-decision" }),
  /Ya existe una decisión/
);
await fs.unlink(probePath); // limpiar

// search: encuentra algo conocido
const hits = await searchBrain("Clober");
assert.ok(hits.length > 0, "search debería encontrar 'Clober' en el brain");

console.log("OK — core.js self-check pasó");
