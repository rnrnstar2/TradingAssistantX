# グローバルスタイルシステム設計書

> **📌 対応状況**: このドキュメントはイシュー駆動開発システムおよびTailwind CSS v4に対応しています。
> - ✅ shadcn/uiパターンの踏襲
> - ✅ Tailwind CSS v4の新機能活用
> - ✅ ultrathink品質実装に適した設計思想
> 
> **参照**: 具体的なTailwind CSS v4実装詳細は[TAILWIND_V4_GUIDE.md](./TAILWIND_V4_GUIDE.md)を参照してください。

## 🎯 設計思想

### 基本原則
1. **コンポーネントのclassNameには最小限の指定のみ**
2. **デザインシステムはCSS層とCSS変数で管理**
3. **shadcn/uiパターンの踏襲**
4. **Tailwind CSS v4の新機能を最大限活用**

### 目標
- UIの統一感と一貫性の確保
- スタイルの再利用性向上
- メンテナンス性の向上
- パフォーマンスの最適化

## 🏗️ アーキテクチャ

### CSS層構造

```css
/* packages/tailwind-config/shared-styles.css */

/* 1. Base Layer - リセットと基本要素 */
@layer base {
  /* タイポグラフィの基本設定 */
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading font-bold tracking-tight;
  }
  
  h1 { @apply text-4xl; }
  h2 { @apply text-3xl; }
  h3 { @apply text-2xl; }
  h4 { @apply text-xl; }
  h5 { @apply text-lg; }
  h6 { @apply text-base; }
  
  /* フォーカススタイル */
  :focus-visible {
    @apply outline-none ring-2 ring-primary/50 ring-offset-2 ring-offset-background;
  }
}

/* 2. Components Layer - 再利用可能なコンポーネント */
@layer components {
  /* ボタンの基本スタイル */
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-md
           font-medium transition-all duration-200
           focus-visible:ring-2 focus-visible:ring-primary/50
           disabled:pointer-events-none disabled:opacity-50;
  }
  
  /* カードの基本スタイル */
  .card {
    @apply rounded-lg border border-border/50 bg-card 
           shadow-sm transition-all duration-200;
  }
  
  /* インプットの基本スタイル */
  .input {
    @apply flex w-full rounded-md border border-border/50
           bg-background px-3 py-2 text-sm
           placeholder:text-muted-foreground
           focus:border-primary focus:ring-1 focus:ring-primary/20
           disabled:cursor-not-allowed disabled:opacity-50;
  }
}

/* 3. Utilities Layer - ユーティリティクラス */
@layer utilities {
  /* レイアウトユーティリティ */
  .container-center {
    @apply mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8;
  }
  
  /* スペーシングユーティリティ */
  .section-spacing {
    @apply py-8 sm:py-12 lg:py-16;
  }
  
  /* アニメーションユーティリティ */
  .animate-in {
    animation: animate-in 0.2s ease-out;
  }
}
```

### CSS変数システム

```css
@theme {
  /* カラーシステム */
  --color-* {
    /* OKLCH色空間で定義 */
  }
  
  /* スペーシングシステム */
  --spacing-* {
    /* 8pxグリッドシステム */
  }
  
  /* タイポグラフィ */
  --font-size-* {
    /* モジュラースケール */
  }
  
  /* シャドウ */
  --shadow-* {
    /* 一貫したエレベーション */
  }
  
  /* アニメーション */
  --duration-* {
    /* 標準化されたタイミング */
  }
}
```

## 🎨 実装パターン

### 1. セマンティッククラス名の使用

```tsx
// ❌ 避けるべき実装
<button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
  Click me
</button>

// ✅ 推奨される実装
<button className="btn btn-primary">
  Click me
</button>
```

### 2. データ属性とCSS変数の活用

```tsx
// コンポーネント実装
<Card data-variant="elevated" data-size="lg">
  <CardContent>Content</CardContent>
</Card>

// CSS定義
.card {
  /* サイズバリエーション */
  &[data-size="sm"] { --card-padding: var(--spacing-2); }
  &[data-size="md"] { --card-padding: var(--spacing-4); }
  &[data-size="lg"] { --card-padding: var(--spacing-6); }
  
  /* バリアントスタイル */
  &[data-variant="elevated"] {
    @apply shadow-lg hover:shadow-xl;
  }
  
  &[data-variant="outlined"] {
    @apply border-2 shadow-none;
  }
  
  padding: var(--card-padding);
}
```

