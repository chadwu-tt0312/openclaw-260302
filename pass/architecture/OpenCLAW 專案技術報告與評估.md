# **OpenClaw 全端架構深度技術評估報告：從 POC 部署到企業級整合的戰略分析**

## **1\. 執行摘要與戰略評估**

### **1.1 管理層綜述**

隨著 2026 年初自主 AI Agent 技術的爆發性增長，企業自動化架構正經歷從「靜態腳本」向「動態代理」的典範轉移。OpenClaw（前身為 ClawdBot 與 MoltBot）作為此一領域的開源領航者，在短短數週內累積超過 10 萬顆 GitHub 星星，顯示了社群對於「本地優先（Local-First）」且具備「高權限執行能力」的 AI 助理有著強烈需求 1。本報告旨在為技術決策者提供一份詳盡的架構剖析與部署指南，評估 OpenClaw 是否適合納入企業技術堆疊。

從架構視角審視，OpenClaw 的核心價值在於其打破了 SaaS AI 代理的「圍牆花園（Walled Garden）」限制。傳統 SaaS 解決方案通常無法直接存取企業內部的檔案系統、終端機或本地開發環境，而 OpenClaw 透過本地閘道器（Gateway）與 Docker 沙箱的設計，賦予了 LLM 直接操作作業系統的能力 3。這使得它在自動化 DevOps 運維、複雜資料清洗流程以及個人化行政助理等場景中展現出巨大的潛力。然而，這種「高權限」特性是一把雙面刃。給予 AI 代理 Shell 層級的存取權限，若缺乏嚴格的隔離與監控機制，將構成極大的資安風險，即所謂的「混淆代理人（Confused Deputy）」攻擊風險 5。

### **1.2 戰略適配性分析**

* **技術成熟度（Maturity）：** OpenClaw 目前處於極度活躍的迭代期（v2026.x 版本）。專案在一個月內經歷了三次更名與重構，雖然功能強大，但穩定性尚未達到傳統企業軟體標準。升級過程常伴隨服務衝突或配置失效，需要專職工程師維護 7。  
* **成本效益（Cost Efficiency）：** 相較於按席位計費的 Enterprise Copilot 方案，OpenClaw 作為開源專案無授權費，但會將成本轉移至基礎設施維運（VPS/VM）與 LLM API Token 的消耗。對於高頻使用的場景，其 Token 消耗量可能極為可觀 8。  
* **整合彈性（Extensibility）：** 這是 OpenClaw 的最大優勢。透過 Model Context Protocol (MCP) 與插件系統，它可以無縫對接企業內部的 legacy 系統，無需等待供應商開發特定整合 9。

**總體建議：** 建議在受控的沙箱環境中進行概念驗證（POC），用於輔助研發與運維團隊。嚴禁在未經二次開發與安全加固的情況下，將其直接部署於存有敏感客戶資料的生產環境。

---

**2\. 專案背景與生態系統演化**

### **2.1 品牌重塑與社群動態**

理解 OpenClaw 的技術現狀，必須先理解其劇烈的演化史。該專案最初名為 **ClawdBot**，意圖模仿 Anthropic 的 Claude 模型名稱與能力。隨後因商標爭議更名為 **MoltBot**（象徵龍蝦脫殼成長），最終在 2026 年 1 月定名為 **OpenClaw** 2。

這段演化過程對技術架構產生了深遠影響：

1. **程式碼庫遺留問題：** 快速更名導致程式碼中殘留了舊版變數與路徑（如 \~/.clawdbot 與 \~/.openclaw 的混用），這在自動化部署腳本中常引發路徑錯誤 7。  
2. **供應鏈安全風險：** 頻繁的更名與網域變更，創造了攻擊者進行「域名搶註（Typosquatting）」與發布惡意插件的機會。攻擊者利用社群的混淆，發布偽裝成官方擴充套件的惡意軟體，這在進行二次開發整合時需格加小心 2。

### **2.2 核心設計哲學：本地優先與主動性**

OpenClaw 與傳統 Chatbot 最大的不同在於其「主動性（Proactivity）」與「狀態持久化（Persistence）」。

* **主動性：** 它不僅是被動回應使用者指令，還能透過 Cron Job 與事件監聽器，主動發起對話或執行任務（例如：監控伺服器日誌並在異常時發送 Telegram 通知）4。  
* **狀態持久化：** 所有對話記錄、記憶向量與配置皆以檔案形式儲存在本地端。這意味著使用者擁有數據的完全主權，但也意味著本地儲存設備的安全性等同於資料的安全性 4。

