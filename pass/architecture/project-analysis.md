# OpenClaw 專案架構分析

## 1. 專案總覽

**OpenClaw** 是一個多通道 AI 閘道（Multi-channel AI Gateway），支援多種訊息平台的整合，提供 personal AI assistant 功能。

### 核心特性
- 多通道訊息收發（WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等）
- Gateway WebSocket 控制平面
- AI Agent 執行期（Pi agent runtime）
- 瀏覽器控制與 Canvas 渲染
- 跨平台支援（macOS、iOS、Android、Linux）

---

## 2. 專案架構圖

### 2.1 整體架構

```mermaid
flowchart TB
    subgraph User["使用者層"]
        UserMsg[訊息]
        UserApp[OpenClaw Apps]
    end
    
    subgraph Channels["通道層"]
        WA[WhatsApp]
        TG[Telegram]
        DC[Discord]
        SL[Slack]
        SG[Signal]
        IM[iMessage]
        Other[其他通道]
    end
    
    subgraph Core["核心層"]
        GW[Gateway<br/>WebSocket Control Plane]
        AG[Agent Runtime<br/>Pi Agent]
        SESS[Session Manager]
        ROUT[Message Router]
        HOOK[Hooks System]
    end
    
    subgraph Services["服務層"]
        MED[Media Pipeline]
        BRO[Browser Control]
        CAN[Canvas Host<br/>A2UI]
        NODE[Node Host]
        CRON[Cron Jobs]
    end
    
    subgraph Infra["基礎設施"]
        CFG[Config]
        SEC[Security]
        SECRETS[Secrets]
        LOG[Logging]
    end
    
    UserMsg -->|訊息| Channels
    Channels --> GW
    GW --> AG
    AG --> SESS
    GW --> ROUT
    ROUT --> Channels
    
    AG --> MED
    AG --> BRO
    AG --> CAN
    AG --> NODE
    AG --> CRON
    
    GW -.->|依賴| Infra
    AG -.->|依賴| Infra
```

### 2.2 Source Code 結構

```mermaid
flowchart TB
    subgraph src["src/ 目錄"]
        CLI[cli/<br/>CLI 接線]
        CMDS[commands/<br/>指令]
        GW[gateway/<br/>閘道]
        CH[channels/<br/>通道]
        
        subgraph Messaging["訊息通道"]
            TG[telegram/]
            DC[discord/]
            SL[slack/]
            SG[signal/]
            IM[imessage/]
            WA[whatsapp/]
            WEB[web/]
            LINE[line/]
        end
        
        AGENTS[agents/<br/>代理執行期]
        SESS[sessions/<br/>會話管理]
        PROV[providers/<br/>模型供應商]
        MEDIA[media/<br/>媒體管線]
        BRO[browser/<br/>瀏覽器控制]
        CANVAS[canvas-host/<br/>Canvas 主機]
        NODE[node-host/<br/>節點主機]
        WIZ[wizard/<br/>引導精靈]
        CFG[config/<br/>配置]
        HOOK[hooks/<br/>鉤子]
        CRON[cron/<br/>定時任務]
        ROUT[routing/<br/>路由]
        SEC[security/<br/>安全]
        SECRETS[secrets/<br/>密鑰]
    end
    
    CLI --> CMDS
    CMDS --> GW
    GW --> CH
    CH --> Messaging
    GW --> AGENTS
    AGENTS --> SESS
    GW --> PROV
    GW --> MEDIA
    GW --> BRO
    GW --> CANVAS
    GW --> NODE
    GW --> WIZ
```

---

## 3. Agent 系統架構

### 3.1 Agent 工作流程

根據 `AGENTS.md` 中的規範，OpenClaw 專案使用 Sisyphus Agent 系統進行任務處理：

```mermaid
flowchart TB
    START([使用者請求]) --> IG[Intent Gate<br/>意圖閘道]
    
    IG --> CLASS{請求分類}
    
    CLASS -->|Trivial| DIR[直接工具處理]
    CLASS -->|Explicit| EXEC[直接執行]
    CLASS -->|Exploratory| EXPLORE[探索 Agent]
    CLASS -->|Open-ended| ASSESS[評估 Codebase]
    CLASS -->|Ambiguous| CLARIFY[請求澄清]
    
    EXPLORE -->|背景執行| AGENT1[Explore Agent]
    AGENT1 -->|背景執行| AGENT2[Librarian Agent]
    AGENT2 --> SYN[綜合分析]
    
    ASSESS -->| Discipline?| PAT{程式碼風格}
    PAT -->|有規範| FOLLOW[遵循現有模式]
    PAT -->| Mixed| ASK[詢問確認]
    PAT -->|Chaotic| PROPOSE[提出方案]
    
    FOLLOW --> PLAN[規劃任務]
    ASK --> PLAN
    PROPOSE --> PLAN
    
    CLARIFY -->|取得澄清| EXEC
    
    PLAN --> DELEGATE[委派任務]
    DELEGATE --> SUB[Subagent 執行]
    SUB --> VERIFY[驗證結果]
    VERIFY -->|失敗| FIX[修復]
    FIX --> VERIFY
    VERIFY -->|成功| DONE([完成])
    
    DIR --> DONE
    EXEC --> DONE
    SYN --> DONE
```

