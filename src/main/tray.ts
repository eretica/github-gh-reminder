import { join } from "node:path";
import { nativeImage, Tray } from "electron";
import type { PullRequest } from "../shared/types";
import { createMainWindow, setTrayBounds } from "./windows";

// Dependencies interface for DI
export interface TrayDeps {
  createTrayInstance: (icon: Electron.NativeImage) => Electron.Tray;
  createIcon: (hasPRs: boolean) => Electron.NativeImage;
  setTrayBounds: (bounds: Electron.Rectangle) => void;
  createMainWindow: () => void;
}

let tray: Tray | null = null;
let currentPRs: PullRequest[] = [];
let deps: TrayDeps | null = null;

function createTrayIcon(hasPRs: boolean): Electron.NativeImage {
  // Show badge when there are PRs to review
  // - hasPRs: colored icon (light red bell with badge)
  // - no PRs: template image (auto-adjusts to light/dark mode)
  const iconFile = hasPRs ? "trayTemplate.png" : "trayTemplate-empty.png";
  const iconPath = join(__dirname, "../../resources", iconFile);

  try {
    const icon = nativeImage.createFromPath(iconPath);
    // Only use template image for empty state (allows system color adjustment)
    // Colored icon (hasPRs) should not be template to preserve red color
    icon.setTemplateImage(!hasPRs);
    return icon;
  } catch {
    // Fallback: create empty icon
    return nativeImage.createEmpty();
  }
}

// Default production dependencies
const defaultDeps: TrayDeps = {
  createTrayInstance: (icon) => new Tray(icon),
  createIcon: createTrayIcon,
  setTrayBounds,
  createMainWindow,
};

export function createTray(injectedDeps: TrayDeps = defaultDeps): Tray {
  if (tray) return tray;

  deps = injectedDeps;
  const icon = deps.createIcon(false);
  tray = deps.createTrayInstance(icon) as Tray;
  tray.setToolTip("PR Reminder");

  // Click to show window (no context menu)
  // Always show the menu window regardless of PR count
  tray.on("click", (_event, bounds) => {
    if (!deps) return;
    deps.setTrayBounds(bounds);
    deps.createMainWindow();
  });

  return tray;
}

export function updateTrayMenu(prs: PullRequest[]): void {
  if (!tray || !deps) return;

  currentPRs = prs;
  const prCount = prs.length;
  const hasPRs = prCount > 0;

  // Update icon based on PR count (badge or no badge)
  tray.setImage(deps.createIcon(hasPRs));

  // Update title with PR count (shown next to tray icon)
  tray.setTitle(hasPRs ? `${prCount}` : "");
}

export function getCurrentPRs(): PullRequest[] {
  return currentPRs;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  deps = null;
  currentPRs = [];
}

export function getTray(): Tray | null {
  return tray;
}
