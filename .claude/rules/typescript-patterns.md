---
paths:
  - "src/**/*.{ts,tsx}"
  - "tsconfig.json"
---

# TypeScriptベストプラクティス

## 厳格な型安全性

**ルール**: TypeScriptの型システムを最大限に活用する

```typescript
// ✅ 良い例: 明示的な型を定義
interface Repository {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  order: number;
}

function updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
  // 実装
}

// ❌ 悪い例: 'any'を使用または型なし
function updateRepository(id, updates) {
  // 型安全性なし
}
```

## 共有型

**ルール**: プロセス間で使用する型定義は`src/shared/types.ts`に集約する

```typescript
// ✅ 良い例: src/shared/types.tsで共有型を定義
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

// MainとRendererの両方で使用
// src/main/ipc.ts
import type { Repository, IpcApi } from '../shared/types';

// src/renderer/hooks/useRepositories.ts
import type { Repository } from '../../shared/types';

// ❌ 悪い例: 型定義を重複
// main/types.ts
interface Repo { ... }

// renderer/types.ts
interface Repository { ... } // 異なる名前、類似した構造
```
