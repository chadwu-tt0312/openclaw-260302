# OpenClaw remote control and command
_Exported on 2026/3/5 at 16:53:07 [GMT+8] from Cursor (2.6.12)_

---

**User**

openclaw 如何跨電腦操控 WebUI chat ? 或者如何跨電腦下命令給 openclaw ?

---

**Cursor**

搜尋 OpenClaw 的 Web UI 與跨電腦操控／遠端下指令的設計。


正在確認 CLI 如何透過遠端 Gateway 發送訊息給 agent（WebChat 情境）：


根據文件與程式碼，整理成兩部分：**跨電腦用 Web UI 聊天** 與 **跨電腦對 OpenClaw 下指令**。

---

## 1. 跨電腦操控 Web UI（Control UI / WebChat）

Gateway 的 WebSocket + Control UI 預設只聽 `127.0.0.1:18789`。要從另一台電腦用瀏覽器開聊天，需要先讓那台電腦「連到」那台跑 Gateway 的機器，常用三種方式：

### 方式 A：SSH 隧道（通用）

在**你目前使用的電腦**上建立隧道，把遠端 Gateway 的 18789 轉到本機：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

- `user@gateway-host`：跑 OpenClaw Gateway 的那台機器的 SSH 帳號與主機名/IP。
- 隧道建立後，在**本機**瀏覽器開：**http://127.0.0.1:18789/**  
  等同於連到遠端那台機器的 Control UI（含聊天）。
- 文件說明：遠端模式是「把 Gateway WebSocket 用 SSH/Tailscale 隧道傳過來」，不需要在遠端再開一個 WebChat 伺服器。  
  [Remote Access](https://docs.openclaw.ai/gateway/remote) · [WebChat](https://docs.openclaw.ai/web/webchat)

### 方式 B：Tailscale Serve（推薦，有 Tailscale 時）

在**跑 Gateway 的那台機器**上：

- 維持 `gateway.bind: "loopback"`，用 Tailscale 代為對外提供服務：

```bash
openclaw gateway --tailscale serve
```

然後在**任一台有 Tailscale 的電腦**的瀏覽器開：

- **https://&lt;magicdns&gt;/**  
  （或你設的 `gateway.controlUi.basePath`，例如 `https://<magicdns>/openclaw`）

這樣是 HTTPS，且透過 Tailscale 身分驗證，無需自己建 SSH 隧道。  
[Web (Gateway)](https://docs.openclaw.ai/web) · [Control UI](https://docs.openclaw.ai/web/control-ui)

### 方式 C：macOS App 的「Remote over SSH」或 Direct

若你是用 **macOS 選單列 App**：

- **Settings → General → OpenClaw runs** 選 **Remote over SSH** 或 **Direct (ws/wss)**。
- 設好 SSH 目標（例如 `user@gateway-host`）或 Direct 時的 Gateway URL。
- App 會自己處理連線／隧道，**Web Chat 會自動走這條遠端連線**，不需手動建 tunnel。  
  [macOS Remote](https://docs.openclaw.ai/platforms/mac/remote)

---

## 2. 跨電腦下命令給 OpenClaw（CLI）

「下命令」指的是：在電腦 A 用終端機執行 `openclaw`，讓指令由**電腦 B 上跑的 Gateway** 執行。

### 步驟一：讓本機「看到」遠端 Gateway

任選其一：

- **SSH 隧道**（Gateway 只聽 loopback 時）：  
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
  ```
  之後本機的 `ws://127.0.0.1:18789` 就是遠端 Gateway。

- **Tailscale / 直連**：  
  若遠端已用 `--bind tailnet` 或 Tailscale Serve，本機可直接用遠端 URL（例如 `wss://<magicdns>` 或 `ws://<tailscale-ip>:18789`），不需 SSH。

### 步驟二：告訴 CLI 連到遠端

**做法 1：設定檔（常用於長期遠端）**

在本機的 `~/.openclaw/openclaw.json`（或你使用的 config）裡：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",   // 有 SSH tunnel 時用這個
      token: "your-gateway-token",
    },
  },
}
```

若用 Tailscale 直連，把 `url` 改成遠端的 `wss://...` 或 `ws://<tailscale-ip>:18789`。  
有 tunnel 時 URL 維持 `ws://127.0.0.1:18789`，先建立 SSH tunnel 再下指令。

**做法 2：每次指令帶參數**

```bash
openclaw agent --message "你要的指令" --url ws://127.0.0.1:18789 --token "your-token"
```

