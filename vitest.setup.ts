// Vitest setup file
// テスト環境のセットアップとグローバル設定

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// グローバルタイムアウト設定
const TEST_TIMEOUT = 90000  // 90秒
const HOOK_TIMEOUT = 60000  // 60秒

// Playwrightブラウザプール管理
let activeBrowsers = new Set()
let activePages = new Set()

// テスト全体の前処理
beforeAll(async () => {
  // ブラウザプール初期化
  activeBrowsers.clear()
  activePages.clear()
  
  // グローバルタイムアウト適用
  if (typeof globalThis.setTimeout !== 'undefined') {
    // Node.js環境でのタイムアウト設定
    globalThis.defaultTestTimeout = TEST_TIMEOUT
  }
}, HOOK_TIMEOUT)

// 各テストの前処理
beforeEach(async () => {
  // テスト開始前のリソースクリーンアップ
  await cleanupResources()
}, HOOK_TIMEOUT)

// 各テストの後処理
afterEach(async () => {
  // テスト終了後のリソースクリーンアップ
  await cleanupResources()
}, HOOK_TIMEOUT)

// テスト全体の後処理
afterAll(async () => {
  // 全てのリソースを確実にクリーンアップ
  await cleanupResources()
  activeBrowsers.clear()
  activePages.clear()
}, HOOK_TIMEOUT)

// リソースクリーンアップ関数
async function cleanupResources() {
  // アクティブページのクリーンアップ
  for (const page of activePages) {
    try {
      if (!page.isClosed()) {
        await page.close()
      }
    } catch (error) {
      // ページが既に閉じられている場合は無視
    }
  }
  activePages.clear()

  // アクティブブラウザのクリーンアップ
  for (const browser of activeBrowsers) {
    try {
      if (browser && !browser.isConnected()) {
        await browser.close()
      }
    } catch (error) {
      // ブラウザが既に閉じられている場合は無視
    }
  }
  activeBrowsers.clear()
}

// Playwrightリソース追跡用のヘルパー関数
globalThis.trackBrowser = (browser) => {
  activeBrowsers.add(browser)
  return browser
}

globalThis.trackPage = (page) => {
  activePages.add(page)
  return page
}

globalThis.untrackBrowser = (browser) => {
  activeBrowsers.delete(browser)
}

globalThis.untrackPage = (page) => {
  activePages.delete(page)
}