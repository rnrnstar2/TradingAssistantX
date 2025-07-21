#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const autonomous_executor_js_1 = require("../core/autonomous-executor.js");
async function main() {
    console.log('🚀 TradingAssistantX 単発実行開始');
    console.log(`📅 開始時刻: ${new Date().toISOString()}`);
    const executor = new autonomous_executor_js_1.AutonomousExecutor();
    try {
        await executor.executeAutonomously();
        console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 単発実行完了`);
    }
    catch (error) {
        console.error(`❌ [${new Date().toLocaleTimeString('ja-JP')}] 実行エラー:`, error);
        process.exit(1);
    }
}
main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