### 3.2 Intent 分類流程

```mermaid
flowchart LR
    INPUT[使用者輸入] --> ANALYZE
    
    ANALYZE -->|"explain X"<br/>"how does Y work"| RESEARCH[Research/理解]
    ANALYZE -->|"implement X"<br/>"add Y"<br/>"create Z"| IMP[Implementation<br/>實作]
    ANALYZE -->|"look into X"<br/>"check Y"<br/>"investigate"| INVEST[Investigation<br/>調查]
    ANALYZE -->|"what do you think"| EVAL[Evaluation<br/>評估]
    ANALYZE -->|"I'm seeing error X"<br/>"Y is broken"| FIX[Fix Needed<br/>修復]
    ANALYZE -->|"refactor"<br/>"improve"<br/>"clean up"| OPEN[Open-ended<br/>開放式]
    
    RESEARCH --> R_ROUTE[explore/librarian<br/>→ synthesize → answer]
    IMP --> I_ROUTE[plan → delegate<br/>or execute]
    INVEST --> INV_ROUTE[explore →<br/>report findings]
    EVAL --> E_ROUTE[evaluate → propose<br/>→ wait confirmation]
    FIX --> F_ROUTE[diagnose → fix<br/>minimally]
    OPEN --> O_ROUTE[assess codebase<br/>→ propose approach]
```

### 3.3 Subagent 類型與使用情境

```mermaid
flowchart TB
    TASK[任務需求] --> TYPE{選擇 Agent 類型}
    
    TYPE -->|"探索codebase<br/>搜尋模式"| EXPLORE[Explore Agent<br/>Contextual Grep]
    TYPE -->|"外部資源<br/>文件/範例"| LIBRARIAN[Librarian Agent<br/>Reference Grep]
    TYPE -->|"架構決策<br/>複雜邏輯"| ORACLE[Oracle Agent<br/>Consultant]
    TYPE -->|"預先規劃<br/>範圍澄清"| METIS[Metis Agent<br/>Pre-planning]
    TYPE -->|"計劃審查<br/>品質把關"| MOMUS[Momus Agent<br/>Reviewer]
    
    EXPLORE -.->|"背景執行<br/>並行"| RESULT1[搜尋結果]
    LIBRARIAN -.->|"背景執行<br/>並行"| RESULT2[參考資料]
    ORACLE -.->|"諮詢模式"| RESULT3[專業建議]
    METIS -.->|"分析模式"| RESULT4[規劃分析]
    MOMUS -.->|"審查模式"| RESULT5[品質審查]
    
    RESULT1 --> COMBINE[綜合結果]
    RESULT2 --> COMBINE
    RESULT3 --> COMBINE
    RESULT4 --> COMBINE
    RESULT5 --> COMBINE
    COMBINE --> ACTION[採取行動]
```

### 3.4 Task 委派模式

```mermaid
sequenceDiagram
    participant U as User
    participant S as Sisyphus
    participant A as Subagent
    participant T as Tools
    participant C as Codebase
    
    U->>S: 任務請求
    S->>S: Intent Classification
    S->>S: Ambiguity Check
    
    alt 簡單任務
        S->>T: 直接執行工具
    else 複雜任務
        S->>S: Create Todo List
        S->>A: task(category, load_skills, prompt)
        A->>C: 讀取/搜尋
        A->>T: 執行工具
        A-->>S: 返回結果
        S->>S: 驗證結果
    end
    
    S-->>U: 完成回覆
```

---

## 4. 模組詳細說明

### 4.1 訊息通道 (Messaging Channels)

