# GitHub PR Reminder

<p align="center">
  <img src="build/icon.png" alt="GitHub PR Reminder" width="128" height="128">
</p>

GitHub Pull Requestsのレビュー依頼を監視し、デスクトップ通知するトレイアプリケーション。
GitHub CLI（gh）の認証を利用するため、アプリ独自の認証設定は不要です。

## 技術スタック

- **Electron** - クロスプラットフォームデスクトップアプリケーション
- **React + TypeScript** - 型安全なUI
- **TailwindCSS** - ユーティリティファーストスタイリング
- **Drizzle ORM + Better-SQLite3** - ローカルデータベース
- **GitHub CLI** - GitHub APIとの連携

## 主な機能

- 🔔 **自動PR監視** - レビュー依頼されたPRを自動検出してデスクトップ通知
- 📋 **複数リポジトリ管理** - 複数のリポジトリを登録して一括監視
- ⏰ **リマインダー機能** - 定期的なリマインダー通知で対応漏れを防止
- 🔐 **簡単な認証** - GitHub CLIの認証を利用、アプリ独自の設定は不要


| Main View | Setting View |
| --- | --- |
| <img src="refs/pull_requests.png" alt="Main View"> | <img src="refs/settings.png" alt="Setting View"> |

## インストール

### ダウンロード

[Releases](https://github.com/eretica/github_gh_reminder/releases)から最新版をダウンロードしてください。

各プラットフォーム向けのビルドが用意されています：
- **macOS**: `.dmg` ファイル

### macOSでの署名回避（初回起動時）

macOSでは、アプリが署名されていない場合、初回起動時にセキュリティ警告が表示されることがあります。以下のコマンドで回避できます：

```bash
xattr -c /Applications/GitHub\ PR\ Reminder.app
```

または、ダウンロードしたdmgファイルに対して：

```bash
xattr -c ~/Downloads/github-pr-reminder-*.dmg
```

その後、通常通りアプリケーションを開いてください。

## セットアップ

### 1. GitHub CLIのインストールと認証

アプリを使用する前に、GitHub CLI（`gh`コマンド）をインストールし、認証を行います。

**インストール**

macOS:
```bash
brew install gh
```


詳細は[GitHub CLI公式サイト](https://cli.github.com/)を参照してください。

**認証**
```bash
gh auth login
```

### 2. 初期設定

アプリを起動してシステムトレイのアイコンから「設定を開く」を選択します。

**リポジトリを追加**
1. 「リポジトリ」タブで「リポジトリを追加」をクリック
2. ローカルのGitリポジトリフォルダを選択
3. 登録されたリポジトリが自動的に監視されます

<!-- スクリーンショット: リポジトリ追加 -->

**通知を設定**
- チェック間隔: PRを確認する頻度（5分〜60分）
- リマインダー: 定期通知の有効/無効と間隔（1時間〜24時間）

<!-- スクリーンショット: 設定画面 -->

## 使い方

システムトレイのアイコンをクリックすると、レビュー依頼されているPRが一覧表示されます。PR項目をクリックするとブラウザでGitHubページが開きます。

<!-- スクリーンショット: トレイメニューのPRリスト -->

## ライセンス

MIT

## コントリビューション

バグ報告や機能要望は[Issues](https://github.com/eretica/github_gh_reminder/issues)からお願いします。

## サポート

問題が発生した場合：
1. GitHub CLIが正しくインストールされているか確認（`gh --version`）
2. GitHub CLIで認証されているか確認（`gh auth status`）
3. 登録したリポジトリパスが正しいか確認
4. それでも解決しない場合は[Issue](https://github.com/eretica/github_gh_reminder/issues)を作成してください
