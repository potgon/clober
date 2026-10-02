import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BRAIN_DIR = path.resolve(__dirname, "..", "..", "brain");
export const DECISIONS_DIR = path.join(BRAIN_DIR, "decisions");
export const STATE_DIR = path.join(BRAIN_DIR, "state");

export const STATE_FILES = ["features.md", "architecture.md", "roadmap.md", "gestion.md"];

function resolveInsideBrain(relPath) {
  const resolved = path.resolve(BRAIN_DIR, relPath);
  if (resolved !== BRAIN_DIR && !resolved.startsWith(BRAIN_DIR + path.sep)) {
    throw new Error(`Ruta fuera de /brain: ${relPath}`);
  }
  return resolved;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function readState(relPath) {
  const full = resolveInsideBrain(relPath);
  try {
    return await fs.readFile(full, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") throw new Error(`No existe en /brain: ${relPath}`);
    throw err;
  }
}

export async function updateState(file, content) {
  if (!STATE_FILES.includes(file)) {
    throw new Error(`Archivo de state no reconocido: ${file}. Válidos: ${STATE_FILES.join(", ")}`);
  }
  const header = `<!-- última actualización: ${todayISO()} -->`;
  const body = content.replace(/^<!--\s*última actualización:.*?-->\n*/, "");
  const stamped = `${header}\n\n${body.trimStart()}`;
  const full = path.join(STATE_DIR, file);
  await fs.writeFile(full, stamped, "utf8");
  return { file: `state/${file}`, bytes: stamped.length };
}

export async function logDecision({ title, context, decision, alternatives, slug }) {
  const date = todayISO();
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (!finalSlug) throw new Error("No se pudo derivar un slug del título.");
  const filename = `${date}-${finalSlug}.md`;
  const full = path.join(DECISIONS_DIR, filename);

  try {
    await fs.access(full);
    throw new Error(
      `Ya existe una decisión con ese slug hoy: decisions/${filename}. ` +
        `Las decisiones no se editan una vez creadas — si esto revierte o cambia algo, usa un slug distinto y referencia la anterior en el contexto.`
    );
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const body = `# ${title}

**Fecha:** ${date}
**Contexto:** ${context}
**Decisión:** ${decision}
**Alternativas consideradas:** ${alternatives}
`;
  await fs.writeFile(full, body, "utf8");
  return { file: `decisions/${filename}` };
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(full)));
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

export async function searchBrain(query, { maxResults = 200 } = {}) {
  if (!query || !query.trim()) throw new Error("query vacía");
  const needle = query.toLowerCase();
  const files = await listMarkdownFiles(BRAIN_DIR);
  const results = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) {
        results.push({
          file: path.relative(BRAIN_DIR, file),
          line: i + 1,
          text: lines[i].trim(),
        });
        if (results.length >= maxResults) return results;
      }
    }
  }
  return results;
}
