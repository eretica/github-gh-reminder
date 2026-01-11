import { join } from "node:path";
import { is } from "@electron-toolkit/utils";
import { BrowserWindow, type Rectangle, screen, shell } from "electron";

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let trayBounds: Rectangle | null = null;

export function setTrayBounds(bounds: Rectangle): void {
  trayBounds = bounds;
}

/**
 * Calculate initial window position centered below tray icon
 */
function calculateCenteredPosition(
  trayBounds: Rectangle,
  windowWidth: number,
): { x: number; y: number } {
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2);
  const y = trayBounds.y + trayBounds.height;
  return { x, y };
}

/**
 * Apply horizontal boundary constraints to keep window on screen
 */
function applyHorizontalBoundary(
  x: number,
  windowWidth: number,
  screenWidth: number,
): number {
  const margin = 20;
  if (x + windowWidth > screenWidth) {
    return screenWidth - windowWidth - margin;
  }
  if (x < margin) {
    return margin;
  }
  return x;
}

/**
 * Apply vertical boundary constraints, trying above tray if needed
 */
function applyVerticalBoundary(
  y: number,
  windowHeight: number,
  screenHeight: number,
  trayBounds: Rectangle,
): number {
  const margin = 20;
  const aboveGap = 10;

  // Check if window fits below tray
  if (y + windowHeight > screenHeight) {
    // Try positioning above tray
    const aboveY = trayBounds.y - windowHeight - aboveGap;
    if (aboveY >= 0) {
      return aboveY;
    }
    // If doesn't fit above or below, position at screen bottom
    return Math.max(0, screenHeight - windowHeight - margin);
  }

  // Final safety check for upper boundary
  if (y < 0) {
    return margin;
  }

  return y;
}

/**
 * Get fallback position when tray bounds are not available
 */
function getFallbackPosition(windowWidth: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  return {
    x: screenWidth - windowWidth - 20,
    y: 30,
  };
}

function getWindowPositionNearTray(
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  if (!trayBounds) {
    return getFallbackPosition(windowWidth);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  // Calculate initial position centered below tray
  const { x: initialX, y: initialY } = calculateCenteredPosition(
    trayBounds,
    windowWidth,
  );

  // Apply boundary constraints
  const x = applyHorizontalBoundary(initialX, windowWidth, screenWidth);
  const y = applyVerticalBoundary(
    initialY,
    windowHeight,
    screenHeight,
    trayBounds,
  );

  return { x, y };
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const windowWidth = 400;
  const windowHeight = 500;
  const { x, y } = getWindowPositionNearTray(windowWidth, windowHeight);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    minWidth: 350,
    minHeight: 400,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    hasShadow: false,
    vibrancy: "popover",
    visualEffectState: "active",
    title: "PR Reminder",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // Hide window when it loses focus (like a popover)
  mainWindow.on("blur", () => {
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/main`);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "/main",
    });
  }

  return mainWindow;
}

export function createSettingsWindow(): BrowserWindow {
  // Note: This function is deprecated and kept for backward compatibility
  // Settings now open within the main window via hash navigation
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  const windowWidth = 600;
  const windowHeight = 600;
  const { x, y } = getWindowPositionNearTray(windowWidth, windowHeight);

  settingsWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    minWidth: 550,
    minHeight: 500,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    hasShadow: false,
    vibrancy: "popover",
    visualEffectState: "active",
    title: "PR Reminder - Settings",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.setVisibleOnAllWorkspaces(true);

  settingsWindow.on("ready-to-show", () => {
    settingsWindow?.show();
  });

  // Hide window when it loses focus (like a popover)
  settingsWindow.on("blur", () => {
    settingsWindow?.hide();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/settings`);
  } else {
    settingsWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "/settings",
    });
  }

  return settingsWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function closeAllWindows(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
}
