import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { dirname } from 'path';

/**
 * YAMLファイルを同期的に読み込み
 * @param filePath ファイルパス
 * @returns パースされたデータまたはnull
 */
export function loadYamlSafe<T>(filePath: string): T | null {
  try {
    const data = yaml.load(readFileSync(filePath, 'utf8'));
    return data as T;
  } catch (error) {
    console.error(`YAML読み込みエラー: ${filePath}`, error);
    return null;
  }
}

/**
 * YAMLファイルを非同期に読み込み
 * @param filePath ファイルパス
 * @returns パースされたデータまたはnull
 */
export async function loadYamlAsync<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = yaml.load(content);
    return data as T;
  } catch (error) {
    console.error(`YAML読み込みエラー: ${filePath}`, error);
    return null;
  }
}

/**
 * YAMLファイルを非同期に書き込み
 * @param filePath ファイルパス
 * @param data 書き込むデータ
 * @returns 成功した場合true
 */
export async function writeYamlAsync<T>(filePath: string, data: T): Promise<boolean> {
  try {
    // ディレクトリが存在しない場合は作成
    await fs.mkdir(dirname(filePath), { recursive: true });
    
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

/**
 * YAMLファイルを同期的に書き込み
 * @param filePath ファイルパス
 * @param data 書き込むデータ
 * @returns 成功した場合true
 */
export function writeYamlSafe<T>(filePath: string, data: T): boolean {
  try {
    const yamlString = yaml.dump(data, { 
      indent: 2,
      lineWidth: 120,
      quotingType: '"'
    });
    
    require('fs').writeFileSync(filePath, yamlString, 'utf8');
    return true;
  } catch (error) {
    console.error(`YAML書き込みエラー: ${filePath}`, error);
    return false;
  }
}