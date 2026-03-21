/**
 * DOM解析エンジン
 * page.evaluate() でブラウザ内 JS を実行し、インタラクティブ要素に
 * data-mcp-index 属性を付与して要素情報と状態を返す。
 */

import type { Page } from 'playwright';
import type { ElementInfo, ViewportInfo, PageInfo, ScrollInfo } from './types.js';

/** data-mcp-index 属性名 */
const MCP_INDEX_ATTR = 'data-mcp-index';

/** 1回の解析で取得する要素数の上限（デフォルト） */
const DEFAULT_MAX_ELEMENTS = 200;

/** analyzeDom の返却値（server.ts が domResult.* としてアクセスするため） */
export interface DomAnalysisResult {
  /** ページ URL（page.url() から取得） */
  url: string;
  /** ページタイトル（page.title() から取得） */
  title: string;
  /** インタラクティブ要素一覧（data-mcp-index 付与済み） */
  elements: ElementInfo[];
  /** ビューポートサイズ */
  viewport?: ViewportInfo;
  /** ページ全体サイズ */
  page?: PageInfo;
  /** スクロール位置 */
  scroll?: ScrollInfo;
}

/**
 * DOM内の古い data-mcp-index 属性を全消去する。
 * navigate 後や get_state 再呼び出し前に実行する。
 */
export async function clearIndexAttributes(page: Page): Promise<void> {
  await page.evaluate((attr: string) => {
    const elements = document.querySelectorAll(`[${attr}]`);
    for (const el of Array.from(elements)) {
      el.removeAttribute(attr);
    }
  }, MCP_INDEX_ATTR);
}

/**
 * インタラクティブ要素を解析し、連番インデックスを付与して DomAnalysisResult を返す。
 *
 * 処理順:
 * 1. 古い data-mcp-index を全消去
 * 2. 対象要素を querySelectorAll で全取得
 * 3. 非表示要素を除外
 * 4. viewport 内要素を優先して maxElements まで絞り込み
 * 5. 各要素に data-mcp-index="N" を付与
 * 6. 要素情報・viewport・scroll を収集して返却
 *
 * @param page - Playwright Page オブジェクト
 * @param maxElements - 取得する要素数の上限（デフォルト 200）
 * @returns DomAnalysisResult
 */
export async function analyzeDom(
  page: Page,
  maxElements: number = DEFAULT_MAX_ELEMENTS
): Promise<DomAnalysisResult> {
  // 古い属性を先に消去してから再付与する
  await clearIndexAttributes(page);

  const url = page.url();
  const title = await page.title();

  // ビューポートサイズ（Playwright API から取得）
  const viewportSize = page.viewportSize();
  const viewport: ViewportInfo | undefined = viewportSize
    ? { width: viewportSize.width, height: viewportSize.height }
    : undefined;

  // ブラウザ内 JS でDOM解析・インデックス付与・scroll/page情報取得
  const result = await page.evaluate(
    ({
      attr,
      max,
    }: {
      attr: string;
      max: number;
    }): {
      elements: Array<{
        index: number;
        tag: string;
        text: string;
        placeholder?: string;
        href?: string;
        type?: string;
        value?: string;
        checked?: boolean;
        disabled?: boolean;
        isContentEditable?: boolean;
      }>;
      page: { width: number; height: number };
      scroll: { x: number; y: number };
    } => {
      /** 要素が非表示かどうかを判定 */
      function isHidden(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === 'none') return true;
        if (style.visibility === 'hidden') return true;
        // offsetParent が null の場合は非表示（fixed 要素は除外しない）
        if ((el as HTMLElement).offsetParent === null) {
          if (style.position !== 'fixed') return true;
        }
        return false;
      }

      /** 要素が viewport 内にあるかどうかを判定 */
      function isInViewport(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        return (
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
        );
      }

      /** テキストを 100 文字に切り詰める */
      function truncate(text: string, limit: number = 100): string {
        const trimmed = text.trim().replace(/\s+/g, ' ');
        return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
      }

      // インタラクティブ要素のセレクタ（設計書準拠）
      const selector = [
        'a',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[onclick]',
        '[tabindex]',
        '[contenteditable="true"]',
      ].join(', ');

      const all = Array.from(document.querySelectorAll(selector));

      // 非表示を除外
      const visible = all.filter((el) => !isHidden(el));

      // viewport 内を優先して maxElements まで絞り込む
      const inViewport: Element[] = [];
      const outViewport: Element[] = [];
      for (const el of visible) {
        if (isInViewport(el)) {
          inViewport.push(el);
        } else {
          outViewport.push(el);
        }
      }

      const selected = [...inViewport, ...outViewport].slice(0, max);

      // インデックス付与 & 情報収集
      const elements = selected.map((el, i) => {
        el.setAttribute(attr, String(i));

        const htmlEl = el as HTMLElement;
        const inputEl = el as HTMLInputElement;
        const aEl = el as HTMLAnchorElement;
        const tag = el.tagName.toLowerCase();

        // テキスト: textContent → aria-label → title の順で取得
        const rawText =
          htmlEl.textContent ||
          htmlEl.getAttribute('aria-label') ||
          htmlEl.getAttribute('title') ||
          '';
        const text = truncate(rawText);

        const info: {
          index: number;
          tag: string;
          text: string;
          placeholder?: string;
          href?: string;
          type?: string;
          value?: string;
          checked?: boolean;
          disabled?: boolean;
          isContentEditable?: boolean;
        } = { index: i, tag, text };

        // placeholder（input/textarea）
        const placeholder = htmlEl.getAttribute('placeholder');
        if (placeholder !== null) info.placeholder = placeholder;

        // href（a タグ）
        if (tag === 'a') {
          const href = aEl.getAttribute('href');
          if (href !== null) info.href = href;
        }

        // type（input タグ）
        if (tag === 'input') {
          info.type = inputEl.type || 'text';
          info.value = inputEl.value;
          if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
            info.checked = inputEl.checked;
          }
        } else if (tag === 'select' || tag === 'textarea') {
          info.value = (el as HTMLTextAreaElement | HTMLSelectElement).value;
        }

        // disabled
        const disabled = (htmlEl as HTMLInputElement).disabled;
        if (disabled) info.disabled = true;

        // contenteditable
        if (htmlEl.isContentEditable) info.isContentEditable = true;

        return info;
      });

      return {
        elements,
        page: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        },
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      };
    },
    { attr: MCP_INDEX_ATTR, max: maxElements }
  );

  return {
    url,
    title,
    elements: result.elements as ElementInfo[],
    viewport,
    page: result.page,
    scroll: result.scroll,
  };
}
