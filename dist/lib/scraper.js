"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeTargets = scrapeTargets;
const fs_1 = require("fs");
const claude_controlled_collector_1 = require("./claude-controlled-collector");
const yaml = __importStar(require("js-yaml"));
// 固定分岐を完全削除
async function scrapeTargets() {
    const testMode = process.env.X_TEST_MODE === 'true';
    if (testMode) {
        console.log('🤖 完全Claude Code主導による自律収集');
    }
    const collector = new claude_controlled_collector_1.ClaudeControlledCollector();
    const collectionResults = await collector.performParallelCollection();
    // CollectionResultをScrapedDataに変換
    const results = collectionResults.map((result) => ({
        content: result.content,
        url: result.source || 'unknown',
        timestamp: result.timestamp,
        source: result.source || 'claude-controlled'
    }));
    (0, fs_1.writeFileSync)('data/scraped.yaml', yaml.dump(results, { indent: 2 }));
    if (testMode) {
        console.log(`✅ Claude主導収集完了: ${results.length}件`);
    }
    return results;
}
if (require.main === module) {
    scrapeTargets();
}