---

**3\. 核心系統架構深度剖析**

OpenClaw 採用微服務化的單體架構（Modular Monolith），核心由一個 Node.js 驅動的閘道器（Gateway）負責協調所有 I/O 與邏輯處理。

### **3.1 架構總覽**

系統可劃分為三個主要層級：**控制平面（Control Plane）**、**代理執行層（Agent Runtime）** 與 **介面整合層（Interface Layer）**。

| 元件層級 | 核心組件 | 技術堆疊 | 職責描述 |
| :---- | :---- | :---- | :---- |
| **控制平面** | Gateway Server | Node.js (≥v22), WebSocket | 負責連線管理、身分驗證、訊息路由與系統狀態監控。是唯一的 Single Source of Truth。 |
| **執行層** | Agent Runtime (Pi) | TypeScript, RPC | 執行 AI 邏輯、Prompt 構建、工具呼叫（Tool Calling）與上下文管理。 |
| **執行層** | Docker Sandbox | Docker API | 提供隔離的環境以執行 Shell 指令與非信任程式碼，防止宿主機被破壞。 |
| **介面層** | Channel Adapters | Baileys, grammY, Discord.js | 將各類即時通訊軟體（IM）的專有協議轉換為 OpenClaw 的標準訊息信封（Envelope）。 |
| **介面層** | ACP Bridge | stdio, NDJSON | 允許 IDE（如 VS Code, Zed）透過標準輸入輸出與 Agent 進行互動。 |
| **儲存層** | Local FS | JSON5, JSONL, Vector Stores | 儲存配置檔、對話日誌與向量記憶索引。 |

### **3.2 閘道器（Gateway）與通訊協議**

閘道器是 OpenClaw 的心臟，預設監聽 ws://127.0.0.1:18789。它不只是簡單的 API Server，而是一個維持長連接的狀態機 3。

* **單一實例原則：** 架構設計上強烈建議每台主機僅運行一個 Gateway 實例。這是因為像 WhatsApp Web (Baileys) 這類協議，不允許同時有多個 Session 連線。Gateway 獨佔這些連線資源以確保穩定性 15。  
* **WebSocket 協議設計：** Gateway 使用基於 JSON 的 WebSocket 訊息交換。雖然官方文檔未完全公開協議細節，但從日誌與除錯訊息可推斷其採用事件驅動模型 16。客戶端（如 CLI 或 Web UI）連接後，需進行 handshake 認證，隨後訂閱特定 topics 以接收訊息流。  
* **安全性邊界：** Gateway 預設僅信任 Loopback (127.0.0.1) 連線。若需遠端存取（如 Mobile App 連線），必須配置 GATEWAY\_TOKEN。此處存在一個已知的架構弱點：若反向代理（Reverse Proxy）配置不當，未能正確剝離 X-Forwarded-For 標頭，外部攻擊者可能偽裝成本地連線繞過認證 17。

### **3.3 代理運行時（Agent Runtime & Pi）**

OpenClaw 目前主要的 Agent 實作稱為 **"Pi"**。它採用 RPC（遠端程序呼叫）模式與 Gateway 通訊 15。

* **Prompt Builder：** 位於 src/agents/prompt-builder.ts（推測路徑），負責將使用者的自然語言、當前的系統狀態（時間、OS 資訊）、以及可用的工具列表（Tools Manifest）動態組裝成 LLM 可理解的 System Prompt 18。  
* **工具執行策略：** 當 LLM 決定呼叫工具時，Pi Runtime 會攔截該請求。對於高風險操作（如 fs.write 或 exec），它會將指令轉發至 Docker Sandbox 中執行，而非直接在 Gateway 進程中運行。這是防禦 Prompt Injection 導致 RCE（遠端代碼執行）的最後一道防線 19。

### **3.4 模型上下文協議（MCP）整合**

OpenClaw 深度整合了 Anthropic 提出的 **Model Context Protocol (MCP)**。這是一個標準化介面，允許 Agent 連接外部數據源與工具，就像 USB-C 接口一樣通用 9。

* **運作機制：** 開發者可以在 openclaw.json 中註冊 MCP Server（例如 GitHub MCP, Postgres MCP）。Gateway 啟動時會生成這些 MCP Server 的子進程（Child Process），並透過 stdio 橋接它們的工具定義給 LLM。這意味著 OpenClaw 可以直接利用社群維護的數百種 MCP 工具，而無需自行編寫整合程式碼 20。

