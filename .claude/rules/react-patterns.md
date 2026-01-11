---
paths:
  - "src/renderer/**/*.{ts,tsx}"
---

# Reactコンポーネントパターン

## コンポーネント構成

**ルール**: プレゼンテーショナルロジックとコンテナロジックを分離する

```typescript
// ✅ 良い例: プレゼンテーショナルコンポーネント
// components/RepositoryItem.tsx
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

// ❌ 悪い例: データ取得とプレゼンテーションを混在
export function RepositoryItem({ id }: { id: string }) {
  const [repo, setRepo] = useState(null);

  useEffect(() => {
    window.api.getRepository(id).then(setRepo);
  }, [id]);

  return <div>...</div>;
}
```

## カスタムフック

**ルール**: IPCコールをカスタムフックにカプセル化する

```typescript
// ✅ 良い例: データ取得用のカスタムフック
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

// ❌ 悪い例: すべてのコンポーネントでIPCロジックを重複
function RepositoryList() {
  const [repos, setRepos] = useState([]);
  useEffect(() => {
    window.api.listRepositories().then(setRepos);
  }, []);
}
```

## パフォーマンス最適化

**ルール**: パフォーマンス問題を計測した場合にのみメモ化を使用する

**メモ化を使用するタイミング**:
- パフォーマンス問題を計測した場合のみ
- レンダリング毎に実行される高コストな計算
- 大きなリストや複雑なフィルタリング/ソート操作

```typescript
// ✅ 良い例: 高コストな計算をメモ化
function RepositoryList({ repositories }: Props) {
  const sortedRepos = useMemo(() => {
    return [...repositories].sort((a, b) => a.order - b.order);
  }, [repositories]);

  return <div>{sortedRepos.map(repo => <RepositoryItem key={repo.id} />)}</div>;
}

// ✅ これも良い例: 複雑なpropsを持つコンポーネントにReact.memoを使用
export const RepositoryItem = React.memo(({ repository, onToggle }: Props) => {
  return <div>...</div>;
});

// ✅ シンプルなケースには問題なし: 必要になるまでメモ化をスキップ
function RepositoryList({ repositories }: Props) {
  return <div>{repositories.map(repo => <RepositoryItem key={repo.id} />)}</div>;
}

// ❌ 悪い例: 些細な操作の時期尚早な最適化
function Counter({ count }: Props) {
  const doubled = useMemo(() => count * 2, [count]); // 不要
  return <div>{doubled}</div>;
}
```

**注意**: シンプルに始めて、パフォーマンスボトルネックを特定した場合にのみメモ化を追加してください。
