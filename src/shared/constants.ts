/**
 * Application-wide constants
 */

/**
 * Navigation routes used for hash-based routing
 */
export const ROUTES = {
  MAIN: "#/",
  SETTINGS: "#/settings",
} as const;

/**
 * IPC event channels for navigation
 */
export const NAVIGATION_EVENTS = {
  NAVIGATE_TO_SETTINGS: "navigate:settings",
  NAVIGATE_TO_MAIN: "navigate:main",
} as const;
