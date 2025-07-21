# TASK-002 Claude応答構造とDecision型不一致修復

## 🚨 NEW Critical問題

**現状**: `decision.type: "undefined"` が12回連続発生、自律実行システム依然停止中

**根本原因**: `prioritizeNeeds()`関数でClaudeがDecision interfaceに合わない構造で応答

## 🎯 修復目標

Claudeからの応答構造をDecision interfaceに完全適合させ、`decision.type: "undefined"`問題を根絶する。

## 📋 Critical修正内容

### 1. prioritizeNeeds()プロンプト構造化修正
**ファイル**: `src/core/decision-engine.ts`
**場所**: L70-78

**修正前**:
```typescript
const prompt = `
Current needs:
${JSON.stringify(needs, null, 2)}

Prioritize these needs and convert them to actionable decisions.
Consider urgency, impact, and resource requirements.

Return as JSON array of decisions ordered by priority.
`;
```

**修正後**:
```typescript
const prompt = `
Current needs:
${JSON.stringify(needs, null, 2)}

Convert these needs to actionable decisions with the following EXACT JSON structure.
Each decision MUST include all required fields:

REQUIRED DECISION FORMAT:
{
  "id": "decision-[timestamp]-[random]",
  "type": "[one of: collect_content, immediate_post, analyze_performance, optimize_timing, clean_data, strategy_shift, content_generation, posting_schedule]",
  "priority": "[one of: critical, high, medium, low]",
  "reasoning": "explanation of why this decision was made",
  "params": {},
  "dependencies": [],
  "estimatedDuration": [number in minutes]
}

Return ONLY a JSON array of decision objects. No markdown, no explanation.
Example: [{"id":"decision-123-abc","type":"content_generation","priority":"high","reasoning":"Need fresh content","params":{},"dependencies":[],"estimatedDuration":30}]
`;
```

### 2. Claude応答デバッグログ追加
**同ファイル**: L80-93

**修正後**:
```typescript
try {
  const response = await claude()
    .withModel('sonnet')
    .query(prompt)
    .asText();

  // 🔥 CRITICAL: Claude応答内容をログ出力
  console.log('🔍 Claude raw response:', response);

  // Extract JSON from markdown code blocks if present
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : response;
  
  console.log('🔍 Extracted JSON text:', jsonText);
  
  const decisions = JSON.parse(jsonText);
  console.log('🔍 Parsed decisions:', JSON.stringify(decisions, null, 2));
  
  // 各decision.typeを検証
  decisions.forEach((decision: any, index: number) => {
    console.log(`🔍 Decision ${index}: type="${decision.type}", id="${decision.id}"`);
  });
  
  return decisions;
} catch (error) {
  console.error('❌ prioritizeNeeds JSON parse error:', error);
  console.error('❌ Raw response was:', response);
  return [];
}
```

### 3. assessCurrentNeeds()も同様修正
**ファイル**: `src/core/autonomous-executor.ts`
**場所**: L33-45

**修正前のプロンプト**:
```typescript
const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Analyze the current situation and identify what needs to be done.
Consider:
1. Content collection needs
2. Immediate posting opportunities
3. System maintenance requirements
4. Performance optimizations

Return as JSON array of needs.
`;
```

**修正後**:
```typescript
const prompt = `
Current context:
${JSON.stringify(context, null, 2)}

Analyze and identify what needs to be done with the following EXACT JSON structure.
Each need MUST include all required fields:

REQUIRED NEED FORMAT:
{
  "id": "need-[timestamp]-[random]",
  "type": "[one of: content, immediate, maintenance, optimization]",
  "priority": "[one of: high, medium, low]",
  "description": "detailed description of what needs to be done",
  "context": {},
  "createdAt": "[ISO timestamp]"
}

Return ONLY a JSON array of need objects. No markdown, no explanation.
Example: [{"id":"need-123-abc","type":"content","priority":"high","description":"Collect trending content","context":{},"createdAt":"2025-07-20T15:10:00.000Z"}]
`;
```

## 🚫 MVP制約遵守

- **統計・分析システム追加禁止**: ログ出力のみ、測定システム追加なし
- **複雑なエラーハンドリング禁止**: 基本的なデバッグログのみ
- **将来拡張禁止**: Claude応答構造の問題解決のみに集中

## ✅ 実装完了条件

1. **prioritizeNeeds修正完了**: 構造化プロンプト + デバッグログ追加
2. **assessCurrentNeeds修正完了**: 構造化プロンプト適用
3. **デバッグログ完了**: Claude応答内容の完全可視化
4. **動作確認**: `decision.type: "undefined"`エラーの根絶確認

## 🔧 テスト方法

```bash
# 1. 修正完了後、システム再起動
pnpm stop
pnpm dev

# 2. Claude応答確認（デバッグログ）
# 新しいログでClaude応答内容を確認

# 3. decision.type確認
# "❌ Unknown decision type: undefined" エラーの消失確認

# 4. アクション生成確認
tail -5 data/context/execution-history.json
# actions配列に要素が含まれることを確認
```

## 📋 報告書要件

**報告書パス**: `tasks/20250721_000325/reports/REPORT-002-claude-response-structure-fix.md`

**必須記載内容**:
1. 修正実施状況（プロンプト構造化、デバッグログ追加）
2. Claude応答内容の実際確認結果
3. decision.type="undefined"問題の解決確認
4. アクション生成の正常化確認

## 🚀 実装手順

1. **バックアップ作成**: 
   ```bash
   cp src/core/decision-engine.ts src/core/decision-engine.ts.backup2
   cp src/core/autonomous-executor.ts src/core/autonomous-executor.ts.backup
   ```

2. **修正実装**: 上記2ファイルの修正適用

3. **TypeScript確認**: `npm run check-types`

4. **動作確認**: システム再起動してClaude応答デバッグログ確認

5. **報告書作成**: 修復完了報告と実際のClaude応答内容記録

---

**⚡ 緊急度**: Critical - decision.type="undefined"問題継続中
**🎯 期待結果**: Claude応答構造の完全適合、decision.typeの正常生成、アクション実行の完全復旧