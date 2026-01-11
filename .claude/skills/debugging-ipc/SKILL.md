---
name: debugging-ipc
description: Troubleshooting guide for IPC communication issues between Main and Renderer processes
---

# IPC通信のデバッグ

このガイドは、メインプロセスとレンダラープロセス間のプロセス間通信（IPC）の問題をデバッグするのに役立ちます。

## 一般的な問題

### 1. "Cannot read property of undefined" (window.api)

**症状**：レンダラープロセスで`window.api`にアクセスするとエラーが発生する。

**原因**：プリロードスクリプトが読み込まれていない、またはコンテキストブリッジが公開されていない。

**解決方法**：

```typescript
// BrowserWindow設定を確認（src/main/window.ts）
const window = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),  // ✅ パスを検証
    contextIsolation: true,                            // ✅ trueである必要がある
    nodeIntegration: false,                            // ✅ falseである必要がある
  },
});
```

```typescript
// プリロードスクリプトを検証（src/preload/index.ts）
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  listRepositories: () => ipcRenderer.invoke('repo:list'),
  // ... その他のメソッド
});
```

### 2. IPCハンドラが応答しない

**症状**：`ipcRenderer.invoke()`がハングまたは拒否される。

**原因**：ハンドラが登録されていない、またはチャネル名が一致しない。

**解決方法**：

```typescript
// 1. チャネル名の一貫性を確認
// shared/constants.ts
export const IPC_CHANNELS = {
  REPO_LIST: 'repo:list',  // ✅ 一度定義
} as const;

// main/ipc.ts
import { IPC_CHANNELS } from '../shared/constants';
ipcMain.handle(IPC_CHANNELS.REPO_LIST, async () => { ... });

// preload/index.ts
import { IPC_CHANNELS } from '../shared/constants';
api: {
  listRepositories: () => ipcRenderer.invoke(IPC_CHANNELS.REPO_LIST),
}
```

```typescript
// 2. ハンドラが登録されているか確認
// main/index.ts
import { setupIpcHandlers } from './ipc';

app.whenReady().then(() => {
  setupIpcHandlers();  // ✅ 呼び出し必須
  createWindow();
});
```

### 3. レンダラーでの型エラー

**症状**：`window.api`メソッドを呼び出すとTypeScriptエラーが発生する。

**原因**：型定義が欠落または不正確。

**解決方法**：

```typescript
// src/renderer/env.d.ts
import type { IpcApi } from '../preload';

declare global {
  interface Window {
    api: IpcApi;
  }
}

// src/preload/index.ts
export interface IpcApi {
  listRepositories: () => Promise<Repository[]>;
  addRepository: () => Promise<Repository | null>;
  // ... すべてのメソッド
}

contextBridge.exposeInMainWorld('api', {
  listRepositories: () => ipcRenderer.invoke('repo:list'),
  addRepository: () => ipcRenderer.invoke('repo:add'),
} as IpcApi);
```

### 4. データベースクエリエラー

**症状**：IPCハンドラが"table not found"または"column not found"をスローする。

**原因**：マイグレーションが実行されていない、またはスキーマが同期されていない。

**解決方法**：

```bash
# 1. マイグレーションを再生成
pnpm db:generate

# 2. データベースを削除してアプリを再起動（開発環境のみ！）
rm ~/Library/Application\ Support/github-pr-reminder/github-pr-reminder.db
pnpm dev

# 3. マイグレーションが適用されたか確認
# （db/index.tsにログを追加）
console.log('Running migrations...');
migrate(db, { migrationsFolder });
console.log('Migrations completed');
```

## デバッグ技術

### 1. コンソールログ

```typescript
// メインプロセス（src/main/ipc.ts）
ipcMain.handle('repo:list', async (): Promise<Repository[]> => {
  console.log('[Main] repo:list called');

  try {
    const repo = new RepositoryRepository(getDatabase());
    const result = await repo.findAll();
    console.log('[Main] repo:list result:', result);
    return result;
  } catch (error) {
    console.error('[Main] repo:list error:', error);
    throw error;
  }
});

// レンダラープロセス（src/renderer/hooks/useRepositories.ts）
export function useRepositories() {
  useEffect(() => {
    console.log('[Renderer] Fetching repositories...');

    window.api.listRepositories()
      .then(repos => {
        console.log('[Renderer] Repositories fetched:', repos);
        setRepositories(repos);
      })
      .catch(error => {
        console.error('[Renderer] Fetch error:', error);
        setError(error);
      });
  }, []);
}
```

### 2. DevTools

```typescript
// DevToolsを自動的に開く（src/main/window.ts）
if (process.env.NODE_ENV === 'development') {
  window.webContents.openDevTools();
}
```

### 3. ネットワーク検査（IPC用）

IPC呼び出しはNetworkタブに表示されませんが、Electronの組み込みIPCインスペクターを使用できます：

```typescript
// src/main/index.ts
if (process.env.NODE_ENV === 'development') {
  app.on('web-contents-created', (_, contents) => {
    contents.on('ipc-message', (event, channel, ...args) => {
      console.log('[IPC]', channel, args);
    });
  });
}
```

### 4. データベース検査

Drizzle Studioを使用してデータベースを検査します：

```bash
pnpm db:studio
```

またはSQLite CLIを使用します：

```bash
sqlite3 ~/Library/Application\ Support/github-pr-reminder/github-pr-reminder.db
sqlite> .tables
sqlite> SELECT * FROM repositories;
```

## IPCハンドラのテスト

IPCハンドラの統合テストを作成します：

```typescript
// src/main/ipc.test.ts
import { ipcMain } from 'electron';
import { setupIpcHandlers } from './ipc';

describe('IPC Handlers', () => {
  beforeEach(() => {
    setupIpcHandlers();
  });

  it('should handle repo:list', async () => {
    const handler = ipcMain.handle as jest.Mock;
    const repoListHandler = handler.mock.calls.find(
      call => call[0] === 'repo:list'
    )[1];

    const result = await repoListHandler();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

## よくある落とし穴

### シリアライゼーションの問題

IPC通信はデータをシリアライズします - 一部の型は境界を越えられません：

```typescript
// ❌ 悪い：関数はシリアライズされない
window.api.getData().then(data => {
  data.doSomething();  // エラー：doSomethingは関数ではない
});

// ✅ 良い：データのみを渡す
interface Data {
  id: string;
  value: number;
}

window.api.getData().then((data: Data) => {
  // データプロパティのみ使用
});
```

### 非同期ハンドラの問題

```typescript
// ❌ 悪い：asyncを忘れた
ipcMain.handle('data:get', () => {
  return fetchData();  // Promiseが待機されていない
});

// ✅ 良い：asyncを使用
ipcMain.handle('data:get', async () => {
  return await fetchData();
});
```

## IPC問題のチェックリスト

- [ ] BrowserWindow設定でプリロードスクリプトパスが正しい
- [ ] contextIsolation: true、nodeIntegration: false
- [ ] 正しいAPIでcontextBridge.exposeInMainWorldが呼び出されている
- [ ] メインプロセスでIPCハンドラが登録されている
- [ ] レンダラー、プリロード、メイン間でチャネル名が一致
- [ ] ハンドラがasyncでPromiseを待機している
- [ ] env.d.tsの型定義がプリロードAPIと一致
- [ ] マイグレーションが正常に実行された
- [ ] デバッグ用にDevToolsが開いている
- [ ] デバッグ用にコンソールログを追加した
