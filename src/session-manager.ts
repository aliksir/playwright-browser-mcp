/**
 * セッション管理
 * 複数ブラウザセッションをインメモリ（Map）で管理する。
 * タイムアウトはタイマーではなくツール呼び出し時の lazy check で処理する。
 */

import type { Session } from './types.js';

/** デフォルトのセッションタイムアウト（30分） */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * セッション管理クラス。
 * MCPサーバーのライフサイクルに合わせてシングルトンで使用する想定。
 *
 * タイムアウト設計:
 * setInterval を使わず、各ツール呼び出し時（cleanupExpired）に
 * 期限切れセッションを lazy に削除する。
 * これにより、バックグラウンドタイマーによるリソースリークを防ぐ。
 */
export class SessionManager {
  /** セッションストア */
  private readonly sessions: Map<string, Session> = new Map();

  /** セッションタイムアウト（ms）。startCleanupTimer で設定 */
  private timeoutMs: number = DEFAULT_TIMEOUT_MS;

  /**
   * セッションを登録する。
   * 同じ ID が既に存在する場合は last_activity を更新する。
   *
   * @param id - セッション識別子
   */
  createSession(id: string): void {
    const now = Date.now();
    const existing = this.sessions.get(id);
    if (existing !== undefined) {
      existing.last_activity = now;
      return;
    }
    this.sessions.set(id, {
      id,
      created_at: now,
      last_activity: now,
    });
  }

  /**
   * セッションの最終アクティビティ日時を現在時刻に更新する。
   * セッションが存在しない場合は何もしない。
   *
   * @param id - セッション識別子
   */
  updateActivity(id: string): void {
    const session = this.sessions.get(id);
    if (session !== undefined) {
      session.last_activity = Date.now();
    }
  }

  /**
   * セッションを取得する。
   *
   * @param id - セッション識別子
   * @returns Session | undefined
   */
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  /**
   * 全セッションの一覧を返す。
   *
   * @returns Session[]
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 指定セッションを削除する。
   *
   * @param id - セッション識別子
   */
  removeSession(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * 全セッションを削除する。
   */
  removeAll(): void {
    this.sessions.clear();
  }

  /**
   * タイムアウト値を設定する（lazy check で使用）。
   *
   * setInterval を使わない設計:
   * バックグラウンドタイマーはプロセス終了を妨げる可能性があるため、
   * ツール呼び出し時に cleanupExpired() を呼ぶことでタイムアウトを処理する。
   *
   * @param timeoutMs - タイムアウト時間（ms）。デフォルト 30 分
   */
  startCleanupTimer(timeoutMs: number = DEFAULT_TIMEOUT_MS): void {
    this.timeoutMs = timeoutMs;
  }

  /**
   * 期限切れセッションを削除し、削除したセッション ID の配列を返す。
   * ツール呼び出しの冒頭で呼ぶことで lazy check を実現する。
   *
   * @returns 削除されたセッション ID の配列
   */
  cleanupExpired(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now - session.last_activity > this.timeoutMs) {
        expired.push(id);
        this.sessions.delete(id);
      }
    }

    return expired;
  }
}
