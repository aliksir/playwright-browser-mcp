# playwright-browser-mcp

[Playwright](https://playwright.dev/) ベースの軽量ブラウザ自動化MCPサーバー。  
**テレメトリなし。外部通信なし。LLM依存なし。** ローカル完結のブラウザ制御。

[English](README.md) | 日本語

## なぜ作ったか

- テレメトリなし — 閲覧データはローカルに留まる
- Python不要 — Node.jsだけで動く
- APIキー不要 — MCPクライアント（Claude Code等）が全ての推論を担当し、このサーバーはブラウザを操作するだけ

## 特徴

- **14のブラウザツール** — ナビゲーション、クリック、テキスト入力、スクリーンショット、スクロール、タブ、セッション
- **DOM要素インデックス** — インタラクティブ要素に `data-mcp-index` 属性を付与して安定的に識別
- **ビューポート優先** — `browser_get_state` は可視領域の要素を優先して返す（最大200件）
- **機密データマスキング** — クレジットカード番号、SSN、メールアドレスをレスポンスで自動マスク
- **セッション管理** — 複数ブラウザセッション対応、30分で自動クリーンアップ
- **ヘッドレス/ヘッドフルモード** — 環境変数で切替

## クイックスタート

### インストール

```bash
git clone https://github.com/aliksir/playwright-browser-mcp.git
cd playwright-browser-mcp
npm install
npx playwright install chromium
npm run build
```

### 設定

Claude Code の MCP設定（`~/.claude/settings.json`）に追加：

```json
{
  "mcpServers": {
    "playwright-browser": {
      "command": "node",
      "args": ["/path/to/playwright-browser-mcp/dist/index.js"],
      "env": {
        "BROWSER_HEADLESS": "true"
      }
    }
  }
}
```

`BROWSER_HEADLESS` を `"false"` にするとブラウザウィンドウが表示される。

## 利用可能なツール

| ツール | 説明 |
|--------|------|
| `browser_navigate` | URLに移動（`new_tab` で新規タブ対応） |
| `browser_get_state` | インデックス付きインタラクティブ要素を含むページ状態を取得 |
| `browser_click` | 要素インデックスまたは座標でクリック |
| `browser_type` | インデックス指定の要素にテキスト入力（機密データ自動マスク） |
| `browser_screenshot` | スクリーンショット取得（ビューポートまたはフルページ） |
| `browser_scroll` | 上下スクロール（ビューポートの80%分） |
| `browser_go_back` | 履歴を戻る |
| `browser_get_html` | HTML取得（フルページまたはCSSセレクタ指定） |
| `browser_list_tabs` | 開いているタブ一覧 |
| `browser_switch_tab` | タブIDで切替 |
| `browser_close_tab` | タブIDで閉じる |
| `browser_list_sessions` | アクティブなセッション一覧 |
| `browser_close_session` | セッションを閉じる |
| `browser_close_all` | 全セッション・ブラウザを閉じる |

## 典型的なワークフロー

```
1. browser_navigate  → ページを開く
2. browser_get_state → インデックス付き要素を確認
3. browser_click     → インデックスで要素をクリック
4. browser_type      → インデックスで入力欄にテキスト入力
5. browser_screenshot → 結果を目視確認
6. browser_close_all → クリーンアップ
```

## 設計方針

- **外部通信ゼロ** — テレメトリ・クラウド同期・アナリティクスなし。全てローカル完結
- **LLM非依存** — このサーバーはAI APIを呼ばない。MCPクライアントが全ての推論を担当
- **遅延セッションクリーンアップ** — 30分の非アクティブでセッション期限切れ。バックグラウンドタイマーなし
- **ビューポート優先インデックス** — 現在表示中の要素を優先してインデックスを付与

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `BROWSER_HEADLESS` | `true` | `false` でブラウザウィンドウを表示 |

## 技術スタック

- Node.js + TypeScript
- [Playwright](https://playwright.dev/)（ブラウザ自動化）

## ライセンス

MIT