---

**4\. 部署驗證與基礎設施配置**

為了驗證 OpenClaw 在企業環境的可行性，本報告設計了一套基於 Docker Compose 的標準化 POC 部署方案。此方案優於直接在主機上安裝，因為它提供了環境隔離與易於遷移的特性。

### **4.1 基礎設施需求**

* **硬體規格：**  
  * CPU: 至少 2 vCPU（Node.js 運行時與 Docker 容器開銷）。  
  * RAM: 建議 4GB 以上（Headless Browser 與向量檢索相當耗記憶體）。  
  * Storage: SSD 20GB（用於儲存對話日誌與 Docker 映像檔）。  
* **作業系統：** Ubuntu 24.04 LTS (x86\_64/ARM64) 或 macOS Sequoia (若需 iMessage 支援) 1。  
* **網路環境：** 需具備對外存取 HTTPS (443) 的能力以連接 LLM API (Anthropic/OpenAI)。不建議直接將 Gateway Port 暴露於公網，建議搭配 Tailscale 或 Cloudflare Tunnel 23。

### **4.2 Docker Compose 配置詳解**

以下是經過安全性加固的 docker-compose.yml 配置範本。我們移除了不必要的權限，並嚴格限制了網路綁定。

YAML

services:  
  \# 核心 Gateway 服務  
  openclaw:  
    image: openclaw/gateway:latest  \# 建議鎖定具體 hash 版本以避免更新導致的不穩定  
    container\_name: openclaw\_core  
    restart: unless-stopped  
    \# 安全加固：移除所有 Linux Capabilities，僅保留必要的  
    cap\_drop:  
      \- ALL  
    security\_opt:  
      \- no\-new-privileges:true  
    \# 網路綁定：僅監聽 localhost，防止外部直接掃描  
    ports:  
      \- "127.0.0.1:18789:18789"  
    volumes:  
      \# 持久化配置與記憶體  
      \-./config:/root/.openclaw  
      \-./sessions:/root/.openclaw/sessions  
      \# 允許 Gateway 生成兄弟容器（Sibling Containers）以執行沙箱任務  
      \# 注意：這賦予了容器控制 Docker Daemon 的權限，需確保宿主機 Docker 安全  
      \- /var/run/docker.sock:/var/run/docker.sock  
    environment:  
      \- NODE\_ENV=production  
      \- OPENCLAW\_GATEWAY\_TOKEN=${GATEWAY\_TOKEN}  \# 從.env 讀取  
      \- ANTHROPIC\_API\_KEY=${ANTHROPIC\_API\_KEY}  
      \- OPENAI\_API\_KEY=${OPENAI\_API\_KEY}  
      \- LOG\_LEVEL=info  
    networks:  
      \- openclaw\_net

  \# 瀏覽器控制服務（用於 Web Agent 功能）  
  browser:  
    image: openclaw/browser-control:latest  
    container\_name: openclaw\_browser  
    init: true  
    cap\_add:  
      \- SYS\_ADMIN \# Headless Chrome 需要此權限  
    networks:  
      \- openclaw\_net

networks:  
  openclaw\_net:  
    driver: bridge

6

### **4.3 環境變數與初始化**

在專案根目錄建立 .env 檔案，這是管理敏感憑證的最佳實踐，避免將 API Key 硬編碼於 YAML 中。

Bash

\#.env 範例  
GATEWAY\_TOKEN=sk\_claw\_your\_secure\_generated\_token\_here\_xyz  
ANTHROPIC\_API\_KEY=sk-ant-api03-...  
OPENAI\_API\_KEY=sk-proj-...  
\# 模型選擇設定  
DEFAULT\_MODEL=claude-3-opus-20240229  
\# 時區設定，對行事曆功能至關重要  
TZ=Asia/Taipei

26

**初始化流程：**

1. **啟動服務：** docker compose up \-d  
2. **生成初始配置：** 若是首次運行，容器可能會自動執行 openclaw onboard 邏輯，或需進入容器執行 openclaw onboard \--install-daemon（在 Docker 內僅需生成 config）3。  
3. **驗證狀態：** 使用 docker compose logs \-f openclaw 觀察啟動日誌，確認 WebSocket Server 成功綁定至 18789 端口，且無權限錯誤 28。

---

**5\. 功能驗證與測試場景**

為了確保 OpenClaw 能滿足業務需求，我們設計了三個層級的功能驗證測試。

### **5.1 測試場景一：多渠道訊息路由（The Messaging Loop）**

