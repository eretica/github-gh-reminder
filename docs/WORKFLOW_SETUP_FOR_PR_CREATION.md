# ClaudeがPRを自動作成できるようにするためのワークフロー設定手順

## 問題
現在、Claudeはブランチの作成までしかできず、PRを自動作成できません。

## 原因
`.github/workflows/claude.yml` で設定されている権限が読み取り専用になっているためです。

## 解決方法

### 手順1: `.github/workflows/claude.yml` を編集

以下の箇所を変更してください：

**変更前（21-26行目）:**
```yaml
permissions:
  contents: read
  pull-requests: read
  issues: read
  id-token: write
  actions: read # Required for Claude to read CI results on PRs
```

**変更後:**
```yaml
permissions:
  contents: write      # read → write に変更（ブランチにプッシュするため）
  pull-requests: write # read → write に変更（PRを作成するため）
  issues: write        # read → write に変更（issue コメントを更新するため）
  id-token: write
  actions: read        # Required for Claude to read CI results on PRs
```

### 手順2: ghコマンドの権限を追加（オプション）

Claudeが `gh pr create` コマンドを使用してPRを作成できるようにするには、`claude_args` に以下を追加します：

**変更前（49行目付近）:**
```yaml
# claude_args: '--allowed-tools Bash(gh pr:*)'
```

**変更後:**
```yaml
claude_args: '--allowed-tools "Bash(gh pr create:*),Bash(gh pr view:*),Bash(gh pr list:*)"'
```

### 完全な設定例

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
    runs-on: ubuntu-latest
    permissions:
      contents: write      # PRのブランチにプッシュするため
      pull-requests: write # PRを作成するため
      issues: write        # issue コメントを更新するため
      id-token: write
      actions: read        # Required for Claude to read CI results on PRs
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude Code
        id: claude
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

          # This is an optional setting that allows Claude to read CI results on PRs
          additional_permissions: |
            actions: read

          # Claude が gh コマンドで PR を作成できるようにする
          claude_args: '--allowed-tools "Bash(gh pr create:*),Bash(gh pr view:*),Bash(gh pr list:*)"'
```

## 動作確認

設定変更後、Claudeにissueで `@claude` とメンションすると：
1. 新しいブランチを作成
2. コードを変更してコミット
3. プッシュ
4. **PRを自動作成**（新機能！）

## 注意事項

- この変更により、Claudeはリポジトリへの書き込み権限を持つようになります
- セキュリティ上、必要最小限の権限のみを付与してください
- `claude_args` で許可するコマンドを制限することで、セキュリティを強化できます
