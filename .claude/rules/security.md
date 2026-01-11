# セキュリティベストプラクティス

**注意**: このルールはグローバルに適用されます（pathsフロントマターなし）。セキュリティは全ファイルで重要です。

## 入力検証

**ルール**: システム境界で全てのユーザー入力を検証する

```typescript
// ✅ Good: Validate inputs
function processPath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  // パストラバーサルを防止
  if (path.includes('..')) {
    throw new Error('Invalid path: path traversal detected');
  }

  return path.trim();
}

// ❌ Bad: No validation
function processPath(path: string): string {
  return path;
}
```

## シークレット管理

**ルール**: シークレットやAPIキーを絶対にコミットしない

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.GITHUB_API_KEY;
if (!apiKey) {
  throw new Error('GITHUB_API_KEY not set');
}

// ❌ Bad: Hardcoded secrets
const apiKey = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

**絶対にコミットしてはいけないファイル:**
- `.env`
- `.env.local`
- `credentials.json`
- `*.key`
- `*.pem`

## XSS防止

**ルール**: レンダリング前にユーザーコンテンツをサニタイズする

```typescript
// ✅ Good: Use React's built-in XSS protection
function DisplayName({ name }: { name: string }) {
  return <span>{name}</span>; // 自動的にエスケープされる
}

// ⚠️ Dangerous: Only use dangerouslySetInnerHTML when necessary
function DisplayHTML({ html }: { html: string }) {
  // DOMPurifyなどで先にサニタイズ
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ❌ Bad: Unsanitized HTML
function DisplayHTML({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## コマンドインジェクション防止

**ルール**: サニタイズされていないユーザー入力をシェルコマンドに渡さない

```typescript
// ✅ Good: Use parameterized commands
import { execFile } from 'node:child_process';

function runGitCommand(repoPath: string) {
  // パスを先に検証
  if (!isValidPath(repoPath)) {
    throw new Error('Invalid repository path');
  }

  // execではなくexecFileを使用（シェル解釈なし）
  execFile('git', ['status'], { cwd: repoPath }, (error, stdout) => {
    if (error) throw error;
    return stdout;
  });
}

// ❌ Bad: Shell injection vulnerable
import { exec } from 'node:child_process';

function runGitCommand(repoPath: string) {
  exec(`cd ${repoPath} && git status`, (error, stdout) => {
    // repoPathに悪意ある入力が含まれる場合、インジェクションに脆弱
    return stdout;
  });
}
```

## 依存関係のセキュリティ

**ルール**: 依存関係を最新に保ち、定期的に監査する

```bash
# 脆弱性をチェック
pnpm audit

# 依存関係を更新
pnpm update

# セキュリティアドバイザリを確認
npm audit
```

**ベストプラクティス:**
- リリース前に`pnpm audit`を実行
- 本番ビルドではpackage.jsonで厳密なバージョンを固定
- PRで依存関係の変更をレビュー
- `package-lock.json`または`pnpm-lock.yaml`を使用

## Electron固有のセキュリティ

**ルール**: Electronセキュリティチェックリストに従う

詳細は`electron-patterns.md`を参照:
- コンテキスト分離（必須で有効化）
- rendererでnodeIntegrationを無効化
- Content Security Policy
- 安全なIPC通信