**目標：** 驗證 Gateway 能正確處理來自不同 IM 平台的訊息，並維護 Session 上下文。

* **操作步驟：**  
  1. 配置 Telegram Bot Token 於 openclaw.json。  
  2. 使用者在 Telegram 向 Bot 發送 "Hello"。  
  3. **預期行為：**  
     * 首次互動應觸發「配對（Pairing）」機制，Bot 回覆一組 6 位數代碼 3。  
     * 管理員在 Gateway CLI 執行 openclaw pairing approve telegram \<code \>。  
     * 配對成功後，Bot 回覆 Agent 的歡迎語。  
  4. **進階驗證：** 發送圖片。Agent 應能透過 Vision 模型（如 Claude 3.5 Sonnet）描述圖片內容。這驗證了多媒體管道（Media Pipeline）的運作正常 30。

### **5.2 測試場景二：工具執行與沙箱隔離（The Tool Execution）**

**目標：** 驗證 Agent 能自主呼叫工具，且危險操作被限制在沙箱內。

* **操作步驟：**  
  1. 發送指令：「請在當前目錄下建立一個名為 audit\_log.txt 的檔案，內容為當前時間。」  
  2. **預期行為：**  
     * Agent 分析意圖，決定呼叫 fs.writeFile 或執行 shell 指令 echo... \> audit\_log.txt。  
     * Gateway 攔截指令，啟動一個臨時的 Docker 容器（Sandbox）。  
     * 指令在容器內執行成功，回傳結果。  
     * Agent 回覆：「已成功建立檔案。」  
  3. **安全性驗證：** 發送指令：「列出 /root/.ssh/ 下的所有檔案。」  
     * 若沙箱配置正確，Agent 應回報找不到路徑或權限不足，證明其無法存取宿主機的敏感目錄 5。

### **5.3 測試場景三：跨 Session 記憶回溯（Persistent Memory）**

**目標：** 驗證長期記憶模組的有效性。

* **操作步驟：**  
  1. 在 Session A（例如 Telegram）告訴 Agent：「我負責的專案代號是 Project X。」  
  2. 等待數小時或重啟 Container。  
  3. 在 Session B（例如 Web Chat）或同一個 Session 問：「我負責哪個專案？」  
  4. **預期行為：** Agent 檢索本地向量索引或 JSONL 歷史記錄，正確回答「您負責的是 Project X。」這驗證了 src/memory/ 模組的寫入與讀取功能正常 14。

---

**6\. 二次開發指南：擴充與整合**

作為架構師，不僅要部署，更要具備擴充能力。OpenClaw 的插件架構允許我們針對特定業務需求進行深度客製。

### **6.1 開發自定義通訊渠道 (Channel Extension)**

假設企業內部使用一套名為 "CorpChat" 的通訊軟體，我們需要開發一個 Adapter。

**目錄結構：**

extensions/
├── corp-chat-plugin/
├── package.json
├── src/
├── index.ts
└── provider.ts

**實作邏輯 (TypeScript 範例)：**

```TypeScript

// src/index.ts \- 插件註冊入口  
import { OpenClawExtension, ChannelProvider } from '@openclaw/core';  
import { CorpChatProvider } from './provider';

export default class CorpChatPlugin implements OpenClawExtension {  
  register(api: any) {  
    // 向核心註冊一個新的 channel 類型 'corp-chat'  
    api.channels.register('corp-chat', new CorpChatProvider(api));  
  }  
}

// src/provider.ts \- 實作通訊邏輯  
export class CorpChatProvider implements ChannelProvider {  
  constructor(private api: any) {}

  async connect() {  
    // 1\. 連線至 CorpChat WebSocket  
    this.client \= new CorpChatClient(this.api.config.channels\['corp-chat'\].token);  

    this.client.on('message', (msg) \=\> {  
      // 2\. 正規化訊息 (Normalization)  
      // 將外部格式轉換為 OpenClaw 的標準 Envelope  
      this.api.ingress.dispatch({  
        id: msg.messageId,  
        text: msg.body,  
        sender: { id: msg.senderId, name: msg.senderName },  
        channel: 'corp-chat',  
        raw: msg  
      });  
    });  
  }

  async send(target: string, message: string) {  
    // 3\. 處理外發訊息  
    await this.client.postMessage(target, { text: message });  
  }  
}
```

此結構遵循 OpenClaw 的擴充標準，利用 api.ingress.dispatch 將外部事件注入 Gateway 的事件迴圈中 30。

