import { Tray, nativeImage } from 'electron'
import { join } from 'path'
import { createMainWindow, setTrayBounds } from './windows'
import type { PullRequest } from '../shared/types'

let tray: Tray | null = null
let currentPRs: PullRequest[] = []

function createTrayIcon(): nativeImage {
  // Use template image for macOS menu bar (auto-adjusts to light/dark mode)
  const iconPath = join(__dirname, '../../resources/trayTemplate.png')

  try {
    const icon = nativeImage.createFromPath(iconPath)
    // Mark as template image for macOS
    icon.setTemplateImage(true)
    return icon
  } catch {
    // Fallback: create empty icon
    return nativeImage.createEmpty()
  }
}

export function createTray(): Tray {
  if (tray) return tray

  tray = new Tray(createTrayIcon())
  tray.setToolTip('PR Reminder')

  // Click to show window (no context menu)
  tray.on('click', (_event, bounds) => {
    setTrayBounds(bounds)
    createMainWindow()
  })

  return tray
}

export function updateTrayMenu(prs: PullRequest[]): void {
  if (!tray) return

  currentPRs = prs
  const prCount = prs.length

  // Update title with PR count (shown next to tray icon)
  tray.setTitle(prCount > 0 ? `${prCount}` : '')
}

export function getCurrentPRs(): PullRequest[] {
  return currentPRs
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function getTray(): Tray | null {
  return tray
}
