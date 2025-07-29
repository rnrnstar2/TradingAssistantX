export interface ScheduleItem {
  time: string;           // "HH:MM" 形式
  action: 'post' | 'retweet' | 'quote_tweet' | 'like';
  topic?: string;         // postアクション用
  target_query?: string;  // retweet/quote_tweet用
}

export interface DailySchedule {
  morning?: ScheduleItem[];
  lunch?: ScheduleItem[];
  evening?: ScheduleItem[];
  night?: ScheduleItem[];
}

export interface ScheduleConfig {
  daily_schedule: DailySchedule;
}