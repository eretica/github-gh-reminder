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

// Mock electron shell
vi.mock("electron", () => ({
  shell: {
    openPath: vi.fn(() => Promise.resolve("")),
  },
}));

import { getSystemSounds } from "./sound";

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
