/**
 * KaitoAPI リストエンドポイント
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * リスト投稿・フォロワー・メンバー管理
 */

import { TwitterList, ListMember } from '../types';

export class ListEndpoints {
  constructor(private baseUrl: string, private headers: Record<string, string>) {}

  // リスト情報取得
  async getListInfo(listId: string): Promise<TwitterList> {
    // リスト基本情報取得の実装
    throw new Error('List endpoints - MVP後実装予定');
  }

  // リストメンバー取得
  async getListMembers(listId: string): Promise<ListMember[]> {
    // リストメンバー一覧取得の実装
    throw new Error('List endpoints - MVP後実装予定');
  }

  // リスト投稿取得
  async getListTweets(listId: string): Promise<any[]> {
    // リスト内投稿取得の実装
    throw new Error('List endpoints - MVP後実装予定');
  }
}