# 実例1: 単純な機能追加

## 📋 背景

ユーザーから「ダークモードを実装してほしい」という要望があり、UIの配色を切り替える機能を追加することになりました。

## 🎯 イシュー内容

### Issue #127: ダークモード切り替え機能の実装

```markdown
## タスク概要
アプリケーション全体でダークモードとライトモードを切り替える機能を実装する。

## 影響を受けるファイル
- apps/web/app/layout.tsx
- apps/web/components/theme-toggle.tsx (新規)
- apps/web/styles/globals.css
- packages/ui/src/theme/index.ts

## 依存関係
親イシュー: なし
子イシュー: #130 (設定画面でのトグル追加)

## 完了条件
- [ ] テーマ切り替えボタンの実装
- [ ] ローカルストレージへの保存
- [ ] 全画面でのダークモード適用
- [ ] Tailwind CSS v4での実装
```

## 🚀 実装過程

### 1. ブランチ作成
```bash
git checkout -b issue-127-dark-mode
```

### 2. テーマトグルコンポーネント作成
```typescript
// apps/web/components/theme-toggle.tsx
'use client';

import { useTheme } from '@/hooks/use-theme';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
```

### 3. テーマフックの実装
```typescript
// apps/web/hooks/use-theme.ts
import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = stored || 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return { theme, toggleTheme };
}
```

### 4. グローバルスタイルの更新
```css
/* apps/web/styles/globals.css */
@layer base {
  :root {
    --background: 255 255 255;
    --foreground: 0 0 0;
  }

  .dark {
    --background: 0 0 0;
    --foreground: 255 255 255;
  }

  body {
    background-color: rgb(var(--background));
    color: rgb(var(--foreground));
  }
}
```

### 5. レイアウトへの組み込み
```typescript
// apps/web/app/layout.tsx
import { ThemeToggle } from '@/components/theme-toggle';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav>
            {/* 既存のナビゲーション */}
            <ThemeToggle />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
```

## ✅ 結果

### プルリクエスト
```markdown
PR #128: [#127] ダークモード切り替え機能の実装

## 変更内容
- テーマ切り替えボタンコンポーネントを追加
- useThemeフックでテーマ状態を管理
- Tailwind CSSのダークモードクラスを活用
- ローカルストレージに設定を保存

## スクリーンショット
[ライトモード画面]
[ダークモード画面]

## テスト
- [x] 手動でテーマ切り替えを確認
- [x] リロード後も設定が維持されることを確認
- [x] 全ページでダークモードが適用されることを確認

Closes #127
```

### マージまでの時間
- イシュー作成: 2024-01-15 10:00
- 実装開始: 2024-01-15 10:30
- PR作成: 2024-01-15 14:00
- マージ: 2024-01-15 15:30
- **総時間: 5.5時間**

## 💡 学び

### 良かった点
1. **シンプルな実装** - MVP原則に従い、最小限の機能で実装
2. **既存の仕組みを活用** - Tailwind CSSのダークモードクラスを使用
3. **独立性が高い** - 他の機能に影響を与えない実装

### 改善点
1. **SSR対応** - 初回レンダリング時のちらつき対策が必要
2. **システム設定との連携** - OSのダークモード設定を考慮すべき

### ベストプラクティス
- 新機能は独立したコンポーネントとして実装
- グローバルな状態はカスタムフックで管理
- UIの変更は視覚的に確認しやすいPRに

## 📝 関連イシュー

- #130: 設定画面でのテーマ選択UI
- #131: コンポーネントごとのダークモード最適化
- #132: ダークモード時の配色調整