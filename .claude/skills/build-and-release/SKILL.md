---
name: build-and-release
description: 新しいバージョンのリリース作業を自動化（バージョン更新、コミット、タグ作成、プッシュ）
---

# リリース自動化

このスキルを実行すると、新しいバージョンのリリース作業を全て自動化します。

## 実行前の確認

以下を確認してください：
- Git の作業ディレクトリがクリーンな状態
- main ブランチにいること
- リモートにプッシュ権限があること

## 実行内容

1. Git リポジトリの状態を確認
2. 現在のバージョンを package.json から取得
3. 新しいバージョン番号をユーザーに確認
4. package.json のバージョンを更新
5. 変更をコミット
6. バージョンタグを作成
7. main ブランチとタグを GitHub にプッシュ
8. GitHub Actions が自動的にビルド・リリースを実行

## 使用方法

```bash
# バージョン番号を対話的に選択
/build-and-release

# バージョン番号を指定
/build-and-release 1.0.1
```

## 実行手順

### ステップ 1: Git 状態の確認

まず、Git リポジトリの状態を確認します：

```bash
git status
```

コミットされていない変更がある場合は、以下のメッセージを表示して中断：
```
⚠️ エラー: コミットされていない変更があります。
先に変更をコミットまたは stash してください。
```

### ステップ 2: ブランチの確認

現在のブランチを確認します：

```bash
git branch --show-current
```

main ブランチでない場合は警告を表示：
```
⚠️ 警告: 現在 main ブランチにいません。
現在のブランチ: {branch_name}
このまま続けますか？
```

### ステップ 3: 現在のバージョンを取得

`package.json` を読み取って現在のバージョンを取得します。

例：現在のバージョンが `1.0.0` の場合

### ステップ 4: 新しいバージョンの決定

コマンドライン引数でバージョンが指定されている場合はそれを使用します。

指定されていない場合は、`AskUserQuestion` で選択肢を提示：

- **Patch** (1.0.0 → 1.0.1): バグ修正やマイナーな変更
- **Minor** (1.0.0 → 1.1.0): 新機能の追加
- **Major** (1.0.0 → 2.0.0): 破壊的な変更
- **Custom**: 手動でバージョンを入力

バージョン番号の計算：
- Patch: パッチ番号を +1
- Minor: マイナー番号を +1、パッチ番号を 0 にリセット
- Major: メジャー番号を +1、マイナーとパッチを 0 にリセット

### ステップ 5: タグの存在確認

指定されたバージョンのタグが既に存在するか確認：

```bash
git tag -l "v{version}"
```

既に存在する場合はエラーを表示して中断：
```
❌ エラー: タグ v{version} は既に存在します。
別のバージョン番号を指定してください。
```

### ステップ 6: package.json の更新

`Edit` ツールで `package.json` の `version` フィールドを更新します。

例：
```json
"version": "1.0.1"
```

### ステップ 7: Git 操作の実行

順次、以下のコマンドを実行します：

```bash
# 変更をステージング（package.json と pnpm-lock.yaml が更新される）
git add package.json pnpm-lock.yaml

# コミット
git commit -m "chore: Bump version to v{version}"

# タグ作成
git tag v{version}

# main ブランチをプッシュ
git push origin main

# タグをプッシュ
git push origin v{version}
```

**重要**: 各コマンドを順次実行し、エラーが発生した場合は即座に中断してください。

### ステップ 8: 完了メッセージの表示

全ての操作が成功したら、以下の情報をユーザーに表示：

```
✅ リリース v{version} の準備が完了しました！

📦 実行内容：
  - package.json のバージョンを {old_version} → {new_version} に更新
  - 変更をコミット: "chore: Bump version to v{version}"
  - タグを作成: v{version}
  - GitHub にプッシュ完了

🚀 GitHub Actions: https://github.com/eretica/github_gh_reminder/actions
📋 Releases: https://github.com/eretica/github_gh_reminder/releases

次のステップ：
1. GitHub Actions でビルドが完了するのを待つ（約5-10分）
2. ドラフトリリースの内容を確認
3. リリースノートを追加（オプション）
4. "Publish release" をクリックして公開
```

## エラーハンドリング

各ステップで発生する可能性のあるエラーに対処してください：

- **Git が dirty**: ステップ 1 で中断
- **main ブランチでない**: ステップ 2 で警告、ユーザーの確認を待つ
- **タグが既に存在**: ステップ 5 で中断
- **Git コマンド失敗**: 該当ステップで中断、エラーメッセージを表示

## 注意事項

- このスキルは破壊的な操作（git push）を含みます
- タグをプッシュすると GitHub Actions が自動的にリリースプロセスを開始します
- ドラフトリリースが作成されるため、公開前に内容を確認できます
- 一度プッシュしたタグは削除しないでください（GitHub Actions がトリガーされます）
