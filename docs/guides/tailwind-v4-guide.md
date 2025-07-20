# Tailwind CSS v4 実装ガイド

## 🚨 重要な変更点

### 1. 動的CSS変数の扱い

**❌ 動作しない例**:
```css
/* Tailwind v3での記法 - v4では無効 */
.w-[--sidebar-width]
.w-(--sidebar-width)
.group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]
```

**✅ 正しい実装**:
```jsx
// インラインスタイルで動的値を設定
style={{
  width: state === "collapsed"
    ? "var(--sidebar-width-icon)"
    : "var(--sidebar-width)"
}}
```

### 2. @utility定義の制約

**❌ 無効な定義**:
```css
@utility w-\(--sidebar-width\) { }
@utility group-data-\[collapsible\=icon\]\:hidden { }
```

**✅ 推奨アプローチ**:
- カスタムユーティリティは英数字のみ使用
- 動的な値はJSX内で処理
- 条件付きクラスはcnヘルパーで管理

```tsx
// cnヘルパーを使用した条件付きクラス
import { cn } from "@/lib/utils"

<div className={cn(
  "transition-all duration-300",
  state === "collapsed" && "w-[var(--sidebar-width-icon)]",
  state === "expanded" && "w-[var(--sidebar-width)]"
)}>
```

### 3. カスタムプロパティの使用

**正しい使用例**:
```css
/* CSS変数の定義 */
:root {
  --sidebar-width: 16rem;
  --sidebar-width-icon: 3rem;
}

/* Tailwind設定での参照 */
@theme inline {
  --spacing-sidebar: var(--sidebar-width);
  --spacing-sidebar-icon: var(--sidebar-width-icon);
}
```

**JSXでの使用**:
```tsx
// CSS変数を直接参照
<aside 
  style={{
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem"
  } as React.CSSProperties}
>
  <div 
    style={{ 
      width: isCollapsed 
        ? "var(--sidebar-width-icon)" 
        : "var(--sidebar-width)" 
    }}
  >
    {/* コンテンツ */}
  </div>
</aside>
```

## 📋 実装チェックリスト

### CSS変更時の確認事項

- [ ] 特殊文字を含む@utility定義を使用していない
- [ ] 動的な値はインラインスタイルで設定
- [ ] `npm run build`でビルドエラーがない
- [ ] 開発サーバーでスタイルが正しく適用される
- [ ] CSS変数がブラウザで正しく解決される

### デバッグ手順

1. **ビルドエラーを確認**:
   ```bash
   cd apps/admin && npm run build
   cd apps/hedge-system && npm run build
   ```

2. **ブラウザの開発者ツールでCSS変数を確認**:
   - 要素を検査
   - Computed スタイルで`--sidebar-width`などの値を確認
   - 実際に適用されているスタイルを確認

3. **data属性が正しく設定されているか確認**:
   ```jsx
   // data属性の正しい使用例
   <div 
     data-collapsible={state}
     className="group"
   >
     <div className="group-data-[collapsible=icon]:hidden">
       表示/非表示されるコンテンツ
     </div>
   </div>
   ```

## 🎯 実装パターン

### パターン1: 動的幅の実装

```tsx
// ❌ 避けるべき実装
<div className="w-[--sidebar-width]">

// ✅ 推奨実装
<div 
  style={{ 
    width: "var(--sidebar-width)" 
  }}
>
```

### パターン2: 条件付きスタイル

```tsx
// ❌ 避けるべき実装
<div className={`w-[${isCollapsed ? '3rem' : '16rem'}]`}>

// ✅ 推奨実装
<div 
  className={cn(
    "transition-width duration-300",
    isCollapsed ? "w-12" : "w-64"
  )}
>
```

### パターン3: レスポンシブ対応

```tsx
// CSS変数とメディアクエリの組み合わせ
<div 
  style={{
    "--sidebar-width": "16rem",
    "--sidebar-width-mobile": "100%"
  } as React.CSSProperties}
  className="w-full md:w-[var(--sidebar-width)]"
>
```

## ⚠️ よくあるエラーと解決策

### エラー1: ビルド時の@utility解析エラー

**エラーメッセージ**:
```
Error: Invalid utility name in @utility rule
```

**解決策**:
- 特殊文字を含む@utility定義を削除
- 代わりにインラインスタイルまたは通常のCSSクラスを使用

### エラー2: CSS変数が解決されない

**症状**:
- ブラウザで`var(--sidebar-width)`が文字列として表示される

**解決策**:
```tsx
// CSS変数が定義されていることを確認
useEffect(() => {
  const root = document.documentElement;
  root.style.setProperty('--sidebar-width', '16rem');
  root.style.setProperty('--sidebar-width-icon', '3rem');
}, []);
```

### エラー3: 動的クラス名が適用されない

**症状**:
- テンプレートリテラルを使用したクラス名が機能しない

**解決策**:
```tsx
// ❌ 動作しない
className={`w-[${width}px]`}

// ✅ 正しい実装
style={{ width: `${width}px` }}

// または事前定義されたクラスを使用
className={width > 100 ? "w-32" : "w-16"}
```

## 🔗 参考リンク

- [Tailwind CSS v4 公式ドキュメント](https://tailwindcss.com/docs)
- [CSS カスタムプロパティ (CSS変数) - MDN](https://developer.mozilla.org/ja/docs/Web/CSS/Using_CSS_custom_properties)
- [React での動的スタイリング - React公式](https://react.dev/learn/conditional-rendering#conditionally-applying-styles)

## 💡 ベストプラクティス

1. **CSS変数は:rootまたはコンポーネントルートで定義**
2. **動的な値はインラインスタイルで管理**
3. **条件付きクラスはcnヘルパーを活用**
4. **ビルド時の検証を必ず実行**
5. **TypeScriptの型安全性を活用**

```tsx
// TypeScriptでCSS変数を型安全に管理
interface CSSVariables {
  "--sidebar-width": string;
  "--sidebar-width-icon": string;
}

const cssVariables: CSSVariables = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem"
};

<div style={cssVariables as React.CSSProperties}>
```

---

このガイドは、Tailwind CSS v4への移行時に発生する一般的な問題と、その解決策をまとめたものです。実装時はビルドテストを通じて動作確認を行うことを強く推奨します。