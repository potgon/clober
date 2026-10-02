import { describe, expect, it } from "vitest";
import { bestMatch, nameScore, normalize, similarity } from "./match.js";

describe("normalize", () => {
  it("strips case, accents and punctuation", () => {
    expect(normalize("  ¡Cámara  Pequeña, YA! ")).toBe("camara pequena ya");
  });
});

describe("similarity", () => {
  it("is 1 for equal strings and decreases with edits", () => {
    expect(similarity("juego", "juego")).toBe(1);
    expect(similarity("escena", "estena")).toBeCloseTo(5 / 6);
    expect(similarity("", "")).toBe(1);
  });
});

describe("nameScore", () => {
  it("matches a word inside a longer name, slightly below a whole-name match", () => {
    expect(nameScore("juego", "Juego principal")).toBeCloseTo(0.95);
    expect(nameScore("juego", "Juego")).toBe(1);
  });
});

describe("bestMatch", () => {
  const scenes = ["Juego", "Juego 2", "Just Chatting", "BRB", "Final"];
  const opts = { threshold: 0.75 };

  it("prefers the exact whole name", () => {
    expect(bestMatch("juego", scenes, opts)).toBe("Juego");
  });

  it("tolerates small transcription errors", () => {
    expect(bestMatch("jüego", scenes, opts)).toBe("Juego");
    expect(bestMatch("just chating", scenes, opts)).toBe("Just Chatting");
  });

  it("returns null below the threshold", () => {
    expect(bestMatch("cocina", scenes, opts)).toBeNull();
  });

  it("returns null on ties", () => {
    expect(bestMatch("camara", ["Cámara 1", "Cámara 2"], opts)).toBeNull();
  });
});
