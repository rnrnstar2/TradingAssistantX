import { writeFileSync } from 'fs';
import { ScrapedData } from '../types/index';
import { ClaudeControlledCollector } from './claude-controlled-collector';
import * as yaml from 'js-yaml';

// 固定分岐を完全削除
export async function scrapeTargets(): Promise<ScrapedData[]> {
  const testMode = process.env.X_TEST_MODE === 'true';
  
  if (testMode) {
    console.log('🤖 完全Claude Code主導による自律収集');
  }
  
  const collector = new ClaudeControlledCollector();
  const results = await collector.exploreAutonomously();
  
  writeFileSync('data/scraped.yaml', yaml.dump(results, { indent: 2 }));
  
  if (testMode) {
    console.log(`✅ Claude主導収集完了: ${results.length}件`);
  }
  
  return results;
}

if (require.main === module) {
  scrapeTargets();
}