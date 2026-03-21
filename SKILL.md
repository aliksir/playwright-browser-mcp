# playwright-browser-mcp

Playwright-based browser automation MCP server. Local-only, no telemetry, no external connections.

## Setup

### MCP Server Configuration

Add to your Claude Code settings (`~/.claude/settings.json` or project settings):

```json
{
  "mcpServers": {
    "playwright-browser": {
      "command": "node",
      "args": ["C:/work/playwright-browser-mcp/dist/index.js"],
      "env": {
        "BROWSER_HEADLESS": "true"
      }
    }
  }
}
```

Set `BROWSER_HEADLESS` to `"false"` to see the browser window.

### Install Dependencies

```bash
cd C:/work/playwright-browser-mcp
npm install
npx playwright install chromium
npm run build
```

## Available Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL (supports new_tab) |
| `browser_get_state` | Get page state with indexed interactive elements |
| `browser_click` | Click by element index or coordinates |
| `browser_type` | Type text into an element by index |
| `browser_screenshot` | Take a screenshot (viewport or full page) |
| `browser_scroll` | Scroll up or down (80% of viewport) |
| `browser_go_back` | Navigate back in history |
| `browser_get_html` | Get HTML (full page or CSS selector) |
| `browser_list_tabs` | List open tabs |
| `browser_switch_tab` | Switch to a tab by ID |
| `browser_close_tab` | Close a tab by ID |
| `browser_list_sessions` | List active sessions |
| `browser_close_session` | Close a session by ID |
| `browser_close_all` | Close all sessions |

## Typical Workflow

1. `browser_navigate` to a URL
2. `browser_get_state` to see interactive elements with indices
3. `browser_click` or `browser_type` using element indices
4. `browser_screenshot` to verify results
5. `browser_close_all` when done

## Key Design Decisions

- **No external connections**: Zero telemetry, no cloud sync, no analytics
- **No LLM dependency**: Claude Code itself makes all decisions
- **data-mcp-index attributes**: Elements get `data-mcp-index="N"` for stable identification
- **Viewport-first**: `browser_get_state` prioritizes elements in the viewport (max 200)
- **Headless by default**: Set `BROWSER_HEADLESS=false` for visible browser
