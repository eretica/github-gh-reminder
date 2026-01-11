import { join } from "node:path";
import { is } from "@electron-toolkit/utils";
import { BrowserWindow, type Rectangle, screen, shell } from "electron";

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let trayBounds: Rectangle | null = null;

export function setTrayBounds(bounds: Rectangle): void {
  trayBounds = bounds;
}

function getWindowPositionNearTray(
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  if (trayBounds) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    // Position window below tray icon, centered horizontally
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2);
    let y = trayBounds.y + trayBounds.height;

    // Horizontal boundary checks
    if (x + windowWidth > screenWidth) {
      x = screenWidth - windowWidth - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // Vertical boundary checks
    if (y + windowHeight > screenHeight) {
      // Try positioning above tray
      const aboveY = trayBounds.y - windowHeight - 10;
      if (aboveY >= 0) {
        y = aboveY;
      } else {
        // If doesn't fit above or below, position at screen bottom
        y = Math.max(0, screenHeight - windowHeight - 20);
      }
    }

    // Final safety check for upper boundary
    if (y < 0) {
      y = 20;
    }

    return { x, y };
  }

  // Fallback: position at top-right of primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  return {
    x: screenWidth - windowWidth - 20,
    y: 30,
  };
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
