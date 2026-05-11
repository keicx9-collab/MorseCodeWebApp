# データ構造設計書（外部JSON形式）：MorseCodeTestApp

## 1. 設計方針
本データ構造は、WEB版およびNative版（Android）の両方で共通利用することを目的とする。プログラムのロジックから「モールス信号の木構造」を完全に分離し、メンテナンス性と移植性を確保する。

## 2. ファイル構成
*   **ファイル名:** `morse_tree.json`
*   **形式:** JSON (UTF-8)

## 3. データ構造定義（スキーマ）

各ノードは以下の属性を持つオブジェクトとして定義し、再帰的なツリー構造、またはフラットなリスト構造で保持する。移植性を考慮し、**「フラットなリスト構造（ID指定による参照）」**を採用する。


| キー | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | String | ノードの一意識別子（"root", "e", "t" など） |
| `label` | String | 画面に表示する文字 |
| `type` | String | `ROOT`, `ROUND` (短点), `RECT` (長点) のいずれか |
| `dot_id` | String | 短押し（・）時、次に遷移するノードの `id`。末端は `null`。 |
| `dash_id` | String | 長押し（－）時、次に遷移するノードの `id`。末端は `null`。 |

## 4. JSONデータイメージ（実装サンプル）

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "root",
      "label": "Antenna",
      "type": "ROOT",
      "dot_id": "e",
      "dash_id": "t"
    },
    {
      "id": "e",
      "label": "E",
      "type": "ROUND",
      "dot_id": "i",
      "dash_id": "a"
    },
    {
      "id": "t",
      "label": "T",
      "type": "RECT",
      "dot_id": "n",
      "dash_id": "m"
    },
    {
      "id": "i",
      "label": "I",
      "type": "ROUND",
      "dot_id": "s",
      "dash_id": "u"
    }
  ]
}
```

## 5. アプリケーションでの利用フロー

1.  **ロード:** アプリ起動時に `morse_tree.json` を非同期で読み込む。
2.  **パース:** JSONを連想配列（Map形式）に変換し、`id` で各ノードを直接参照できるようにする。
3.  **初期化:** `id: "root"` のノードを「現在のアクティブノード」に設定し、対応する画面上のLEDを強調表示する。
4.  **遷移:**
    *   短押し検知 → 現在のノードの `dot_id` を参照 → 新しいノードへ移動。
    *   長押し検知 → 現在のノードの `dash_id` を参照 → 新しいノードへ移動。

## 6. 移植時の注意点
*   **WEB版:** `fetch('data/morse_tree.json')` を使用してロードする。
*   **Android Native版:** `assets` フォルダに配置し、`InputStream` を経由して読み込む。