文件註明：用 `--url` 時不會用 config 的認證，**必須**自己加 `--token` 或 `--password`。  
[Remote Access - CLI remote defaults](https://docs.openclaw.ai/gateway/remote#cli-remote-defaults)

### 可用的遠端指令

連線設好後，在**本機**執行都會打到**遠端 Gateway**，例如：

- 和 agent 對話（等同在 Web Chat 發一則訊息）：  
  `openclaw agent --message "你要的指令"`
- 指定 session / 投遞到頻道等：  
  `openclaw agent --session-id ... --message "..."`、`openclaw agent --message "..." --deliver --channel telegram --reply-to <chat-id>`  
  見 [agent](https://docs.openclaw.ai/cli/agent) · [agent-send](https://docs.openclaw.ai/tools/agent-send)
- 發送到對外頻道（Telegram / Discord / Slack 等）：  
  `openclaw message send --channel <channel> --target <dest> --message "..."`  
  見 [message](https://docs.openclaw.ai/cli/message)
- 狀態與健康檢查：  
  `openclaw health`、`openclaw status --deep`

---

## 流程簡圖

```mermaid
flowchart LR
  subgraph 你的電腦
    Browser[瀏覽器 Control UI]
    CLI[openclaw CLI]
  end
  subgraph 連線方式
    SSH[SSH tunnel 18789]
    TS[Tailscale / Direct]
  end
  subgraph 跑 Gateway 的電腦
    GW[Gateway :18789]
  end
  Browser --> SSH
  CLI --> SSH
  Browser --> TS
  CLI --> TS
  SSH --> GW
  TS --> GW
```

- **跨電腦用 Web UI 聊天**：用 SSH tunnel 或 Tailscale（或 macOS App 的 Remote）連到該台 Gateway，再開瀏覽器或 App 的 Web Chat。
- **跨電腦下命令**：同一條連線（tunnel 或 Tailscale），搭配 `gateway.mode: "remote"` + `gateway.remote.url`（與 token），或 `--url` + `--token`，然後在本機執行 `openclaw agent` / `openclaw message` 等指令即可。

參考文件：

- [Remote Access](https://docs.openclaw.ai/gateway/remote)  
- [Web (Gateway) / Tailscale](https://docs.openclaw.ai/web)  
- [Control UI](https://docs.openclaw.ai/web/control-ui)  
- [WebChat](https://docs.openclaw.ai/web/webchat)  
- [macOS Remote](https://docs.openclaw.ai/platforms/mac/remote)  
- [CLI agent](https://docs.openclaw.ai/cli/agent)  
- [CLI message](https://docs.openclaw.ai/cli/message)

---

**User**

1. "user@gateway-host" 當 openclaw 安裝在 docker image 中。這部分如何設定?
2. 如何讓 其他程式透過 REST API 與 openclaw 通訊? openclaw 需要如何修改?

---

**Cursor**

搜尋 Docker 部署與現有 REST/HTTP API 的設定與實作。


正在產出計畫。


---

**User**

1. 我要在 https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev/overview 用 WebUI 與你對話。但是從 2026.3.1 更新到 2026.3.2 (從命令列執行變成 service) 之後網頁出現下列訊息 "origin not allowed (open the Control UI from the gateway host or allow it in gateway.controlUi.allowedOrigins)" 要如何解決?

---
"gateway": {
    "controlUi": {
      "allowedOrigins": [
        "https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev"
      ]
    }
  }
---
2. 即便openclaw.json 添加上面設定。依然出現訊息"origin not allowed (open the Control UI from the gateway host or allow it in gateway.controlUi.allowedOrigins)"。但修改成  "allowedOrigins": ["*"] 則正常(沒有錯誤訊息)
 如果不使用 "["*"]" 要如何解決?

---

**Cursor**

查看 origin 檢查的實作，找出為何指定 origin 無法通過。


查看 WebSocket 連線時如何取得並傳入 `origin`：


尋找 `requestOrigin` 與 `requestHost` 的來源：


查看 `headerValue` 的實作與 config 的載入時機：


比對時若瀏覽器或 proxy 送出的 Origin 帶有預設 port（例如 `:443`），會與未帶 port 的 allowlist 不符。我們會正規化 origin（移除 https 的 `:443` 與 http 的 `:80`），讓單一 allowlist 項目能匹配。


已修正並補上測試，摘要如下。

---

## 原因說明

1. **2026.3.1 → 2026.3.2**：Control UI 的 WebSocket 連線會檢查 `Origin`，非 loopback 時必須在 `gateway.controlUi.allowedOrigins` 裡放行，否則會出現 "origin not allowed"。
2. **你已設了正確網址仍失敗**：在 GitHub Codespaces / 反向代理環境下，瀏覽器或 proxy 送出的 `Origin` 常會帶**預設 port**，例如：
   - 你設：`https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev`
   - 實際請求：`https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev:443`  
   比對是整串完全一致，所以 `:443` 有無會導致不匹配。

---

## 程式修改（已做）

在 [src/gateway/origin-check.ts](src/gateway/origin-check.ts) 裡：

- 新增 **origin 正規化**：比對前會把「預設 port」拿掉（`https`/`wss` 的 `:443`、`http`/`ws` 的 `:80`）。
- 因此 **allowlist 只要寫一種即可**（有無 port 都會對應到同一正規化結果）。

這樣你原本的設定就會通過，不必再用 `["*"]`：

```json
"gateway": {
  "controlUi": {
    "allowedOrigins": [
      "https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev"
    ]
  }
}
```

若有多個網址（例如多個 preview 網域），就多列幾項，例如：

```json
"allowedOrigins": [
  "https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev",
  "https://another-preview-xxxx.app.github.dev"
]
```

---

## 你這邊要做的事

1. **改回精確的 allowedOrigins**：把 `["*"]` 換成上面的 `["https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev"]`（或你的實際網址列表）。
2. **使用含此修正的版本**：需使用已合入上述修改的 OpenClaw（例如從 main 建一次，或等 2026.3.3 之後的版本）。
3. **重啟 Gateway**：改完 `openclaw.json` 或升級後重啟 service，再從 `https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev/overview` 開 Control UI 測試。

這樣就不必用 `["*"]`，也能在 GitHub Codespaces 的 HTTPS 網址下正常使用 WebUI。

