---
paths:
  - "src/renderer/**/hooks/**/*.ts"
  - "src/renderer/**/components/**/*.tsx"
  - "src/main/ipc.ts"
---

# エラーハンドリングパターン

## ユーザー向けエラーメッセージ

**ルール**: 明確で実行可能なエラーメッセージを提供する

```typescript
// ✅ 良い例: ユーザーフレンドリーなエラーメッセージ
function handleError(error: Error) {
  if (error.message.includes('ENOENT')) {
    showNotification('リポジトリが見つかりません。パスを確認してください。');
  } else if (error.message.includes('EACCES')) {
    showNotification('アクセスが拒否されました。フォルダーのアクセス権限を確認してください。');
  } else {
    showNotification('予期しないエラーが発生しました。もう一度お試しください。');
  }
}

// ❌ 悪い例: 生のエラーメッセージ
function handleError(error: Error) {
  alert(error.message); // "ENOENT: no such file or directory"
}
```

## エラー伝播

**ルール**: エラーを黙って握りつぶさない

```typescript
// ✅ 良い例: エラーを伝播またはログ出力
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Data fetch failed');
  }
}

// ❌ 悪い例: エラーを握りつぶす
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    return null; // エラーが失われる
  }
}
```

## エラー境界（React）

**ルール**: コンポーネントレベルのエラーハンドリングにはエラー境界を使用

```typescript
// ✅ 良い例: エラー境界コンポーネント
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>エラーが発生しました。リフレッシュしてください。</div>;
    }
    return this.props.children;
  }
}
```

## 非同期エラーハンドリング

**ルール**: 常にPromise rejectionを処理する

```typescript
// ✅ 良い例: 非同期エラーを処理
async function loadData() {
  try {
    const data = await window.api.fetchData();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    setError('データの読み込みに失敗しました');
  }
}

// ✅ これも良い例: .catch()を使用
window.api.fetchData()
  .then(setData)
  .catch(error => {
    console.error('Error:', error);
    setError('データの読み込みに失敗しました');
  });

// ❌ 悪い例: 未処理のPromise rejection
async function loadData() {
  const data = await window.api.fetchData(); // スローする可能性あり
  setData(data);
}
```
