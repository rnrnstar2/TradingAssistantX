import * as yaml from 'js-yaml';
import { readFileSync, writeFileSync, mkdirSync, promises as fs } from 'fs';
import { dirname } from 'path';

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

/**
 * YAML書き込み関数
 * 
 * @param filePath - YAMLファイルのパス
 * @param data - 書き込むデータ
 */
export function writeYamlSafe<T>(filePath: string, data: T): boolean {
  try {
    // ディレクトリが存在しない場合は作成
    mkdirSync(dirname(filePath), { recursive: true });
    
    const yamlString = yaml.dump(data, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"'
    });
    
    writeFileSync(filePath, yamlString, 'utf8');
    return true;
  } catch (error) {
    console.error(`YAML書き込みエラー: ${filePath}`, error);
    return false;
  }
}

/**
 * 非同期YAML読み込み関数（loadYamlSafeの非同期版）
 * 
 * @param filePath - YAMLファイルのパス
 * @returns パースされたデータ、エラー時はnull
 */
export async function loadYamlAsync<T>(filePath: string): Promise<T | null> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf8');
    const data = yaml.load(content);
    return data as T;
  } catch (error) {
    console.error(`YAML読み込みエラー: ${filePath}`, error);
    return null;
  }
}

/**
 * 非同期YAML書き込み関数
 * 
 * @param filePath - YAMLファイルのパス
 * @param data - 書き込むデータ
 */
export async function writeYamlAsync<T>(filePath: string, data: T): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // ディレクトリが存在しない場合は作成
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const yamlString = yaml.dump(data, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"'
    });
    
    await fs.writeFile(filePath, yamlString, 'utf8');
    return true;
  } catch (error) {
    console.error(`YAML書き込みエラー: ${filePath}`, error);
    return false;
  }
}

// 後方互換性のためのエイリアス
export const readYamlSafe = loadYamlAsync;

// yamlUtilsオブジェクトとしてエクスポート（後方互換性用）
export const yamlUtils = {
  readYaml: loadYamlAsync,
  writeYaml: writeYamlAsync,
  loadYaml: loadYamlSafe,
  loadYamlArray: loadYamlArraySafe,
  loadYamlAsync: loadYamlAsync
};