| 目錄 | 說明 | 技術堆疊 |
|------|------|----------|
| `telegram/` | Telegram Bot | grammY |
| `discord/` | Discord Bot | discord.js |
| `slack/` | Slack Bot | @slack/bolt |
| `signal/` | Signal | signal-cli |
| `whatsapp/` | WhatsApp Web | Baileys |
| `web/` | WhatsApp (另一實現) | Baileys |
| `imessage/` | iMessage (Legacy) | imsg |
| `line/` | LINE Bot | @line/bot-sdk |

### 4.2 核心服務 (Core Services)

```mermaid
graph LR
    subgraph Gateway["Gateway WS"]
        WS[WebSocket Server]
        API[REST API]
        WS --> API
    end
    
    subgraph Agent["Agent Runtime"]
        PI[Pi Agent]
        LOOP[Agent Loop]
        TOOLS[Tools Registry]
        PI --> LOOP
        LOOP --> TOOLS
    end
    
    subgraph Session["Session Management"]
        MAIN[Main Session]
        GROUPS[Group Sessions]
        NODES[Node Sessions]
    end
    
    WS --> Agent
    Agent --> Session
    Session -->|隔離| GROUPS
```

### 4.3 工具系統 (Tools System)

OpenClaw 提供了豐富的內建工具：

- **Browser Control**: 瀏覽器自動化
- **Canvas**: A2UI 視覺化工作區
- **Nodes**: 裝置節點控制（相機、螢幕錄影、位置等）
- **Cron**: 定時任務
- **Sessions**: 跨會話通訊工具

---

## 5. 資料流向

### 5.1 訊息處理流程

```mermaid
sequenceDiagram
    participant CH as Channel
    participant GW as Gateway
    participant RT as Router
    participant AG as Agent
    participant SM as Session
    participant OUT as Outbound
    
    CH->>GW: Inbound Message
    GW->>RT: Route Message
    RT->>SM: Get/Create Session
    
    par Agent Processing
        SM->>AG: Process Message
        AG->>SM: Tool Calls
        SM->>AG: Tool Results
    and Response
        AG->>SM: Final Response
    end
    
    SM->>OUT: Deliver Response
    OUT->>CH: Send to Channel
```

---

## 6. 部署架構

```mermaid
flowchart TB
    subgraph Client["客戶端"]
        MAC[macOS App]
        IOS[iOS App]
        AND[Android App]
        WEB[Web UI]
        CLI[CLI]
    end
    
    subgraph Gateway["Gateway (主機)"]
        GWS[WS Server]
        AUTH[Auth]
        SESS[Session Manager]
    end
    
    subgraph Node["節點 (可選)"]
        MNODE[macOS Node]
        INODE[iOS Node]
        ANODE[Android Node]
    end
    
    subgraph Cloud["雲端服務"]
        MODELS[AI Models<br/>OpenAI/Anthropic]
        DB[(Database)]
    end
    
    Client -->|WebSocket| Gateway
    Gateway --> MODELS
    Gateway <-->|WS| Node
    Gateway --> DB
```

---

## 7. 開發與測試

### 7.1 專案組織

```
openclaw/
├── src/                    # 主要原始碼
│   ├── cli/               # CLI 接線
│   ├── commands/          # CLI 指令
│   ├── gateway/           # WebSocket 閘道
│   ├── channels/          # 通道實作
│   ├── agents/            # Agent 執行期
│   ├── sessions/          # 會話管理
│   ├── providers/         # AI 模型供應商
│   └── ...
├── extensions/            # 插件/擴充套件
├── apps/                  # macOS/iOS/Android 應用
├── docs/                  # Mintlify 文件
├── skills/                # 技能套件
├── scripts/               # 腳本
└── test/                  # 測試檔案
```

### 7.2 常用指令

| 指令 | 說明 |
|------|------|
| `pnpm build` | 建置專案 |
| `pnpm test` | 執行測試 |
| `pnpm check` | Lint/Format 檢查 |
| `pnpm gateway:watch` | 開發模式閘道 |
| `pnpm openclaw onboard` | 執行引導精靈 |

---

## 8. 總結

OpenClaw 是一個複雜但結構清晰的多元訊息通道 AI 閘道系統。其核心價值在於：

1. **統一介面**: 透過 Gateway 統一管理多種訊息平台
2. **彈性擴充**: 支援 extensions/plugins 擴充新通道
3. **Agent 驅動**: 使用 Pi Agent Runtime 處理 AI 任務
4. **工具豐富**: 整合瀏覽器控制、Canvas、定時任務等
5. **跨平台**: 支援 macOS、iOS、Android 等多種客戶端

Agent 系統採用 Sisyphus 架構，強調意圖分類、任務委派、並行執行與驗證，確保開發效率與程式碼品質。
