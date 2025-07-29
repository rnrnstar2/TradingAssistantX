import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { ScheduleConfig, ScheduleItem } from './types';

export class ScheduleLoader {
  static load(path: string = 'data/config/schedule.yaml'): ScheduleConfig {
    try {
      const content = readFileSync(path, 'utf8');
      return load(content) as ScheduleConfig;
    } catch (error) {
      throw new Error(`スケジュール読み込みエラー: ${error.message}`);
    }
  }

  static getTodaySchedule(config: ScheduleConfig): ScheduleItem[] {
    const allItems: ScheduleItem[] = [];
    
    // 全時間帯のスケジュールを統合
    Object.values(config.daily_schedule).forEach(timeSlot => {
      if (timeSlot) {
        allItems.push(...timeSlot);
      }
    });
    
    // 時刻順にソート
    return allItems.sort((a, b) => a.time.localeCompare(b.time));
  }
}