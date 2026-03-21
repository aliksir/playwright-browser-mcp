import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  env: { ...process.env, BROWSER_HEADLESS: 'true' },
});

const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

try {
  await client.connect(transport);
  console.log('Connected to MCP server\n');

  // T01: List tools
  console.log('--- T01: List tools ---');
  const tools = await client.listTools();
  assert('14 tools available', tools.tools.length === 14);
  for (const t of tools.tools) {
    console.log(`    ${t.name}`);
  }

  // T03: Navigate
  console.log('\n--- T03: browser_navigate ---');
  const navResult = await client.callTool({ name: 'browser_navigate', arguments: { url: 'https://example.com' } });
  assert('Navigate returns text', navResult.content[0].text.includes('Navigated to'));

  // T04: Get state
  console.log('\n--- T04: browser_get_state ---');
  const stateResult = await client.callTool({ name: 'browser_get_state', arguments: {} });
  const state = JSON.parse(stateResult.content[0].text);
  assert('URL is example.com', state.url.includes('example.com'));
  assert('Title exists', state.title.length > 0);
  assert('interactive_elements is array', Array.isArray(state.interactive_elements));
  assert('Elements have index', state.interactive_elements.length > 0 && state.interactive_elements[0].index !== undefined);
  console.log(`    Elements found: ${state.interactive_elements.length}`);
  for (const el of state.interactive_elements.slice(0, 3)) {
    console.log(`    [${el.index}] <${el.tag}> ${el.text.slice(0, 40)} ${el.href ? '→ ' + el.href : ''}`);
  }

  // T08: Screenshot
  console.log('\n--- T08: browser_screenshot ---');
  const ssResult = await client.callTool({ name: 'browser_screenshot', arguments: {} });
  const hasImage = ssResult.content.some(c => c.type === 'image');
  assert('Screenshot returns image', hasImage);

  // T09: Scroll
  console.log('\n--- T09: browser_scroll ---');
  const scrollResult = await client.callTool({ name: 'browser_scroll', arguments: { direction: 'down' } });
  assert('Scroll returns text', scrollResult.content[0].text.includes('Scrolled'));

  // T11: Get HTML
  console.log('\n--- T11: browser_get_html ---');
  const htmlResult = await client.callTool({ name: 'browser_get_html', arguments: { selector: 'h1' } });
  assert('H1 HTML returned', htmlResult.content[0].text.includes('Example'));

  // T12: Get HTML (selector)
  console.log('\n--- T12: browser_get_html (selector) ---');
  const htmlResult2 = await client.callTool({ name: 'browser_get_html', arguments: { selector: 'p' } });
  assert('P element returned', htmlResult2.content[0].text.length > 0);

  // T13: List tabs
  console.log('\n--- T13: browser_list_tabs ---');
  const tabsResult = await client.callTool({ name: 'browser_list_tabs', arguments: {} });
  const tabs = JSON.parse(tabsResult.content[0].text);
  assert('Tabs is array', Array.isArray(tabs));
  assert('At least 1 tab', tabs.length >= 1);
  const firstTabId = tabs[0].tab_id;
  console.log(`    Tab ID: ${firstTabId}`);

  // T16: List sessions
  console.log('\n--- T16: browser_list_sessions ---');
  const sessResult = await client.callTool({ name: 'browser_list_sessions', arguments: {} });
  const sessions = JSON.parse(sessResult.content[0].text);
  assert('Sessions is array', Array.isArray(sessions));
  assert('At least 1 session', sessions.length >= 1);

  // T10: Go back (navigate to second page first)
  console.log('\n--- T10: browser_go_back ---');
  await client.callTool({ name: 'browser_navigate', arguments: { url: 'https://example.org' } });
  const backResult = await client.callTool({ name: 'browser_go_back', arguments: {} });
  assert('Go back returns text', backResult.content[0].text.includes('Navigated back'));

  // T18: Close all
  console.log('\n--- T18: browser_close_all ---');
  const closeResult = await client.callTool({ name: 'browser_close_all', arguments: {} });
  assert('Close all returns text', closeResult.content[0].text.includes('Closed all'));

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed === 0) {
    console.log('ALL TESTS PASSED');
  }

} catch (err) {
  console.error('Test failed:', err.message, err.stack);
  failed++;
} finally {
  await client.close().catch(() => {});
  process.exit(failed > 0 ? 1 : 0);
}
