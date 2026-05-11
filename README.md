# Morse Code Practice Card (Web)

物理のモールス練習カードをイメージした **二分木（バイナリツリー）UI** で、短点（ディ）・長点（ダー）の入力に沿ってノードを辿りながらモールス符号を学習するシングルページアプリです。

## 機能概要

- **入力**: 画面下部の「Input」ボタンを **短押し**（短点）／**長押し**（長点）で操作
- **二分木表示**: `public/data/morse_tree.json` のデータから SVG で描画（短点＝丸、長点＝横長の形状）
- **視覚フィードバック**: 現在ノード／プレビュー時の LED 風の点灯
- **音声**: 押下中にビープ（Web Audio）
- **無操作リセット**: 一定時間入力がなければルートへ戻る（閾値は `src/config.ts`）

## 技術スタック

- [Vite](https://vitejs.dev/) 6
- TypeScript（strict）
- 素の DOM / SVG（フレームワークなし）

## 必要環境

- **Node.js**（LTS 推奨）

## セットアップとコマンド

```bash
npm install
```

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（既定: `http://localhost:5173`） |
| `npm run build` | `tsc` で型チェック後、`dist/` に本番ビルド |
| `npm run preview` | ビルド結果のローカルプレビュー |
| `npm run gen:morse` | モールス表から `public/data/morse_tree.json` を再生成 |

## ディレクトリ構成（抜粋）

```
├── index.html              # エントリ HTML
├── public/
│   └── data/
│       └── morse_tree.json # 二分木データ
├── scripts/
│   └── gen-morse-tree.mjs  # 上記 JSON の生成スクリプト
├── src/
│   ├── main.ts             # 入力・遷移・ビープ・状態反映
│   ├── practice-card-render.ts  # SVG レイアウト・点灯クラス制御
│   ├── audio.ts            # ビープ
│   ├── config.ts           # 短押し閾値・LED 色・音量など
│   ├── styles.css
│   └── types.ts
└── docs/                   # 仕様・設計メモ（参照用）
```

## ドキュメント

要件や画面イメージの詳細は `docs/` 内（例: `spec.md`, `screens.md`）を参照してください。

## ライセンス

`package.json` の `private: true` に従い、用途に合わせてリポジトリ運用者がライセンスを定義してください。
