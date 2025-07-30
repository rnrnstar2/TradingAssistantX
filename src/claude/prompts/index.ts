// テンプレートのエクスポート
export { contentTemplate } from './templates/content.template';
export { analysisTemplate } from './templates/analysis.template';
export * from './templates/selection.template';

// ビルダーのエクスポート（実装済みクラスを使用）
export {
  BaseBuilder,
  ContentBuilder,
  AnalysisBuilder,
  SelectionBuilder
} from './builders';

// 型のエクスポート
export type { TimeContext, AccountStatus } from './builders';
export type { ContentPromptParams } from './builders';
export type { AnalysisPromptParams } from './builders';
export type { SelectionPromptParams } from './builders';

// ファクトリー関数（実装済みビルダーを使用）
import { ContentBuilder } from './builders/content-builder';
import { AnalysisBuilder } from './builders/analysis-builder';
import { SelectionBuilder } from './builders/selection-builder';
import type { ContentPromptParams } from './builders/content-builder';
import type { AnalysisPromptParams } from './builders/analysis-builder';
import type { SelectionPromptParams } from './builders/selection-builder';

export function createContentPrompt(params: ContentPromptParams): string {
  const builder = new ContentBuilder();
  return builder.buildPrompt(params);
}

export function createAnalysisPrompt(params: AnalysisPromptParams): string {
  const builder = new AnalysisBuilder();
  return builder.buildPrompt(params);
}

export function createSelectionPrompt(params: SelectionPromptParams): string {
  const builder = new SelectionBuilder();
  return builder.buildPrompt(params);
}