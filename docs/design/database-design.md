## 2. データベース設計

### 2-1. データモデル全体図（userId最適化版）

```mermaid
erDiagram
    User ||--o{ Account : owns
    User ||--o{ Position : creates
    User ||--o{ Action : creates
    Account ||--o{ Position : has
    Account ||--o{ Action : targets
    Position ||--o{ Action : triggers

    User {
        string id PK
        string email "必須・認証用"
        string name "必須・表示名"
        UserRole role "必須・CLIENT/ADMIN"
        PCStatus pcStatus "ONLINE/OFFLINE"
        boolean isActive "必須・アカウント状態"
    }

    Account {
        string id PK
        string userId FK "所有者"
        string brokerType "MT4/MT5"
        string accountNumber "口座番号"
        string serverName "サーバー名"
        string displayName "表示名"
        float balance "現金残高"
        float credit "クレジット（ボーナス）"
        float equity "有効証拠金"
        boolean isActive "有効/無効"
        datetime lastUpdated
    }

    Position {
        string id PK
        string userId FK "作成者・実行担当"
        string accountId FK "所属口座"
        ExecutionType executionType "ENTRY/EXIT（ポジション種別）"
        PositionStatus status "必須"
        Symbol symbol "必須"
        float volume "必須・ロット数"
        float entryPrice "約定価格"
        datetime entryTime "約定時刻"
        float exitPrice "決済価格"
        datetime exitTime "決済時刻"
        string exitReason "決済理由"
        float trailWidth "トレール幅（0で即時実行）"
        string triggerActionIds "Optional・JSON配列"
        string mtTicket "MT4/5チケット番号"
        string memo "実行理由・メモ"
        datetime createdAt
        datetime updatedAt
    }

    Action {
        string id PK
        string userId FK "作成者・実行担当"
        string accountId FK "対象口座"
        string positionId FK "対象ポジション"
        string triggerPositionId FK "トリガー元ポジション"
        ActionType type "必須・ENTRY/CLOSE"
        ActionStatus status "必須"
        datetime createdAt
        datetime updatedAt
    }
```

### 2-2. userId追加による最適化効果

| 改善項目                  | 説明                            | クエリ例（GSI使用）                                                       |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| **1. 高速な担当判定**     | userIdのGSIで直接検索           | `listPositionsByUserId(userId: "user-123", limit: 100)`                   |
| **2. 実行対象の即座判定** | Account経由せずに判定可能       | `listActionsByUserIdAndStatus(userId: $myUserId, statusEq: "EXECUTING")`  |
| **3. 監視対象の効率化**   | 自分のトレール対象のみ監視      | `listPositionsByUserId(userId: $myUserId, filter: {trailWidth: {gt: 0}})` |
| **4. ユーザー別集計**     | GSI使用でユーザー単位の高速集計 | `listPositionsByUserIdAndStatus(userId: $userId, statusEq: "OPEN")`       |

### 2-3. 列挙型（Enum）定義

| 列挙型名           | 値                             | 説明                                 |
| ------------------ | ------------------------------ | ------------------------------------ |
| **Symbol**         | USDJPY, EURUSD, EURGBP, XAUUSD | 取引可能な銘柄                       |
| **PositionStatus** | PENDING                        | 作成済み・発注待機中                 |
|                    | OPENING                        | 発注処理中（実行開始後）             |
|                    | OPEN                           | エントリー約定済み・ポジション保有中 |
|                    | CLOSING                        | 決済指令済みでクローズ処理中         |
|                    | CLOSED                         | ポジション決済済み                   |
|                    | STOPPED                        | ロスカット執行済み                   |
|                    | CANCELED                       | 発注失敗等でポジション不成立         |
| **ActionType**     | ENTRY                          | 新規エントリー                       |
|                    | CLOSE                          | 通常クローズ                         |
| **ExecutionType**  | ENTRY                          | エントリー実行（新規ポジション作成） |
|                    | EXIT                           | 決済実行（既存ポジション決済）       |
| **ActionStatus**   | PENDING                        | アクション待機中                     |
|                    | EXECUTING                      | 実行中                               |
|                    | EXECUTED                       | 実行完了                             |
|                    | FAILED                         | 実行失敗                             |
| **UserRole**       | CLIENT                         | 一般ユーザー                         |
|                    | ADMIN                          | 管理者                               |
| **PCStatus**       | ONLINE                         | PC接続中                             |
|                    | OFFLINE                        | PC未接続                             |

**注記：ExecutionTypeとActionTypeの違い**
- **ExecutionType**: Positionの種別を示す（そのポジションがエントリー用か決済用か）
- **ActionType**: Actionが実行する操作の種別を示す（新規エントリーか既存ポジション決済か）

### 2-4. 認証・権限設計

各モデルの権限設定：

- **User**: 本人は読み取り・更新可、ADMINロールは全操作可
- **Account**: 所有者とADMINは全操作可
- **Position/Action**: userIdベースでの所有者とADMINグループは全操作可

