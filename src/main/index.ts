import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, getDatabase } from './db'
import { createTray, destroyTray, updateTrayMenu } from './tray'
import { setupIpcHandlers, sendPRUpdate } from './ipc'
import { scheduler } from './scheduler'
import { DEFAULT_SETTINGS, type Settings } from '../shared/types'
import * as schema from './db/schema'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore()
      windows[0].focus()
    }
  })

  // Don't quit when all windows are closed (tray app)
  app.on('window-all-closed', (e: Event) => {
    e.preventDefault()
  })

  app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.pr-reminder.app')

    // Hide dock icon on macOS (tray-only app)
    if (process.platform === 'darwin') {
      app.dock.hide()
    }

    // Default open or close DevTools by F12 in development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Initialize database
    initDatabase()

    // Setup IPC handlers
    setupIpcHandlers()

    // Create system tray
    createTray()

    // Get settings and start scheduler
    const settings = await getSettings()
    scheduler.start(settings)

    // Listen for PR updates to update tray
    scheduler.onUpdate((prs) => {
      updateTrayMenu(prs)
      sendPRUpdate(prs)
    })

    // On macOS, keep app running even when dock icon is clicked with no windows
    app.on('activate', () => {
      // App is activated, tray is always visible
    })
  })

  app.on('before-quit', () => {
    scheduler.stop()
    destroyTray()
    closeDatabase()
  })
}

async function getSettings(): Promise<Settings> {
  const db = getDatabase()
  const rows = await db.select().from(schema.settings)

  const result = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    const key = row.key as keyof Settings
    if (key in result) {
      ;(result as Record<string, unknown>)[key] = JSON.parse(row.value)
    }
  }

  return result
}
