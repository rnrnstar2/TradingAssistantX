/**
 * KaitoAPI コミュニティエンドポイント
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * コミュニティ情報・メンバー・投稿管理
 */

import { CommunityInfo, CommunityMember, CommunityPost } from '../types';

export class CommunityEndpoints {
  constructor(private baseUrl: string, private headers: Record<string, string>) {}

  // コミュニティ情報取得
  async getCommunityInfo(communityId: string): Promise<CommunityInfo> {
    // 基本的なコミュニティ情報取得の実装
    throw new Error('Community endpoints - MVP後実装予定');
  }

  // コミュニティメンバー一覧
  async getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    // メンバー一覧取得の実装
    throw new Error('Community endpoints - MVP後実装予定');
  }

  // コミュニティ投稿取得
  async getCommunityPosts(communityId: string): Promise<CommunityPost[]> {
    // コミュニティ投稿取得の実装
    throw new Error('Community endpoints - MVP後実装予定');
  }
}