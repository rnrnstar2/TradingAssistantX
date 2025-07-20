## 5. システムアーキテクチャ詳細

### 5-1. Hedge Systemクライアント（Tauriアプリ）

```mermaid
graph TB
    subgraph "Hedge Systemクライアント"
        AccountMgr[口座管理<br/>クレジット監視]
        PositionExec[ポジション<br/>実行エンジン]
        PositionView[ポジション<br/>状況表示]
        TrailEngine[トレール<br/>判定エンジン]
        ActionSync[アクション<br/>同期実行]
        PipeServer[Named Pipe<br/>サーバー]
        CloudSync[クラウド<br/>同期]
    end

    AccountMgr --> PositionExec
    PositionView --> PositionExec
    PositionExec --> TrailEngine
    TrailEngine --> ActionSync
    ActionSync --> PipeServer
    CloudSync <--> all

    PipeServer <--> EA[MT4/MT5 EA]
    CloudSync <--> API[AppSync API]
```

主要機能：

1. **口座管理**

   - 接続中の口座情報管理
   - 残高・クレジット・証拠金の定期更新
   - クレジット変動の監視
   - userIdによる所有者特定

2. **ポジション実行エンジン**

   - 個別ポジションの実行管理
   - ポジションステータスの遷移管理
   - userIdベースの実行判定

3. **ポジション管理支援**

   - 口座全体のポジション状況表示
   - 人間が判断した両建て設定の実行
   - ネットポジションの計算・表示
   - クレジット活用状況の可視化

4. **トレール判定エンジン**
   - トレール設定を持つ全ポジションの監視
   - 各ポジション独立したトレール条件判定
   - triggerActionIdsの実行管理

### 5-2. ポジション実行フロー

```mermaid
stateDiagram-v2
    [*] --> Created: ポジション作成

    state Setup {
        Created --> Pending: status:PENDING設定
        Pending --> TrailConfig: トレール設定判定

        state TrailConfig {
            [*] --> CheckTrail: トレール必要？
            CheckTrail --> WithTrail: Yes
            CheckTrail --> NoTrail: No

            WithTrail --> SetTrailWidth: trailWidth設定
            SetTrailWidth --> CreateActions: トリガーアクション作成
            CreateActions --> SetActionIds: triggerActionIds設定
            SetActionIds --> [*]

            NoTrail --> [*]
        }
    }

    Setup --> Ready: 実行準備完了

    state Execution {
        Ready --> UserAction: ユーザー実行操作
        UserAction --> UpdateStatus: status更新
        UpdateStatus --> Opening: PENDING→OPENING
        Opening --> Notify: Subscription発火
    }

    Execution --> Processing: Hedge System処理

    state Processing {
        [*] --> CheckUser: userId確認
        CheckUser --> IsMyPosition: 自分の担当？
        IsMyPosition --> SendOrder: Yes：EA命令送信
        IsMyPosition --> Skip: No：スキップ
        SendOrder --> WaitResult: 約定待機
        WaitResult --> [*]
    }

    Processing --> Result: 処理結果

    state Result {
        [*] --> CheckResult: 結果判定
        CheckResult --> Success: 成功
        CheckResult --> Failed: 失敗

        Success --> Open: status:OPEN
        Failed --> Canceled: status:CANCELED

        Open --> StartMonitor: 監視開始
        Canceled --> [*]
    }

    Result --> Monitoring: トレール監視

    state Monitoring {
        StartMonitor --> CheckTrailSetting: トレール設定確認
        CheckTrailSetting --> HasTrail: trailWidth > 0
        CheckTrailSetting --> NoMonitor: トレールなし

        HasTrail --> PriceWatch: 価格監視
        PriceWatch --> TrailJudge: 条件判定
        TrailJudge --> Triggered: 条件成立
        TrailJudge --> Continue: 未成立
        Continue --> PriceWatch

        Triggered --> ExecuteActions: triggerActionIds実行
        NoMonitor --> [*]
    }

    Monitoring --> [*]: 決済/ロスカット
```

### 5-3. アクション実行の担当判定フロー

```mermaid
flowchart TD
    Start[Action Subscription受信] --> GetAction[Action情報取得]
    GetAction --> CheckUserId{userId確認}

    CheckUserId -->|自分のuserId| MyAction[自分の担当アクション]
    CheckUserId -->|他のuserId| OtherAction[他ユーザーの担当]

    MyAction --> CheckStatus{status確認}
    CheckStatus -->|EXECUTING| Execute[実行処理開始]
    CheckStatus -->|その他| Skip1[処理スキップ]

    Execute --> GetAccount[accountId取得]
    GetAccount --> ConnectEA[対象EA接続確認]
    ConnectEA --> SendCommand[コマンド送信]
    SendCommand --> UpdateResult[結果更新]

    OtherAction --> Skip2[処理スキップ]

    style MyAction fill:#e1f5fe
    style Execute fill:#c8e6c9
    style OtherAction fill:#ffcdd2
    style Skip1 fill:#eeeeee
    style Skip2 fill:#eeeeee
```

### 5-4. 管理者画面（Next.js）

```mermaid
graph TB
    subgraph "管理者画面"
        Account[口座管理]
        Position[ポジション管理]
        PositionSetup[ポジション設定]
        Monitor[リアルタイム監視]
    end

    Account --> Balance[残高・クレジット<br/>表示]
    Account --> Status[接続状態<br/>管理]

    Position --> Create[個別ポジション<br/>作成]
    Position --> Trail[トレール設定<br/>アクション設定]

    PositionSetup --> View[ポジション状況<br/>一覧表示]
    PositionSetup --> Adjust[ポジション<br/>設定実行]

    Monitor --> Live[ポジション<br/>状態表示]
    Monitor --> Action[アクション<br/>実行状況]
```

**主要機能：**

1. **口座管理**

   - 残高・クレジット・証拠金の表示
   - クレジット変動履歴
   - 口座接続状態

2. **ポジション管理**

   - 個別ポジション作成・実行
   - トレール設定（任意のポジションに設定可能）
   - アクション管理

3. **ポジション管理**
   - 口座全体の俯瞰表示
   - ネットポジション表示
   - 人間が決定したポジション設定の実行
   - クレジット活用状況の確認