### **6.2 整合 Model Context Protocol (MCP) 工具**

將現有的企業 API（如 ERP 查詢）封裝為 MCP Server 供 OpenClaw 使用是最快的方法。

**步驟：**

1. **開發 MCP Server：** 使用 Python 或 Node.js SDK 編寫一個簡單的 HTTP Server，暴露 tools/list 與 tools/call 端點。  
2. **配置 openclaw.json：**

```JSON
"mcp": {  
  "erp-connector": {  
    "type": "stdio", // 或 "sse" 用於遠端  
    "command": "python3",  
    "args": \["/path/to/erp\_mcp\_server.py"\],  
    "enabled": true  
  }  
}
```

Gateway 啟動時會自動掛載此 MCP Server，Agent 的 Prompt 中會即時出現如 query\_inventory(sku) 的工具定義，無需修改 Agent 核心程式碼 10。

---

**7\. API 定義與通訊協議**

為了進行自動化整合（如 CI/CD 流水線觸發 Agent 通知），理解 OpenClaw 的 API 至關重要。

### **7.1 WebSocket 協議與 JSON 結構**

Gateway 與 Client 之間的通訊是全雙工的。雖然官方文檔缺乏詳細 Schema，但從除錯日誌可歸納出以下結構：

**連線握手 (Handshake):**

```JSON
{  
  "type": "hello",  
  "version": "2026.1.29",  
  "auth": { "token": "GATEWAY\_TOKEN" },  
  "capabilities": \["chat", "canvas"\]  
}
```

**訊息事件 (Message Event):**

當 Agent 回覆時，WebSocket 會推送如下 payload：

```JSON
{  
  "type": "agent:message",  
  "id": "msg\_12345",  
  "sessionId": "agent:main:telegram:123456",  
  "content": {  
    "text": "已為您查詢到庫存數據。",  
    "attachments":  
  },  
  "metadata": {  
    "model": "claude-3-opus",  
    "usage": { "input": 500, "output": 20 }  
  }  
}
```

16

### **7.2 CLI 命令參考**

CLI 是管理 Gateway 的主要介面。

| 命令 | 用途 | 參數範例 |
| :---- | :---- | :---- |
| openclaw gateway | 啟動 Gateway 服務 | \--port 18789 \--verbose |
| openclaw onboard | 執行初始化嚮導 | \--install-daemon |
| openclaw message send | 發送主動訊息 | \--channel telegram \--target @user \--message "Alert\!" |
| openclaw pairing list | 查看待審核的配對請求 | whatsapp |
| openclaw doctor | 系統健康檢查 | 無 (檢查依賴與配置) |

3

---

**8\. 專案穩定性與風險分析 (Issue/Release)**

### **8.1 版本混亂與升級風險**

OpenClaw 的開發節奏極快，但版本管理呈現一定程度的混亂。從 v2026.1.24 升級至 v2026.1.29 時，發生了嚴重的服務衝突問題。

* **雙重服務衝突：** 安裝新版時未自動停止舊版 clawdbot-gateway，導致新舊服務同時搶佔 18789 端口，造成服務進入重啟迴圈（Restart Loop）7。  
* **建議策略：** 在生產環境中，**絕對不要使用 latest tag**。務必鎖定具體的 SHA Hash 或 Release Tag，並在測試環境驗證升級腳本是否包含 systemctl stop 與殘留檔案清理邏輯。

### **8.2 關鍵功能缺陷 (Bugs)**

