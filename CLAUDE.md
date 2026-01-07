# Skills for Electron + TailwindCSS Development

This document defines best practices and design patterns for clean Electron and TailwindCSS development in this project.

## 1. Electron Architecture Patterns

### 1.1 Process Separation (Main vs Renderer)
**Description**: Maintain clear separation between Main and Renderer processes
- **Main Process** (`src/main/`): System operations, file I/O, native APIs, database, IPC handlers
- **Renderer Process** (`src/renderer/`): UI rendering, React components, user interactions
- **Preload Scripts** (`src/preload/`): Secure bridge between Main and Renderer
- **Shared Types** (`src/shared/`): Common type definitions used across processes

**Best Practices**:
```typescript
// ✅ Good: Use IPC for cross-process communication
// Main Process
ipcMain.handle('data:fetch', async () => {
  return await database.query();
});

// Renderer Process
const data = await window.api.fetchData();

// ❌ Bad: Don't expose nodeIntegration to renderer
const window = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true, // Security risk!
  }
});
```

### 1.2 IPC Communication
**Description**: Type-safe, secure Inter-Process Communication

**Best Practices**:
```typescript
// ✅ Good: Define typed API in preload
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface IpcApi {
  getData: () => Promise<Data>;
  saveData: (data: Data) => Promise<void>;
}

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('data:get'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
} as IpcApi);

// ❌ Bad: Exposing raw ipcRenderer
contextBridge.exposeInMainWorld('api', {
  ipcRenderer: ipcRenderer, // Insecure!
});
```

### 1.3 Tray Application Pattern
**Description**: Persistent background application with system tray

**Best Practices**:
```typescript
// ✅ Good: Manage tray lifecycle properly with module-level variable
let tray: Tray | null = null;

export function createTray(): Tray {
  if (tray) return tray;

  tray = new Tray(createTrayIcon());
  tray.setToolTip('PR Reminder');

  // Handle tray click
  tray.on('click', (_event, bounds) => {
    setTrayBounds(bounds);
    createMainWindow();
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

// Call destroyTray() from app.on('before-quit') or app.on('will-quit')

// ❌ Bad: Not handling tray lifecycle
const tray = new Tray(iconPath); // Can be garbage collected
```

### 1.4 Window Management
**Description**: Efficient window creation and lifecycle management

**Best Practices**:
```typescript
// ✅ Good: Reuse windows when possible (singleton pattern)
let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile('index.html');
  return mainWindow;
}

// ❌ Bad: Creating new window every time
function showSettings() {
  const window = new BrowserWindow({...}); // Memory leak
  window.loadFile('settings.html');
}
```

## 2. Database Patterns (Drizzle ORM)

### 2.1 Schema Design
**Description**: Type-safe database schema with Drizzle ORM

**Best Practices**:
```typescript
// ✅ Good: Use proper types and constraints
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ❌ Bad: Missing constraints and types
export const users = sqliteTable('users', {
  id: text('id'),
  name: text('name'),
  email: text('email'),
});
```

### 2.2 Database Initialization
**Description**: Proper database setup with error handling

**Best Practices**:
```typescript
// ✅ Good: Initialize DB in Main process with error handling
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export function initDatabase(dbPath: string) {
  try {
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// For production apps with schema changes, use migrations:
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export function initDatabaseWithMigrations(dbPath: string) {
  try {
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);

    // Run migrations for schema versioning
    migrate(db, { migrationsFolder: './drizzle' });

    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// ❌ Bad: No error handling
const sqlite = new Database('db.sqlite');
const db = drizzle(sqlite);
```

### 2.3 Query Patterns
**Description**: Efficient and type-safe database queries

**Best Practices**:
```typescript
// ✅ Good: Use typed queries with proper error handling
async function getActiveRepositories() {
  try {
    return await db
      .select()
      .from(repositories)
      .where(eq(repositories.enabled, 1))
      .orderBy(repositories.order);
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return [];
  }
}

// ❌ Bad: Raw SQL strings without types
async function getActiveRepositories() {
  return db.all('SELECT * FROM repositories WHERE enabled = 1');
}
```

## 3. React Component Patterns

### 3.1 Component Organization
**Description**: Clear component structure and separation of concerns

