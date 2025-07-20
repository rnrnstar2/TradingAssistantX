import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';

/**
 * MVP準拠: シンプルで実用的な型安全なYAML読み込み関数
 * 
 * @param filePath - YAMLファイルのパス
 * @returns パースされたデータ、エラー時はnull
 */
export function loadYamlSafe<T>(filePath: string): T | null {
  try {
    const data = yaml.load(readFileSync(filePath, 'utf8'));
    return data as T; // 実用的アプローチ
  } catch (error) {
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
export function loadYamlArraySafe<T>(filePath: string): T[] {
  try {
    const data = yaml.load(readFileSync(filePath, 'utf8'));
    if (Array.isArray(data)) {
      return data as T[];
    }
    console.warn(`YAML読み込み警告: ${filePath} - 配列でないデータが返されました`);
    return [];
  } catch (error) {
    console.error(`YAML配列読み込みエラー: ${filePath}`, error);
    return [];
  }
}