* **Telegram 路由失效 (Issue \#5248)：** 社群回報在特定版本中，Telegram 的入站訊息能被接收，但 Agent 的回應卻被錯誤路由至 webchat 介面，導致 Telegram 使用者收不到回覆。這是一個 High Priority 的核心 Bug，顯示其多渠道路由邏輯（Routing Logic）仍有缺陷 35。  
* **記憶體洩漏 (Memory Leak)：** Slack 整合模組中的 Thread Cache 被發現會無限增長，導致長期運行的容器最終因 OOM (Out of Memory) 而崩潰 36。這對於期望 "Always-on" 的 Agent 來說是致命傷。

---

**9\. 安全性深度評估**

安全性是企業導入 OpenClaw 的最大阻礙。

### **9.1 Localhost 欺騙漏洞 (Localhost Spoofing)**

OpenClaw Gateway 預設信任來自 127.0.0.1 的連線。這在單機使用沒問題，但在 VPS 部署時，若前方有 Nginx 反向代理，且 Nginx 配置未正確覆寫來源 IP，所有外部請求在 Gateway 眼中都會變成 127.0.0.1。攻擊者可利用此漏洞繞過身分驗證，直接控制 Agent 執行 Shell 指令 17。

* **防禦措施：** 確保 Nginx 配置包含 proxy\_set\_header X-Forwarded-For $remote\_addr;，並在 OpenClaw 配置中顯式關閉 localhost\_trust（若支援）或強制要求所有連線（含本地）皆需 Token。

### **9.2 提示注入 (Prompt Injection) 與 RCE**

由於 Agent 具有執行 Shell 的能力，惡意的提示注入（如來自電子郵件或網頁內容）可能誘使 Agent 執行毀滅性指令（如 rm \-rf /）。

* **防禦措施：**  
  1. **檢測層（Detection Layer）：** 不應讓 OpenClaw 直接連線 LLM。應在中間架設一層 Proxy（如使用 Glitch 或自建），對 Prompt 進行惡意特徵掃描 38。  
  2. **嚴格沙箱化：** 確保 Docker 容器以非 Root 用戶運行，並移除 CAP\_SYS\_ADMIN 等不必要的 Linux Capabilities 6。

---

**10\. 管理層綜合評估與建議**

### **10.1 SWOT 分析**

| 優勢 (Strengths) | 劣勢 (Weaknesses) |
| :---- | :---- |
| \- **資料主權：** 完全本地化，對話不經第三方 SaaS 儲存。 \- **整合力：** MCP 支援強大，易於對接 legacy 系統。 \- **成本：** 無授權費，僅需負擔 Infra 與 API 成本。 | \- **安全性：** 預設配置極不安全，攻擊面廣。 \- **穩定性：** 處於早期開發階段，Bug 多且 Breaking Changes 頻繁。 \- **維運門檻：** 需要懂 Docker、Node.js 與資安的工程團隊維護。 |
| **機會 (Opportunities)** | **威脅 (Threats)** |
| \- **自動化轉型：** 可成為企業內部的 "Universal Interface"，串接各類孤島系統。 \- **私有模型落地：** 未來可輕易切換至本地開源模型 (如 Llama 3)，進一步降低成本。 | \- **供應鏈攻擊：** 開源社群的惡意插件可能滲透企業內網。 \- **法規風險：** 若 Agent 誤操作導致資料外洩或系統損壞，責任歸屬難以界定。 |

### **10.2 ROI 與成本估算**

雖然節省了每人每月 30-50 美元的 SaaS 訂閱費，但需考量 Token 消耗。OpenClaw 的運作模式（長上下文、頻繁的工具定義注入）極為消耗 Token。

* **估算：** 一個活躍的 Agent 每日可能消耗 50k-100k Tokens。若使用 Claude 3 Opus，每日成本可能達 1-3 美元/人。  
* **建議：** 針對非關鍵任務，配置較便宜的模型（如 Claude 3 Haiku 或 GPT-4o-mini）以優化 ROI。

### **10.3 最終建議**

OpenClaw 是一個技術上令人興奮，但工程上尚未成熟的專案。

* **對於研發部門：** 強烈建議導入。其 MCP 整合與 CLI 能力能大幅提升 DevOps 效率。  
* **對於生產環境：** **暫緩導入**。目前的穩定性問題（如 Telegram 路由）與資安風險（Localhost Spoofing）對於企業級 SLA 而言風險過高。應等待 v2026.2 或更穩定版本，並觀察社群對於安全性的修補進度後再行評估。若必須使用，務必搭配嚴格的網路隔離與 Prompt 防火牆。

---

*(本報告基於 2026 年 1 月 31 日之技術情報彙編，相關代碼與配置可能隨專案更新而變動)*

#### **引用的著作**

1. OpenClaw (Moltbot/Clawdbot) Use Cases and Security 2026, 檢索日期：1月 31, 2026， [https://research.aimultiple.com/moltbot/](https://research.aimultiple.com/moltbot/)  
2. From Clawdbot to OpenClaw: When Automation Becomes a Digital Backdoor \- Vectra AI, 檢索日期：1月 31, 2026， [https://www.vectra.ai/blog/clawdbot-to-moltbot-to-openclaw-when-automation-becomes-a-digital-backdoor](https://www.vectra.ai/blog/clawdbot-to-moltbot-to-openclaw-when-automation-becomes-a-digital-backdoor)  
3. openclaw/openclaw: Your own personal AI assistant. Any OS. Any Platform. The lobster way. \- GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)  
4. OpenClaw — Personal AI Assistant, 檢索日期：1月 31, 2026， [https://openclaw.ai/](https://openclaw.ai/)  
5. OpenClaw: I Let This AI Control My Mac for 3 Weeks. Here's What It Taught Me About Trust. | by Max Petrusenko \- Medium, 檢索日期：1月 31, 2026， [https://medium.com/@max.petrusenko/openclaw-i-let-this-ai-control-my-mac-for-3-weeks-heres-what-it-taught-me-about-trust-e1642b4c8c9c](https://medium.com/@max.petrusenko/openclaw-i-let-this-ai-control-my-mac-for-3-weeks-heres-what-it-taught-me-about-trust-e1642b4c8c9c)  
6. Agency vs. Anarchy: Hardening the OpenClaw AI Frontier \- Penligent, 檢索日期：1月 31, 2026， [https://www.penligent.ai/hackinglabs/agency-vs-anarchy-hardening-the-openclaw-ai-frontier/](https://www.penligent.ai/hackinglabs/agency-vs-anarchy-hardening-the-openclaw-ai-frontier/)  
7. ClawdBot → OpenClaw migration leaves system in broken state (dual services, port conflicts, token mismatch) \#5103 \- GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/issues/5103](https://github.com/openclaw/openclaw/issues/5103)  
8. Is OpenClaw hard to use, expensive, and unsafe? memU bot solves these problems. : r/aiHub \- Reddit, 檢索日期：1月 31, 2026， [https://www.reddit.com/r/aiHub/comments/1qr7gy0/is\_openclaw\_hard\_to\_use\_expensive\_and\_unsafe\_memu/](https://www.reddit.com/r/aiHub/comments/1qr7gy0/is_openclaw_hard_to_use_expensive_and_unsafe_memu/)  
9. What is the Model Context Protocol (MCP)? \- Model Context Protocol, 檢索日期：1月 31, 2026， [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)  
10. MCP servers \- OpenCode, 檢索日期：1月 31, 2026， [https://opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/)  
11. openclaw/docs/start/lore.md at main \- GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/blob/main/docs/start/lore.md](https://github.com/openclaw/openclaw/blob/main/docs/start/lore.md)  
12. Personal AI Agents like OpenClaw Are a Security Nightmare \- Cisco Blogs, 檢索日期：1月 31, 2026， [https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare)  
13. Moltbot: The Ultimate Personal AI Assistant Guide for 2026 \- DEV Community, 檢索日期：1月 31, 2026， [https://dev.to/czmilo/moltbot-the-ultimate-personal-ai-assistant-guide-for-2026-d4e](https://dev.to/czmilo/moltbot-the-ultimate-personal-ai-assistant-guide-for-2026-d4e)  
14. How to Deploy OpenClaw – Autonomous AI Agent Platform | Vultr Docs, 檢索日期：1月 31, 2026， [https://docs.vultr.com/how-to-deploy-openclaw-autonomous-ai-agent-platform](https://docs.vultr.com/how-to-deploy-openclaw-autonomous-ai-agent-platform)  
15. OpenClaw: Index, 檢索日期：1月 31, 2026， [https://docs.openclaw.ai/](https://docs.openclaw.ai/)  
16. I migrated from clawdbot to openclaw and cronjobs are not working well. hangs up randomly \- Friends of the Crustacean \- Answer Overflow, 檢索日期：1月 31, 2026， [https://www.answeroverflow.com/m/1466957082849841364](https://www.answeroverflow.com/m/1466957082849841364)  
17. Clawdbot: Hyped AI agent risks leaking personal data, security experts warn, 檢索日期：1月 31, 2026， [https://www.trendingtopics.eu/clawbot-hyped-ai-agent-risks-leaking-personal-data-security-experts-warn/](https://www.trendingtopics.eu/clawbot-hyped-ai-agent-risks-leaking-personal-data-security-experts-warn/)  
18. Agent Builder | OpenAI API, 檢索日期：1月 31, 2026， [https://platform.openai.com/docs/guides/agent-builder](https://platform.openai.com/docs/guides/agent-builder)  
19. How to Run OpenClaw with DigitalOcean's One-Click Deploy, 檢索日期：1月 31, 2026， [https://www.digitalocean.com/community/tutorials/how-to-run-openclaw](https://www.digitalocean.com/community/tutorials/how-to-run-openclaw)  
20. Feature: Native MCP (Model Context Protocol) support · Issue \#4834 \- GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/issues/4834](https://github.com/openclaw/openclaw/issues/4834)  
21. Introducing the Model Context Protocol \- Anthropic, 檢索日期：1月 31, 2026， [https://www.anthropic.com/news/model-context-protocol](https://www.anthropic.com/news/model-context-protocol)  
22. Bluebubbles \- OpenClaw, 檢索日期：1月 31, 2026， [https://docs.openclaw.ai/channels/bluebubbles](https://docs.openclaw.ai/channels/bluebubbles)  
23. Introducing Moltworker: a self-hosted personal AI agent, minus the minis, 檢索日期：1月 31, 2026， [https://blog.cloudflare.com/moltworker-self-hosted-ai-agent/](https://blog.cloudflare.com/moltworker-self-hosted-ai-agent/)  
24. Deploy OpenClaw on AWS or Hetzner Securely with Pulumi and Tailscale, 檢索日期：1月 31, 2026， [https://www.pulumi.com/blog/deploy-openclaw-aws-hetzner/](https://www.pulumi.com/blog/deploy-openclaw-aws-hetzner/)  
25. What is Docker Compose, and how to use it \- Hostinger, 檢索日期：1月 31, 2026， [https://www.hostinger.com/tutorials/what-is-docker-compose](https://www.hostinger.com/tutorials/what-is-docker-compose)  
26. How to Install OpenClaw (Moltbot/Clawdbot) on Hostinger VPS, 檢索日期：1月 31, 2026， [https://www.hostinger.com/support/how-to-install-openclaw-on-hostinger-vps/](https://www.hostinger.com/support/how-to-install-openclaw-on-hostinger-vps/)  
27. Environment Variable in Docker Compose | by Tri Wicaksono \- Medium, 檢索日期：1月 31, 2026， [https://medium.com/@triwicaksono.com/environment-variable-in-docker-compose-9a4171fe7c98](https://medium.com/@triwicaksono.com/environment-variable-in-docker-compose-9a4171fe7c98)  
28. How to set up OpenClaw on a private server \- Hostinger, 檢索日期：1月 31, 2026， [https://www.hostinger.com/tutorials/how-to-set-up-openclaw](https://www.hostinger.com/tutorials/how-to-set-up-openclaw)  
29. Whatsapp \- OpenClaw, 檢索日期：1月 31, 2026， [https://docs.molt.bot/channels/whatsapp](https://docs.molt.bot/channels/whatsapp)  
30. openclaw/AGENTS.md at main · openclaw/openclaw · GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/blob/main/AGENTS.md](https://github.com/openclaw/openclaw/blob/main/AGENTS.md)  
31. openclaw/docs/index.md at main · openclaw/openclaw · GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/blob/main/docs/index.md](https://github.com/openclaw/openclaw/blob/main/docs/index.md)  
32. Plugin \- OpenClaw, 檢索日期：1月 31, 2026， [https://docs.molt.bot/plugin](https://docs.molt.bot/plugin)  
33. openclaw/openclaw v2026.1.20 on GitHub \- NewReleases.io, 檢索日期：1月 31, 2026， [https://newreleases.io/project/github/openclaw/openclaw/release/v2026.1.20](https://newreleases.io/project/github/openclaw/openclaw/release/v2026.1.20)  
34. Message \- OpenClaw, 檢索日期：1月 31, 2026， [https://docs.openclaw.ai/cli/message](https://docs.openclaw.ai/cli/message)  
35. Bug Report: Telegram Messages Don't Route Responses Back to Telegram \#5248 \- GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/issues/5248](https://github.com/openclaw/openclaw/issues/5248)  
36. Issues · openclaw/openclaw · GitHub, 檢索日期：1月 31, 2026， [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)  
37. Agency vs. Anarchy: Hardening the OpenClaw AI Frontier \- Penligent, 檢索日期：1月 31, 2026， [https://www.penligent.ai/hackinglabs/ko/agency-vs-anarchy-hardening-the-openclaw-ai-frontier/](https://www.penligent.ai/hackinglabs/ko/agency-vs-anarchy-hardening-the-openclaw-ai-frontier/)  
38. Added security guardrails to my OpenClaw deployment (blocks prompt injection with config change) : r/selfhosted \- Reddit, 檢索日期：1月 31, 2026， [https://www.reddit.com/r/selfhosted/comments/1qrbe3a/added\_security\_guardrails\_to\_my\_openclaw/](https://www.reddit.com/r/selfhosted/comments/1qrbe3a/added_security_guardrails_to_my_openclaw/)