### 3. コンポジション over 継承

```tsx
// 基本コンポーネント
export const Surface = ({ className, ...props }) => (
  <div className={cn("surface", className)} {...props} />
);

// 拡張コンポーネント
export const Card = ({ className, ...props }) => (
  <Surface className={cn("card", className)} {...props} />
);

export const Panel = ({ className, ...props }) => (
  <Surface className={cn("panel", className)} {...props} />
);
```

## 🔧 実装ガイドライン

### コンポーネントの標準化

```tsx
// packages/ui/src/components/ui/button.tsx
import { cn } from "@/lib/utils";

// バリアントはデータ属性で管理
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = ({ 
  className, 
  variant = "default", 
  size = "md",
  ...props 
}) => {
  return (
    <button
      className={cn("btn", className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
};
```

### CSS定義

```css
/* コンポーネント層での定義 */
@layer components {
  .btn {
    /* 基本スタイル */
    @apply relative inline-flex items-center justify-center
           rounded-md font-medium transition-all duration-200;
    
    /* サイズ定義 */
    &[data-size="sm"] { @apply h-8 px-3 text-sm; }
    &[data-size="md"] { @apply h-10 px-4 text-base; }
    &[data-size="lg"] { @apply h-12 px-6 text-lg; }
    
    /* バリアント定義 */
    &[data-variant="default"] {
      @apply bg-primary text-primary-foreground
             hover:bg-primary/90;
    }
    
    &[data-variant="secondary"] {
      @apply bg-secondary text-secondary-foreground
             hover:bg-secondary/80;
    }
    
    &[data-variant="destructive"] {
      @apply bg-destructive text-destructive-foreground
             hover:bg-destructive/90;
    }
    
    &[data-variant="outline"] {
      @apply border border-border bg-transparent
             hover:bg-accent hover:text-accent-foreground;
    }
    
    &[data-variant="ghost"] {
      @apply hover:bg-accent hover:text-accent-foreground;
    }
  }
}
```

## 📐 レイアウトシステム

### グリッドシステム

```css
@layer components {
  /* 自動グリッドレイアウト */
  .auto-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--grid-min-size, 250px), 1fr));
    gap: var(--grid-gap, var(--spacing-4));
  }
  
  /* フレックスクラスター */
  .cluster {
    display: flex;
    flex-wrap: wrap;
    gap: var(--cluster-gap, var(--spacing-2));
    align-items: var(--cluster-align, center);
    justify-content: var(--cluster-justify, flex-start);
  }
  
  /* 垂直スタック */
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--stack-gap, var(--spacing-4));
  }
}
```

### 使用例

```tsx
// グリッドレイアウト
<div className="auto-grid" style={{ "--grid-min-size": "300px" }}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>

// クラスターレイアウト
<div className="cluster" style={{ "--cluster-gap": "1rem" }}>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
  <Button>Action 3</Button>
</div>
```

## 🎯 ベストプラクティス

### 1. 命名規則
- **BEM風の命名**: `.card`, `.card__header`, `.card--elevated`
- **データ属性**: `data-variant`, `data-size`, `data-state`
- **CSS変数**: `--component-property` (例: `--card-padding`)

### 2. スタイルの優先順位
1. グローバルスタイル（CSS層）
2. CSS変数によるカスタマイズ
3. データ属性によるバリエーション
4. 最小限のclassName追加

### 3. パフォーマンス最適化
- 動的クラス名の生成を避ける
- CSS変数によるランタイムでのスタイル変更
- `@layer`による適切なカスケード管理

### 4. アクセシビリティ
- フォーカススタイルの統一
- 減少モーション対応
- 高コントラストモード対応

## 🚀 マイグレーション計画

### Phase 1: 基盤整備
1. `shared-styles.css`にコンポーネント層を追加
2. 基本的なセマンティッククラスの定義
3. CSS変数システムの拡充

### Phase 2: コンポーネント移行
1. Buttonコンポーネントから開始
2. 段階的に他のコンポーネントも移行
3. テストとドキュメントの更新

### Phase 3: 最適化
1. 重複したスタイルの統合
2. パフォーマンスチューニング
3. 開発者ガイドラインの作成

## 📚 参考資料
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Principles](https://ui.shadcn.com/docs/principles)
- [CSS Custom Properties Best Practices](https://web.dev/css-custom-properties)
- [OKLCH Color Space](https://oklch.com)