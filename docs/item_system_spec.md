# アイテムシステム仕様書

## 概要
アイテムデータは外部JSONファイル (`items.json`) で管理され、ゲーム開始時に非同期で読み込まれます。
アイテムの効果はJSONデータに基づいて動的に処理されます。

## データ構造 (`items.json`)

### アイテム定義 (`items`)
各アイテムは一意のID（キー）を持ち、以下のプロパティで定義されます。

```json
"herb": {
  "name": "薬草",           // 表示名
  "emoji": "🌿",           // 表示アイコン
  "description": "HP 30回復", // 説明文
  "rarity": "common",      // レアリティ (common, uncommon, rare, legendary)
  "category": "recovery",  // カテゴリ (recovery, revive, etc.)
  "effect": {              // 効果設定
    "type": "heal",        // 効果タイプ
    "target": "single",    // 対象 (single, all)
    "value": 30,           // 効果量
    "unit": "fixed"        // 単位 (fixed: 固定値, percent: 最大HPに対する割合)
  }
}
```

### 効果タイプ (`effect.type`)
| タイプ | 説明 | 必要なパラメータ |
|---|---|---|
| `heal` | HPを回復する | `value` (回復量), `unit` (fixed/percent) |
| `revive` | 戦闘不能状態から復活させる | `value` (復活時のHP量), `unit` (fixed/percent) |

### 対象 (`effect.target`)
| 値 | 説明 |
|---|---|
| `single` | 選択したモンスター（またはアクティブモンスター）1体 |
| `all` | パーティ全員（生存しているモンスターのみ、reviveの場合は無効） |

### 単位 (`effect.unit`)
| 値 | 説明 |
|---|---|
| `fixed` | 固定値で計算（例: value=30 なら 30回復） |
| `percent` | 最大HPに対する割合で計算（例: value=50 なら 最大HPの50%回復） |

## ルートテーブル (`lootTable`)
宝箱から出現するアイテムと確率を定義します。

```json
[
  { "item": "herb", "weight": 40 },    // item: アイテムID, weight: 重み
  { "item": "potion", "weight": 30 }
]
```
確率は `weight / 全weightの合計` で計算されます。

## 拡張ガイド

### 新しいアイテムの追加
1. `items.json` の `items` オブジェクトに新しいエントリを追加します。
2. 必要に応じて `lootTable` にも追加して、宝箱から出るようにします。

### 新しい効果タイプの追加
1. `items.js` の `Item.use` メソッド内の `switch (effect.type)` に新しいケースを追加します。
2. 対応する処理メソッド（例: `useBuff`）を実装します。
