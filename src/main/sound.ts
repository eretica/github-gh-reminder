import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const SYSTEM_SOUNDS_PATH = "/System/Library/Sounds";

export function getSystemSounds(): string[] {
  try {
    const files = readdirSync(SYSTEM_SOUNDS_PATH);
    const sounds = files
      .filter((file) => file.endsWith(".aiff"))
      .map((file) => file.replace(".aiff", ""))
      .sort();

    return sounds;
  } catch (error) {
    console.error("Failed to get system sounds:", error);
    // Fallback to default sounds
    return [
      "Basso",
      "Blow",
      "Bottle",
      "Frog",
      "Funk",
      "Glass",
      "Hero",
      "Morse",
      "Ping",
      "Pop",
      "Purr",
      "Sosumi",
      "Submarine",
      "Tink",
    ];
  }
}

export function playSound(soundName: string): void {
  const soundPath = join(SYSTEM_SOUNDS_PATH, `${soundName}.aiff`);

  // Use afplay command to play the sound
  execFile("afplay", [soundPath], (error) => {
    if (error) {
      console.error(`Failed to play sound: ${soundName}`, error);
    }
  });
}
