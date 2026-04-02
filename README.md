# playwright-browser-mcp

English | [日本語](README.ja.md)

A lightweight, standalone browser automation MCP server powered by [Playwright](https://playwright.dev/).  
**No telemetry. No external connections. No LLM dependency.** Just local browser control.

## Why?

**Pure local browser automation** via the [Model Context Protocol](https://modelcontextprotocol.io/).

- No telemetry — your browsing data stays on your machine
- No Python required — just Node.js
- No API keys needed — your MCP client (Claude Code, etc.) handles all reasoning; this server just drives the browser

## Features

- **14 browser tools** — navigate, click, type, screenshot, scroll, tabs, sessions
- **DOM element indexing** — interactive elements get `data-mcp-index` attributes for stable identification
- **Viewport-first prioritization** — `browser_get_state` returns visible elements first (up to 200)
- **Sensitive data masking** — credit card numbers, SSNs, and emails are automatically masked in responses
- **Session management** — multiple browser sessions with 30-minute auto-cleanup
- **Headless/headed mode** — toggle via environment variable

## Quick Start

### Install

```bash
git clone https://github.com/aliksir/playwright-browser-mcp.git
cd playwright-browser-mcp
npm install
npx playwright install chromium
npm run build
```

### Configure

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

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

Set `BROWSER_HEADLESS` to `"false"` to see the browser window.

## Available Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL (supports `new_tab`) |
| `browser_get_state` | Get page state with indexed interactive elements |
| `browser_click` | Click by element index or coordinates |
| `browser_type` | Type text into an element (sensitive data auto-masked) |
| `browser_screenshot` | Take a screenshot (viewport or full page) |
| `browser_scroll` | Scroll up or down (80% of viewport) |
| `browser_go_back` | Navigate back in history |
| `browser_get_html` | Get HTML content (full page or CSS selector) |
| `browser_list_tabs` | List all open tabs |
| `browser_switch_tab` | Switch to a tab by ID |
| `browser_close_tab` | Close a tab by ID |
| `browser_list_sessions` | List active browser sessions |
| `browser_close_session` | Close a specific session |
| `browser_close_all` | Close all sessions and browsers |

## Typical Workflow

```
1. browser_navigate  → open a page
2. browser_get_state → see interactive elements with indices
3. browser_click     → click element by index
4. browser_type      → type into input by index
5. browser_screenshot → verify the result
6. browser_close_all → clean up
```

## Design Decisions

- **Zero external connections** — no telemetry, no cloud sync, no analytics. Everything stays local.
- **No LLM dependency** — this server doesn't call any AI APIs. Your MCP client handles all reasoning.
- **Lazy session cleanup** — sessions expire after 30 minutes of inactivity, checked on each tool call (no background timers).
- **Viewport-first element indexing** — elements currently visible in the viewport are prioritized and indexed first.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_HEADLESS` | `true` | Set to `false` to show the browser window |

## Tech Stack

- Node.js + TypeScript
- [Playwright](https://playwright.dev/) (browser automation)
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) (MCP server)

## License

MIT
