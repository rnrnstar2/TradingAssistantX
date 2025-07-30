/**
 * TwitterAPI.io login_cookie管理システム
 * REQUIREMENTS.md準拠 - セッション管理機能
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { LoginResult, SessionData } from "./types";

export class SessionManager {
  private sessionData: SessionData | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間
  private readonly SESSION_FILE_PATH = path.join(
    process.cwd(),
    "data",
    "config",
    "twitter-session.yaml"
  );

  constructor() {
    // 起動時に既存のセッションを読み込み
    this.loadSession();
  }

  /**
   * login_cookieを保存
   */
  saveSession(loginResult: LoginResult): void {
    if (!loginResult.success || !loginResult.login_cookie) {
      throw new Error("Invalid login result for session save");
    }

    this.sessionData = {
      sessionId: `session_${Date.now()}`,
      userId: loginResult.user_info?.id || "unknown_user",
      cookies: loginResult.login_cookie,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastUpdated: Date.now(),
      status: "active",
    };

    // ファイルに保存
    this.persistSession();

    console.log("✅ Session saved successfully");
    console.log(
      `🕐 Session expires at: ${new Date(this.sessionData.expiresAt).toISOString()}`,
    );
  }

  /**
   * 有効な login_cookie を取得
   */
  getValidCookie(): string | null {
    if (!this.sessionData) {
      console.log("❌ No session data available");
      return null;
    }

    if (Date.now() > this.sessionData.expiresAt) {
      console.log("⏰ Session expired, clearing data");
      this.sessionData = null;
      return null;
    }

    return this.sessionData.cookies;
  }

  /**
   * セッション有効性確認
   */
  isSessionValid(): boolean {
    return this.getValidCookie() !== null;
  }

  /**
   * セッション情報取得
   */
  getSessionInfo(): SessionData | null {
    if (!this.isSessionValid()) {
      return null;
    }
    return { ...this.sessionData! };
  }

  /**
   * セッションクリア
   */
  clearSession(): void {
    this.sessionData = null;
    // ファイルも削除
    try {
      if (fs.existsSync(this.SESSION_FILE_PATH)) {
        fs.unlinkSync(this.SESSION_FILE_PATH);
      }
    } catch (error) {
      console.error("Failed to delete session file:", error);
    }
    console.log("🧹 Session cleared");
  }

  /**
   * セッション統計取得
   */
  getSessionStats(): {
    hasSession: boolean;
    timeRemaining: number;
    expiresAt: string | null;
  } {
    if (!this.sessionData) {
      return {
        hasSession: false,
        timeRemaining: 0,
        expiresAt: null,
      };
    }

    const timeRemaining = Math.max(0, this.sessionData.expiresAt - Date.now());

    return {
      hasSession: true,
      timeRemaining,
      expiresAt: new Date(this.sessionData.expiresAt).toISOString(),
    };
  }

  /**
   * セッションをファイルに永続化
   */
  private persistSession(): void {
    if (!this.sessionData) return;

    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(this.SESSION_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // YAMLファイルとして保存
      const yamlContent = yaml.dump(this.sessionData);
      fs.writeFileSync(this.SESSION_FILE_PATH, yamlContent, "utf8");
      console.log("💾 Session persisted to file");
    } catch (error) {
      console.error("Failed to persist session:", error);
    }
  }

  /**
   * ファイルからセッションを読み込み
   */
  private loadSession(): void {
    try {
      if (fs.existsSync(this.SESSION_FILE_PATH)) {
        const yamlContent = fs.readFileSync(this.SESSION_FILE_PATH, "utf8");
        const loadedData = yaml.load(yamlContent) as SessionData;
        
        // 有効期限チェック
        if (loadedData && Date.now() < loadedData.expiresAt) {
          this.sessionData = loadedData;
          console.log("📂 Session loaded from file");
          console.log(
            `🕐 Session expires at: ${new Date(loadedData.expiresAt).toISOString()}`
          );
        } else {
          console.log("⏰ Stored session expired, clearing");
          this.clearSession();
        }
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  }
}
