import { BrowserWindow, shell, screen, type Rectangle } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let trayBounds: Rectangle | null = null

export function setTrayBounds(bounds: Rectangle): void {
  trayBounds = bounds
}

function getWindowPositionNearTray(windowWidth: number, windowHeight: number): { x: number; y: number } {
  if (trayBounds) {
    // Position window below tray icon, centered horizontally
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowWidth / 2)
    const y = trayBounds.y + trayBounds.height
    return { x, y }
  }

  // Fallback: position at top-right of primary display
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize
  return {
    x: screenWidth - windowWidth - 20,
    y: 30
  }
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const windowWidth = 400
  const windowHeight = 500
  const { x, y } = getWindowPositionNearTray(windowWidth, windowHeight)

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
    vibrancy: 'popover',
    visualEffectState: 'active',
    title: 'PR Reminder',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setVisibleOnAllWorkspaces(true)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Hide window when it loses focus (like a popover)
  mainWindow.on('blur', () => {
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/main`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/main' })
  }

  return mainWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    title: 'PR Reminder - Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' })
  }

  return settingsWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

export function closeAllWindows(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
  }
}
