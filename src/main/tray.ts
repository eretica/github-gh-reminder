import { join } from "node:path";
import { nativeImage, Tray } from "electron";
import type { PullRequest } from "../shared/types";
import { createMainWindow, setTrayBounds } from "./windows";

let tray: Tray | null = null;
let currentPRs: PullRequest[] = [];

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

export function createTray(): Tray {
  if (tray) return tray;

  tray = new Tray(createTrayIcon(false));
  tray.setToolTip("PR Reminder");

  // Click to show window (no context menu)
  // Always show menu window when clicking tray icon
  // (Notification clicks handle direct navigation for single PRs)
  tray.on("click", (_event, bounds) => {
    setTrayBounds(bounds);
    createMainWindow();
  });

  return tray;
}

export function updateTrayMenu(prs: PullRequest[]): void {
  if (!tray) return;

  currentPRs = prs;
  const prCount = prs.length;
  const hasPRs = prCount > 0;

  // Update icon based on PR count (badge or no badge)
  tray.setImage(createTrayIcon(hasPRs));

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
}

export function getTray(): Tray | null {
  return tray;
}