**Best Practices**:
```typescript
// ✅ Good: Separate presentational and container logic
// components/RepositoryItem.tsx (Presentational)
interface RepositoryItemProps {
  repository: Repository;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}

export function RepositoryItem({ repository, onToggle, onRemove }: RepositoryItemProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <span>{repository.name}</span>
      <button onClick={() => onToggle(repository.id, !repository.enabled)}>
        Toggle
      </button>
    </div>
  );
}

// ❌ Bad: Mixing data fetching with presentation
export function RepositoryItem({ id }: { id: string }) {
  const [repo, setRepo] = useState(null);

  useEffect(() => {
    window.api.getRepository(id).then(setRepo);
  }, [id]);

  return <div>...</div>;
}
```

### 3.2 Custom Hooks
**Description**: Reusable logic extraction with custom hooks

**Best Practices**:
```typescript
// ✅ Good: Encapsulate IPC calls in custom hooks
// hooks/useRepositories.ts
export function useRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    window.api.listRepositories()
      .then(setRepositories)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const addRepository = async (path: string) => {
    const repo = await window.api.addRepository(path);
    setRepositories(prev => [...prev, repo]);
  };

  return { repositories, loading, error, addRepository };
}

// ❌ Bad: Duplicating IPC logic in every component
function RepositoryList() {
  const [repos, setRepos] = useState([]);
  useEffect(() => {
    window.api.listRepositories().then(setRepos);
  }, []);
}
```

## 4. TailwindCSS Best Practices

### 4.1 Utility-First Approach
**Description**: Prefer utility classes over custom CSS

**Best Practices**:
```tsx
// ✅ Good: Use Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <span className="text-sm font-medium text-gray-900">{title}</span>
  <button className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
    Action
  </button>
</div>

// ❌ Bad: Inline styles or custom CSS for simple layouts
<div style={{ display: 'flex', padding: '16px' }}>
  <span style={{ fontSize: '14px' }}>{title}</span>
</div>
```

### 4.2 Responsive Design
**Description**: Mobile-first responsive design

**Best Practices**:
```tsx
// ✅ Good: Mobile-first with responsive modifiers
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <div className="p-4 text-sm md:text-base lg:text-lg">
    Content
  </div>
</div>

// ❌ Bad: Desktop-first or fixed sizes
<div className="grid grid-cols-3 gap-4">
  <div style={{ width: '300px' }}>Content</div>
</div>
```

### 4.3 Custom Configuration
**Description**: Configure Tailwind for your project needs

