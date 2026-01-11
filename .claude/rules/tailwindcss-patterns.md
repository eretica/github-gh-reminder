---
paths:
  - "src/renderer/**/*.{ts,tsx}"
  - "tailwind.config.{js,ts}"
---

# TailwindCSSベストプラクティス

## ユーティリティファースト・アプローチ

**ルール**: カスタムCSSよりもユーティリティクラスを優先する

```tsx
// ✅ Good: Use Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <span className="text-sm font-medium text-gray-900">{title}</span>
  <button className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
    Action
  </button>
</div>

// ❌ Bad: シンプルなレイアウトにインラインスタイルやカスタムCSSを使用
<div style={{ display: 'flex', padding: '16px' }}>
  <span style={{ fontSize: '14px' }}>{title}</span>
</div>
```

## レスポンシブデザイン

**ルール**: モバイルファーストのレスポンシブデザイン

```tsx
// ✅ Good: Mobile-first with responsive modifiers
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <div className="p-4 text-sm md:text-base lg:text-lg">
    Content
  </div>
</div>

// ❌ Bad: デスクトップファーストや固定サイズ
<div className="grid grid-cols-3 gap-4">
  <div style={{ width: '300px' }}>Content</div>
</div>
```

## カスタム設定

**基本セットアップ**:
```javascript
// tailwind.config.js
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**オプション: 一貫したブランディングが必要な場合、カスタムデザイントークンで拡張**:
```javascript
// tailwind.config.js
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
};
```

**注意**: `bg-[#3b82f6]`のような任意の値は一度きりのケースでは許容されますが、繰り返し使用する色やスペーシングにはテーマ値の追加を検討してください。

## コンポーネント合成

**ルール**: 再利用可能なコンポーネントバリアントを構築する

```tsx
// ✅ Good: Create variant-based components
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
  const baseClasses = 'font-semibold rounded transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </button>
  );
}

// ❌ Bad: 毎回使用するたびにクラスを重複記述
<button className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>
```
