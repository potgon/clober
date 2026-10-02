import { describe, expect, it } from "vitest";
import { createFastpath } from "./fastpath.js";

const scenes = [
  "Inicio",
  "Juego",
  "Juego 2",
  "Just Chatting",
  "Pantalla completa",
  "BRB",
  "Cámara",
];
const match = createFastpath({ wakeWords: ["regidor"], scenes: () => scenes });

const scene = (name: string) => ({ tool: "obs_set_scene", args: { scene: name } });

describe("fastpath: scene switching", () => {
  it.each([
    ["escena juego", "Juego"],
    ["Escena Juego.", "Juego"],
    ["Regidor, escena juego", "Juego"],
    ["regidor pon la escena just chatting", "Just Chatting"],
    ["cambia a la escena BRB", "BRB"],
    ["pon la escena cámara", "Cámara"],
    ["pon la escena camara", "Cámara"],
    ["escena juego dos", "Juego 2"],
    ["escena juego 2", "Juego 2"],
    ["escena pantalla completa", "Pantalla completa"],
    ["escena pantalla", "Pantalla completa"],
    // Whisper near misses
    ["por la estena juego", "Juego"],
    ["rejidor escena inicio", "Inicio"],
    ["escena just chating", "Just Chatting"],
    // English
    ["scene game", null],
    ["switch to scene BRB", "BRB"],
    ["scene just chatting", "Just Chatting"],
  ])("%s -> %s", (utterance, expected) => {
    expect(match(utterance)).toEqual(expected ? scene(expected) : null);
  });
});

describe("fastpath: leaves everything else to the agent", () => {
  it.each([
    "pon el meme de la cabra",
    "escena",
    "escena cocina",
    "vuelve a la escena de antes",
    "cuando termine esta partida cambia a la escena juego", // keyword too far in
    "escenario juego",
    "",
  ])("%s -> null", (utterance) => {
    expect(match(utterance)).toBeNull();
  });
});
