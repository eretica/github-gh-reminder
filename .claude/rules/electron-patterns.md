---
paths:
  - "src/main/**/*.ts"
  - "src/preload/**/*.ts"
---

# Electronアーキテクチャパターン

## プロセス分離

**ルール**: MainプロセスとRendererプロセス間の明確な分離を維持する

- **Mainプロセス** (`src/main/`): システム操作、ファイルI/O、ネイティブAPI、データベース、IPCハンドラー
- **Rendererプロセス** (`src/renderer/`): UIレンダリング、Reactコンポーネント、ユーザーインタラクション
- **Preloadスクリプト** (`src/preload/`): MainとRenderer間のセキュアなブリッジ
- **共有型** (`src/shared/`): プロセス間で使用される共通型定義

**ベストプラクティス**:
```typescript
// ✅ 良い例: プロセス間通信にIPCを使用
// Mainプロセス
ipcMain.handle('data:fetch', async () => {
  return await database.query();
});

// Rendererプロセス
const data = await window.api.fetchData();

// ❌ 悪い例: rendererにnodeIntegrationを公開しない
const window = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true, // セキュリティリスク！
  }
});
```

## IPC通信

**ルール**: 型安全でセキュアなプロセス間通信

```typescript
// ✅ 良い例: preloadで型付きAPIを定義
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

// ❌ 悪い例: 生のipcRendererを公開
contextBridge.exposeInMainWorld('api', {
  ipcRenderer: ipcRenderer, // 安全でない！
});
```

## トレイアプリケーションパターン

**ルール**: システムトレイを使った永続的なバックグラウンドアプリケーション

```typescript
// ✅ 良い例: モジュールレベル変数でトレイライフサイクルを適切に管理
let tray: Tray | null = null;

export function createTray(): Tray {
  if (tray) return tray;

  tray = new Tray(createTrayIcon());
  tray.setToolTip('GitHub PR Reminder');

  // トレイクリックを処理
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

// app.on('before-quit')またはapp.on('will-quit')からdestroyTray()を呼び出す

// ❌ 悪い例: トレイライフサイクルを処理していない
const tray = new Tray(iconPath); // ガベージコレクションされる可能性あり
```

## ウィンドウ管理

**ルール**: 効率的なウィンドウ作成とライフサイクル管理（シングルトンパターン）

```typescript
// ✅ 良い例: 可能な限りウィンドウを再利用
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

// ❌ 悪い例: 毎回新しいウィンドウを作成
function showSettings() {
  const window = new BrowserWindow({...}); // メモリリーク
  window.loadFile('settings.html');
}
```

## セキュリティベストプラクティス

**ルール**: Electronセキュリティチェックリストに従う

包括的なセキュリティガイドラインについては`security.md`を参照：
- コンテキスト分離（必須で有効化）
- IPC境界での入力検証
- Content Security Policy
- セキュアなpreloadスクリプトパターン

**重要な要件**:
```typescript
// ✅ コンテキスト分離とnodeIntegration設定
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,   // 必須: true
    nodeIntegration: false,   // 必須: false
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

## エラーハンドリング

**ルール**: IPC通信の両端でエラーを処理

```typescript
// ✅ 良い例: 適切なエラー伝播
// Mainプロセス
ipcMain.handle('data:fetch', async () => {
  try {
    return await fetchData();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Data fetch failed');
  }
});

// Rendererプロセス
try {
  const data = await window.api.fetchData();
  setData(data);
} catch (error) {
  console.error('Error:', error);
  setError('Failed to load data');
}

// ❌ 悪い例: エラーを握りつぶす
ipcMain.handle('data:fetch', async () => {
  try {
    return await fetchData();
  } catch (error) {
    return null; // エラーが失われる
  }
});
```

## 入力検証

**ルール**: システム境界ですべてのユーザー入力と外部データを検証

```typescript
// ✅ 良い例: 入力を検証
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

// ❌ 悪い例: 検証なし
function addRepository(path: string) {
  return db.insert(repositories).values({ path });
}
```
