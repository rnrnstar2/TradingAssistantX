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
exports.loadYamlSafe = loadYamlSafe;
exports.loadYamlArraySafe = loadYamlArraySafe;
const yaml = __importStar(require("js-yaml"));
const fs_1 = require("fs");
/**
 * MVP準拠: シンプルで実用的な型安全なYAML読み込み関数
 *
 * @param filePath - YAMLファイルのパス
 * @returns パースされたデータ、エラー時はnull
 */
function loadYamlSafe(filePath) {
    try {
        const data = yaml.load((0, fs_1.readFileSync)(filePath, 'utf8'));
        return data; // 実用的アプローチ
    }
    catch (error) {
        console.error(`YAML読み込みエラー: ${filePath}`, error);
        return null;
    }
}
/**
 * YAML配列データの型安全読み込み
 *
 * @param filePath - YAMLファイルのパス
 * @returns パースされた配列データ、エラー時は空配列
 */
function loadYamlArraySafe(filePath) {
    try {
        const data = yaml.load((0, fs_1.readFileSync)(filePath, 'utf8'));
        if (Array.isArray(data)) {
            return data;
        }
        console.warn(`YAML読み込み警告: ${filePath} - 配列でないデータが返されました`);
        return [];
    }
    catch (error) {
        console.error(`YAML配列読み込みエラー: ${filePath}`, error);
        return [];
    }
}
