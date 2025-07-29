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
    // 階層をフラット化する処理を削除
    // 直接daily_scheduleを返す
    return config.daily_schedule.sort((a, b) => a.time.localeCompare(b.time));
  }
}