**Basic Setup**:
```javascript
// tailwind.config.js
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Optional: Extend with custom design tokens** when you need consistent branding:
```javascript
// tailwind.config.js
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
};
```

**Note**: Arbitrary values like `bg-[#3b82f6]` are acceptable for one-off cases, but consider adding theme values for colors/spacing used repeatedly.

### 4.4 Component Composition
**Description**: Build reusable component variants

**Best Practices**:
```tsx
// ✅ Good: Create variant-based components
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
  const baseClasses = 'font-semibold rounded transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </button>
  );
}

// ❌ Bad: Duplicate classes in every usage
<button className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>
```

## 5. TypeScript Best Practices

### 5.1 Strict Type Safety
**Description**: Leverage TypeScript's type system fully

**Best Practices**:
```typescript
// ✅ Good: Define explicit types
interface Repository {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  order: number;
}

function updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
  // Implementation
}

// ❌ Bad: Using 'any' or no types
function updateRepository(id, updates) {
  // No type safety
}
```

### 5.2 Shared Types
**Description**: Centralize type definitions for cross-process usage

**Best Practices**:
```typescript
// ✅ Good: Define shared types in src/shared/types.ts
// src/shared/types.ts
export interface Repository {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface IpcApi {
  listRepositories(): Promise<Repository[]>;
  addRepository(path: string): Promise<Repository>;
}

// Use in both Main and Renderer
// src/main/ipc.ts
import type { Repository, IpcApi } from '../shared/types';

// src/renderer/hooks/useRepositories.ts
import type { Repository } from '../../shared/types';

// ❌ Bad: Duplicate type definitions
// main/types.ts
interface Repo { ... }

// renderer/types.ts
interface Repository { ... } // Different name, similar structure
```

## 6. Error Handling Patterns

### 6.1 IPC Error Handling
**Description**: Proper error propagation between processes

**Best Practices**:
```typescript
// ✅ Good: Handle errors at both ends
// Main Process
ipcMain.handle('data:fetch', async () => {
  try {
    return await fetchData();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Data fetch failed');
  }
});

// Renderer Process
try {
  const data = await window.api.fetchData();
  setData(data);
} catch (error) {
  console.error('Error:', error);
  setError('Failed to load data');
}

// ❌ Bad: Swallowing errors
ipcMain.handle('data:fetch', async () => {
  try {
    return await fetchData();
  } catch (error) {
    return null; // Error lost
  }
});
```

### 6.2 User-Facing Error Messages
**Description**: Provide clear, actionable error messages

**Best Practices**:
```typescript
// ✅ Good: User-friendly error messages
function handleError(error: Error) {
  if (error.message.includes('ENOENT')) {
    showNotification('Repository not found. Please check the path.');
  } else if (error.message.includes('EACCES')) {
    showNotification('Permission denied. Please check folder permissions.');
  } else {
    showNotification('An unexpected error occurred. Please try again.');
  }
}

// ❌ Bad: Raw error messages
function handleError(error: Error) {
  alert(error.message); // "ENOENT: no such file or directory"
}
```

## 7. Performance Optimization

### 7.1 React Memoization
**Description**: Optimize re-renders with React.memo and useMemo when needed

**When to use memoization**:
- Only when you have measured performance issues
- For expensive computations that run on every render
- For large lists or complex filtering/sorting operations

**Best Practices**:
```typescript
// ✅ Good: Memoize expensive computations (large lists, heavy operations)
function RepositoryList({ repositories }: Props) {
  const sortedRepos = useMemo(() => {
    return [...repositories].sort((a, b) => a.order - b.order);
  }, [repositories]);

  return <div>{sortedRepos.map(repo => <RepositoryItem key={repo.id} />)}</div>;
}

// ✅ Also Good: Use React.memo for components with complex props
export const RepositoryItem = React.memo(({ repository, onToggle }: Props) => {
  return <div>...</div>;
});

// ✅ Fine for simple cases: Skip memoization until needed
function RepositoryList({ repositories }: Props) {
  return <div>{repositories.map(repo => <RepositoryItem key={repo.id} />)}</div>;
}

// ❌ Bad: Premature optimization for trivial operations
function Counter({ count }: Props) {
  const doubled = useMemo(() => count * 2, [count]); // Unnecessary
  return <div>{doubled}</div>;
}
```

**Note**: Start simple and add memoization only when you identify performance bottlenecks.

### 7.2 Database Query Optimization
**Description**: Efficient database queries with proper filtering

**Best Practices**:
```typescript
// ✅ Good: Use typed queries with proper filtering
const activeRepos = await db
  .select()
  .from(repositories)
  .where(eq(repositories.enabled, 1))
  .orderBy(repositories.order)
  .limit(100);

// ❌ Bad: Fetch all data then filter in memory
const allRepos = await db.select().from(repositories);
const activeRepos = allRepos.filter(r => r.enabled === 1);
```

**Note**: For frequently queried columns, consider adding indexes:
```typescript
export const repositories = sqliteTable('repositories', {
  id: text('id').primaryKey(),
  enabled: integer('enabled').notNull(),
  order: integer('order').notNull(),
}, (table) => ({
  enabledIdx: index('enabled_idx').on(table.enabled),
  orderIdx: index('order_idx').on(table.order),
}));
```

## 8. Security Best Practices

### 8.1 Context Isolation
**Description**: Secure communication between processes

**Best Practices**:
```typescript
// ✅ Good: Use contextBridge with explicit API
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('data:get'),
  // Only expose necessary methods
});

// Main process window creation
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js'),
  },
});

// ❌ Bad: Disabling security features
new BrowserWindow({
  webPreferences: {
    contextIsolation: false,
    nodeIntegration: true, // Dangerous!
  },
});
```

### 8.2 Input Validation
**Description**: Validate all user inputs and external data

**Best Practices**:
```typescript
// ✅ Good: Validate inputs
function addRepository(path: string): Promise<Repository> {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path');
  }

  if (!existsSync(path)) {
    throw new Error('Path does not exist');
  }

  if (!isDirectory(path)) {
    throw new Error('Path is not a directory');
  }

  return db.insert(repositories).values({...});
}

// ❌ Bad: No validation
function addRepository(path: string) {
  return db.insert(repositories).values({ path });
}
```

## 9. Build and Distribution

### 9.1 Electron Builder Configuration
**Description**: Proper packaging for distribution

**Best Practices**:
```json
// electron-builder.json
// ✅ Good: Complete build configuration
{
  "appId": "com.example.app",
  "productName": "My App",
  "directories": {
    "output": "dist",
    "buildResources": "resources"
  },
  "files": [
    "out/**/*",
    "resources/**/*"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg", "zip"]
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Utility"
  }
}
```

### 9.2 Code Signing
**Description**: Sign applications for distribution

**Best Practices**:
```typescript
// ✅ Good: Proper code signing setup
// electron-builder.json
{
  "mac": {
    "identity": "Developer ID Application: Your Name",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "win": {
    "certificateFile": "cert.pfx",
    "certificatePassword": "${env.CERT_PASSWORD}"
  }
}
```

## 10. Testing Strategies

**Note**: Testing infrastructure is not yet implemented in this project. The following are recommended patterns for when tests are added.

### 10.1 Unit Testing
**Description**: Test components and functions in isolation

**Recommended approach for custom hooks**:
```typescript
// Example: Testing custom hooks with @testing-library/react
import { renderHook, act } from '@testing-library/react';
import { useRepositories } from './useRepositories';

test('should fetch repositories on mount', async () => {
  const { result } = renderHook(() => useRepositories());

  expect(result.current.loading).toBe(true);

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  expect(result.current.loading).toBe(false);
  expect(result.current.repositories).toHaveLength(2);
});
```

### 10.2 Integration Testing
**Description**: Test IPC communication and process interaction

**Recommended approach for IPC handlers**:
```typescript
// Example: Testing IPC handlers with mocked Electron
import { ipcMain } from 'electron';

test('should handle repository addition', async () => {
  const handler = ipcMain.handle as jest.Mock;
  const addRepositoryHandler = handler.mock.calls.find(
    call => call[0] === 'repo:add'
  )[1];

  const result = await addRepositoryHandler(null, '/path/to/repo');

  expect(result).toMatchObject({
    id: expect.any(String),
    path: '/path/to/repo',
  });
});
```

**Setup considerations**:
- Use `@testing-library/react` for component testing
- Use `vitest` or `jest` as test runner
- Mock Electron APIs in tests
- Consider `playwright` for E2E testing

## 11. Lessons Learned

**Description**: This section documents project-specific mistakes, fixes, and patterns discovered during development. It serves as a living record of what we've learned to prevent repeating the same issues.

### How to Contribute to This Section

When you encounter a significant bug, mistake, or learn an important lesson:

1. **Via Pull Requests**: Use the PR template's "Lessons Learned" section to document what you learned
2. **Via Commit Messages**: Use tags like `[lesson]`, `[antipattern]`, or `[fix]` in commit messages
3. **Direct Updates**: Add entries to this section following the format below

### Entry Format

Each entry should include:
- **Date**: When the issue was discovered/fixed
- **Category**: Type of issue (Bug, Performance, Security, Architecture, etc.)
- **Problem**: What went wrong or what mistake was made
- **Solution**: How it was fixed
- **Lesson**: What we learned and how to avoid it in the future
- **Related**: Links to PRs, issues, or commits

### Documented Lessons

#### Example Entry (Remove this after adding real entries)

**Date**: 2026-01-07
**Category**: Documentation
**Problem**: No systematic way to capture and document mistakes and fixes
**Solution**: Added this "Lessons Learned" section to CLAUDE.md with clear contribution guidelines
**Lesson**: Documenting mistakes as they occur prevents knowledge loss and helps new team members avoid common pitfalls
**Related**: Issue #35

---

**Instructions for maintaining this section**:
- Keep entries in reverse chronological order (newest first)
- Be honest about mistakes - they're learning opportunities
- Focus on lessons that will benefit the team long-term
- Update related best practices sections when patterns emerge
- Archive old entries (move to a separate LESSONS_ARCHIVE.md) after 1 year to keep this section focused

## Summary

This skills document provides comprehensive patterns for clean Electron + TailwindCSS development, covering:

1. **Architecture**: Process separation, IPC communication, tray/window management
2. **Database**: Drizzle ORM patterns, schema design, query optimization
3. **React**: Component organization, custom hooks, state management
4. **TailwindCSS**: Utility-first styling, responsive design, component variants
5. **TypeScript**: Type safety, shared types, strict typing
6. **Error Handling**: IPC errors, user-facing messages
7. **Performance**: React memoization, database optimization
8. **Security**: Context isolation, input validation
9. **Build**: Electron Builder configuration, code signing
10. **Testing**: Unit tests, integration tests
11. **Lessons Learned**: Project-specific mistakes and fixes to prevent future issues

Follow these patterns to maintain clean, maintainable, and performant Electron applications.
