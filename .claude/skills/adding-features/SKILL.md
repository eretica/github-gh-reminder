---
name: adding-features
description: Step-by-step guide for adding new feature modules to the renderer process using feature-based architecture
---

# 新機能の追加

このガイドは、アプリケーションのレンダラー側に新機能を追加するためのステップバイステップの手順を提供します。

## 前提条件

- フィーチャーベースアーキテクチャの理解（CLAUDE.md § 12.2参照）
- Reactフックとコンポーネントの知識

## ステップバイステップガイド

### 1. フィーチャーディレクトリ構造の作成

```bash
mkdir -p src/renderer/features/<feature-name>/{components,hooks,utils}
```

### 2. フィーチャーコンポーネントの実装

`features/<feature-name>/components/`にコンポーネントファイルを作成します：

```typescript
// components/FeatureItem.tsx
import type { Feature } from '../../../shared/types';

interface FeatureItemProps {
  feature: Feature;
  onAction: (id: string) => void;
}

export function FeatureItem({ feature, onAction }: FeatureItemProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <span>{feature.name}</span>
      <button onClick={() => onAction(feature.id)}>
        Action
      </button>
    </div>
  );
}
```

### 3. カスタムフックの作成

`features/<feature-name>/hooks/`にフックファイルを作成します：

```typescript
// hooks/useFeatures.ts
import { useState, useEffect } from 'react';
import type { Feature } from '../../../shared/types';

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    window.api.listFeatures()
      .then(setFeatures)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const addFeature = async (data: Partial<Feature>) => {
    const newFeature = await window.api.addFeature(data);
    setFeatures(prev => [...prev, newFeature]);
  };

  return { features, loading, error, addFeature };
}
```

### 4. ユーティリティ関数の追加（必要な場合）

フィーチャー固有のユーティリティがある場合は、`utils/`にファイルを作成します：

```typescript
// utils/formatting.ts
export function formatFeatureStatus(status: string): string {
  return status.toUpperCase();
}
```

```typescript
// utils/formatting.test.ts
import { formatFeatureStatus } from './formatting';

describe('formatFeatureStatus', () => {
  it('should uppercase status', () => {
    expect(formatFeatureStatus('active')).toBe('ACTIVE');
  });
});
```

### 5. パブリックAPIの作成

フィーチャーディレクトリに`index.ts`を作成します：

```typescript
// features/<feature-name>/index.ts
export { FeatureItem } from './components/FeatureItem';
export { FeatureList } from './components/FeatureList';
export { useFeatures } from './hooks/useFeatures';
export * from './utils/constants';
```

### 6. IPC APIの追加（必要な場合）

フィーチャーが新しいIPCチャネルを必要とする場合：

#### 6.1 共有型の定義
```typescript
// src/shared/types.ts
export interface Feature {
  id: string;
  name: string;
  enabled: boolean;
}
```

#### 6.2 IPCチャネルの追加
```typescript
// src/shared/constants.ts
export const IPC_CHANNELS = {
  // ... 既存のチャネル
  FEATURE_LIST: 'feature:list',
  FEATURE_ADD: 'feature:add',
} as const;
```

#### 6.3 ハンドラの実装
```typescript
// src/main/ipc.ts
ipcMain.handle(IPC_CHANNELS.FEATURE_LIST, async (): Promise<Feature[]> => {
  const repo = new FeatureRepository(getDatabase());
  return await repo.findAll();
});
```

#### 6.4 プリロードAPIの追加
```typescript
// src/preload/index.ts
api: {
  // ... 既存のメソッド
  listFeatures: () => ipcRenderer.invoke(IPC_CHANNELS.FEATURE_LIST),
  addFeature: (data) => ipcRenderer.invoke(IPC_CHANNELS.FEATURE_ADD, data),
}
```

### 7. ページコンポーネントでの使用

フィーチャーのパブリックAPIからインポートします：

```typescript
// pages/FeaturePage.tsx
import { FeatureList } from '../features/<feature-name>';
import { useFeatures } from '../features/<feature-name>';

export function FeaturePage() {
  const { features, loading, error } = useFeatures();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <FeatureList features={features} />;
}
```

### 8. テスト

実装と並行してテストを作成します：

```bash
# コンポーネントテスト
features/<feature-name>/components/FeatureItem.test.tsx

# フックテスト
features/<feature-name>/hooks/useFeatures.test.tsx

# ユーティリティテスト
features/<feature-name>/utils/formatting.test.ts
```

### 9. 検証

```bash
# 型チェック
pnpm typecheck

# テスト実行
pnpm test

# ビルド
pnpm build

# アプリ実行
pnpm dev
```

## 一般的なパターン

### 共有UIコンポーネント

Tabs、Toast、ConfirmDialogが必要な場合：

```typescript
import { Tabs, Toast, ConfirmDialog } from '../components/ui';
```

### エラーハンドリング

```typescript
export function useFeatures() {
  const { showToast } = useToast();

  const addFeature = async (data: Partial<Feature>) => {
    try {
      const newFeature = await window.api.addFeature(data);
      setFeatures(prev => [...prev, newFeature]);
      showToast('Feature added successfully', 'success');
    } catch (error) {
      showToast('Failed to add feature', 'error');
      console.error(error);
    }
  };

  return { features, addFeature };
}
```

## チェックリスト

- [ ] components/、hooks/、utils/を含むフィーチャーディレクトリを作成した
- [ ] TypeScript型を使用してコンポーネントを実装した
- [ ] データフェッチ用のカスタムフックを作成した
- [ ] ユーティリティのテストを作成した（該当する場合）
- [ ] index.ts経由でパブリックAPIをエクスポートした
- [ ] IPCチャネルを追加した（必要な場合）
- [ ] shared/types.tsで型を定義した
- [ ] ページコンポーネントがパブリックAPIからインポートしている
- [ ] テストを作成し、合格した
- [ ] 型チェックが通る（`pnpm typecheck`）
- [ ] アプリが正常にビルドできる（`pnpm build`）
