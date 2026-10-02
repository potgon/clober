import { homedir } from "node:os";
import { join } from "node:path";

/** %APPDATA%\Clober, overridable with CLOBER_DATA_DIR (tests, portable installs). */
export function dataDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.CLOBER_DATA_DIR ?? join(env.APPDATA ?? homedir(), "Clober");
}

export function logsDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(dataDir(env), "logs");
}
