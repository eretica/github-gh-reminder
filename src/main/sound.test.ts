import { describe, expect, it, vi } from "vitest";

// Mock fs module
vi.mock("node:fs", () => ({
  readdirSync: vi.fn(() => [
    "Basso.aiff",
    "Blow.aiff",
    "Bottle.aiff",
    "Frog.aiff",
    "Funk.aiff",
    "Glass.aiff",
    "Hero.aiff",
    "Morse.aiff",
    "Ping.aiff",
    "Pop.aiff",
    "Purr.aiff",
    "Sosumi.aiff",
    "Submarine.aiff",
    "Tink.aiff",
  ]),
}));

// Mock child_process execFile
vi.mock("node:child_process", () => ({
  execFile: vi.fn((_cmd, _args, callback) => {
    if (callback) callback(null);
  }),
}));

import { execFile } from "node:child_process";
import { getSystemSounds, playSound } from "./sound";

describe("getSystemSounds", () => {
  it("should return an array of sound names", () => {
    const sounds = getSystemSounds();

    expect(sounds).toBeInstanceOf(Array);
    expect(sounds.length).toBeGreaterThan(0);
  });

  it("should return sorted sound names", () => {
    const sounds = getSystemSounds();
    const sorted = [...sounds].sort();

    expect(sounds).toEqual(sorted);
  });

  it("should not include .aiff extension in sound names", () => {
    const sounds = getSystemSounds();

    for (const sound of sounds) {
      expect(sound).not.toContain(".aiff");
    }
  });

  it("should include common macOS system sounds", () => {
    const sounds = getSystemSounds();
    const commonSounds = ["Basso", "Glass", "Hero", "Ping", "Sosumi", "Tink"];

    for (const commonSound of commonSounds) {
      expect(sounds).toContain(commonSound);
    }
  });
});

describe("playSound", () => {
  it("should call afplay with correct path", () => {
    playSound("Basso");

    expect(execFile).toHaveBeenCalledWith(
      "afplay",
      ["/System/Library/Sounds/Basso.aiff"],
      expect.any(Function),
    );
  });

  it("should handle different sound names", () => {
    playSound("Glass");

    expect(execFile).toHaveBeenCalledWith(
      "afplay",
      ["/System/Library/Sounds/Glass.aiff"],
      expect.any(Function),
    );
  });
});
