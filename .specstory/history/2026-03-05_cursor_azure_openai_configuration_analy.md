# Azure OpenAI configuration analysis
_Exported on 2026/3/5 at 16:52:40 [GMT+8] from Cursor (2.6.12)_

---

**User**

請分析專案程式碼並參考  @smg/api-AzureOpenAI.http 送出 "AzureOpenAI" ， response @smg/Response-1772610358943.http 
然後協助修改 @smg/openclaw.json models.providers.azure 的設定 (目前設定 webui 顯示 404)

---

**Cursor**

先讀取相關檔案來了解目前的設定和 API 回應。

好的，讓我分析問題。成功的 API 呼叫 URL 是 `http://10.11.197.97/openai/deployments/gpt-5.2/chat/completions`，但目前設定的 `api: "openai-completions"` 可能產生不同的 URL path。讓我深入查看原始碼，了解 provider 如何組合 URL。

讓我再確認 SDK 實際組合 URL 的方式，確保 `baseUrl` 設定正確。

讓我確認 `openai-completions` adapter 如何組合最終 URL。

讓我確認 `resolveVerificationEndpoint` 的邏輯，以了解 SDK 如何組合 URL。

分析完成。以下是問題根因和修正方案：

## 問題分析

**成功的 API 呼叫 URL：**
```
http://10.11.197.97/openai/deployments/gpt-5.2/chat/completions
```

**目前設定的 `baseUrl`：** `http://10.11.197.97/`

SDK（`streamSimple` from `pi-ai`）會在 `baseUrl` 後面附加 `/chat/completions`，所以目前產生的 URL 是：
```
http://10.11.197.97/chat/completions  ← 404！
```

`isAzureUrl()` 只辨識 `.openai.azure.com` 和 `.services.ai.azure.com` 網域，不會對 `10.11.197.97` 這個 IP 做 Azure deployment path 轉換（`transformAzureUrl`），所以 `/openai/deployments/gpt-5.2` 這段路徑永遠不會被自動加入。

## 修正

需要將 `baseUrl` 改為包含完整 deployment 路徑：

確認修改後的完整 provider 設定：

修改完成。以下是完整的分析摘要：

---

## 問題摘要

| 項目 | 修改前 | 修改後 |
|---|---|---|
| `baseUrl` | `http://10.11.197.97/` | `http://10.11.197.97/openai/deployments/gpt-5.2` |
| SDK 組合的 URL | `http://10.11.197.97/chat/completions` (404) | `http://10.11.197.97/openai/deployments/gpt-5.2/chat/completions` (200) |

## 根因

1. **`isAzureUrl()`** 只辨識標準 Azure 網域（`.openai.azure.com`、`.services.ai.azure.com`），IP 位址 `10.11.197.97` 不會觸發 `transformAzureUrl()` 自動加上 `/openai/deployments/{model}` 路徑
2. SDK 的 `streamSimple` 直接在 `baseUrl` 後面接 `/chat/completions`，缺少中間的 deployment 路徑就會打到不存在的 endpoint → 404

## 其他設定驗證

- **`api: "openai-completions"`** — 正確，Azure OpenAI 使用 OpenAI-compatible 格式
- **`authHeader: false`** + **`headers: { "api-key": "..." }`** — 正確，Azure 使用 `api-key` header 而非 `Authorization: Bearer`
- **`api-version` query parameter** — 從成功的 curl 來看，此 proxy 不需要

## 注意事項

若之後需要新增其他 Azure deployment（例如 `gpt-4.1`），因為 `baseUrl` 是 provider 層級共用的，每個 deployment 需要建立獨立的 provider entry，例如：

```json
"azure-gpt52": { "baseUrl": "http://10.11.197.97/openai/deployments/gpt-5.2", ... },
"azure-gpt41": { "baseUrl": "http://10.11.197.97/openai/deployments/gpt-4.1", ... }
```

---

**User**

@smg/api-AzureOpenAI.http:2-18  實際 AzureOpenAI 的訊息格式與 url 如檔案 @smg/api-AzureOpenAI.http 所示。openclaw 能正常發送嗎? 是否需要修改?

---

**Cursor**

讓我深入分析 OpenClaw 使用 `openai-completions` adapter 發送請求時，實際的 HTTP request 格式。

讓我深入查看 `authHeader` 的處理邏輯和 `maxTokensField` compat 設定。

讓我查看 `maxTokensField` 的預設行為和 Azure OpenAI 相關的 compat 設定。

以下是完整的逐項比對分析：

---

## OpenClaw 發送格式 vs Azure OpenAI 實際格式比對

| 項目 | 你的 curl（實際可用） | OpenClaw 會發送的 | 相容？ |
|---|---|---|---|
| **URL** | `.../openai/deployments/gpt-5.2/chat/completions` | `baseUrl` + `/chat/completions` → 相同 | ✅ |
| **Header: api-key** | `api-key: d4922a22-...` | `headers: { "api-key": "..." }` | ✅ |
| **Header: Authorization** | 不送 | `authHeader: false` → 不注入 `Bearer` | ✅ |
| **Header: Content-Type** | `application/json` | SDK 自動設定 | ✅ |
| **Body: model** | `"model": "gpt-5.2"` | SDK 會送 `model` | ✅ Azure 會忽略（由 deployment URL 決定） |
| **Body: messages** | `[{role, content}]` | 相同格式 | ✅ |
| **Body: temperature** | `0.5` | 由 agent 設定決定 | ✅ |
| **Body: stream** | `false` | `true`（OpenClaw 預設 streaming） | ✅ Azure 支援 streaming |
| **Body: max tokens 欄位** | `max_completion_tokens` | 預設為 `max_tokens` | ⚠️ **需要修正** |

---

## 唯一需要修正的項目：`maxTokensField`

pi-ai SDK 對 `openai-completions` 預設使用 `max_tokens` 欄位。但 Azure OpenAI 的 GPT-5.2 模型使用 `max_completion_tokens`。

這在 OpenClaw 的 Azure onboarding 測試中有明確驗證：

```198:209:src/commands/onboard-custom.test.ts
    expect(firstUrl).toContain("/openai/deployments/gpt-4.1/chat/completions");
    expect(firstUrl).toContain("api-version=2024-10-21");
    expect(firstInit?.headers?.["api-key"]).toBe("azure-test-key");
    expect(firstInit?.headers?.Authorization).toBeUndefined();
    // ...
    expect(parsedBody).toMatchObject({
      messages: [{ role: "user", content: "Hi" }],
      max_completion_tokens: 5,
      stream: false,
    });
    expect(parsedBody).not.toHaveProperty("model");
    expect(parsedBody).not.toHaveProperty("max_tokens");
```

需要在 model 定義中加入 `compat.maxTokensField: "max_completion_tokens"`：

## 結論

**目前設定基本上可以正常發送**，經逐項比對只有一處需要修正。以下是兩次修改的總結：

### 修改 1（前次對話）：`baseUrl` 加入 deployment 路徑

```
修改前: "http://10.11.197.97/"
修改後: "http://10.11.197.97/openai/deployments/gpt-5.2"
```

原因：SDK 在 `baseUrl` 後接 `/chat/completions`，缺少 deployment 路徑會打到 404。

### 修改 2（本次）：加入 `compat.maxTokensField`

```json
"compat": {
  "maxTokensField": "max_completion_tokens"
}
```

原因：pi-ai SDK 預設使用 `max_tokens` 欄位，但 Azure OpenAI GPT-5.2 使用 `max_completion_tokens`。OpenClaw 自身的 Azure onboarding 測試也驗證了 Azure 端不應送 `max_tokens`。

### 其他項目皆相容，無需修改

- **`authHeader: false`** + **`headers: { "api-key": "..." }`** — 正確阻止 `Authorization: Bearer` 注入，改用 Azure 的 `api-key` header
- **`api: "openai-completions"`** — Azure OpenAI 使用 OpenAI-compatible 格式，正確
- **`stream: true`**（OpenClaw 預設） — Azure OpenAI 支援 streaming SSE，相容
- **Body 中的 `model` 欄位** — SDK 會送 `model: "gpt-5.2"`，Azure 會忽略（由 deployment URL 決定），不影響

---

**User**

幫我添加一個使用 gpt-4.1 的 @smg/openclaw.json  設定

---

**Cursor**

因為 Azure OpenAI 的 `baseUrl` 包含 deployment 名稱（每個 model 對應不同的 deployment path），所以 gpt-4.1 需要建立獨立的 provider entry。

接著在 `agents.defaults.models` 中註冊 gpt-4.1：

確認最終結果：

已完成。新增的 `azure-gpt41` provider 摘要：

| 項目 | 值 |
|---|---|
| Provider ID | `azure-gpt41` |
| Model ref | `azure-gpt41/gpt-4.1` |
| baseUrl | `http://10.11.197.97/openai/deployments/gpt-4.1` |
| 最終 API URL | `.../openai/deployments/gpt-4.1/chat/completions` |
| Context Window | 1,047,576 tokens (~1M) |
| Max Output | 32,768 tokens |
| 認證 | 同 azure provider（`api-key` header） |
| maxTokensField | `max_completion_tokens` |

**使用方式：** 目前 primary model 仍為 `azure/gpt-5.2`。若要切換預設模型為 gpt-4.1，將 `agents.defaults.model.primary` 改為 `"azure-gpt41/gpt-4.1"` 即可。如果 Azure proxy 上的 gpt-4.1 deployment 名稱不是 `gpt-4.1`，記得同步修改 `baseUrl` 中的 deployment 名稱。

---

**User**

/code-reviewer @smg/openclaw.json 分析設定項目是否正確。尤其是 models.providers 和 gateway.controlUi.allowedOrigins  設定  

---

**Cursor**

Let me read the full config and relevant source code to validate the settings.

Now I have a thorough understanding of the configuration and the codebase validation rules. Here's my review:

---

## Code Review: `smg/openclaw.json`

### 做得好的部分

- `models.providers` 結構正確使用了獨立 provider（`azure` / `azure-gpt41`）解決 Azure 每個 deployment 需要獨立 `baseUrl` 的限制
- `authHeader: false` + `headers: { "api-key": "..." }` 正確實作了 Azure 的認證模式
- `compat.maxTokensField: "max_completion_tokens"` 與 Azure OpenAI 的預期欄位一致
- `gateway.auth.mode: "token"` 搭配 `bind: "lan"` 是安全的組合

---

### Critical（必須修正）

沒有發現 Critical 等級的問題。

---

### Important（建議修正）

**1. `auth.profiles` 缺少 `azure-gpt41` 的 profile**

```12:18:smg/openclaw.json
  "auth": {
    "profiles": {
      "azure:default": {
        "provider": "azure",
        "mode": "api_key"
      }
    }
  },
```

目前只有 `azure:default`，但新增的 `azure-gpt41` provider 沒有對應的 auth profile。當 `azure-gpt41` 需要從 `auth-profiles.json` 解析憑證、或是 plugin auto-enable / failover 邏輯掃描 `auth.profiles` 時，可能找不到對應的 provider。

建議新增：

```json
"auth": {
  "profiles": {
    "azure:default": {
      "provider": "azure",
      "mode": "api_key"
    },
    "azure-gpt41:default": {
      "provider": "azure-gpt41",
      "mode": "api_key"
    }
  }
}
```

**2. `apiKey` 與 `headers["api-key"]` 重複存放密鑰**

兩個 provider 都同時在 `apiKey` 和 `headers["api-key"]` 中硬寫了相同的 key。因為 `authHeader: false` 阻止了 `apiKey` 被轉換成 `Authorization: Bearer`，實際認證完全由 `headers["api-key"]` 負責。`apiKey` 欄位在此情境下是冗餘的。

不是 bug（不會導致錯誤），但增加了密鑰洩漏的表面積（config snapshot / redact 邏輯會處理 `apiKey`，但 `headers` 中的值不一定被 redact）。

建議：保留 `apiKey`（供 redact 識別），但注意 `headers` 中的密鑰在 debug snapshot 中可能以明文出現。

**3. `allowedOrigins` 中混合了不同 port 的 origin**

```136:143:smg/openclaw.json
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789",
        "http://10.11.108.117:18789",
        "http://10.11.108.117:28789",
        "http://10.11.233.155:28789",
        "https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev"
      ]
```

這裡有幾點需要確認：

- **Port 28789 vs 18789**：gateway 設定 `port: 18789`，但 `allowedOrigins` 包含了 port `28789` 的 origin（`10.11.108.117:28789` 和 `10.11.233.155:28789`）。`allowedOrigins` 是比對瀏覽器的 `Origin` header，不是 gateway port。如果你是從一個跑在 `28789` 的反向 proxy / port-forward 存取 Control UI，這是正確的。但如果 `28789` 是歷史遺留，建議移除以縮小攻擊面。
- **GitHub Codespaces origin**（`https://ominous-adventure-...github.dev`）：Codespaces URL 含有 repository-specific slug，如果這個 Codespace 已刪除或不再使用，建議移除。
- **`10.11.233.155`**：此 IP 未出現在 gateway bind 或其他設定中。確認是否仍為有效的存取來源。

---

### Suggestions（建議改善）

**4. `allowInsecureAuth: true` 的安全隱患**

```134:135:smg/openclaw.json
    "controlUi": {
      "allowInsecureAuth": true,
```

此選項允許在非 TLS 連線上傳送 auth token。在 LAN 環境（`bind: "lan"`）中，任何能嗅探網路流量的人都可以攔截 auth token。如果是開發/測試環境可接受，但生產環境應設為 `false` 並透過 HTTPS 或 Tailscale 存取。

**5. gpt-5.2 的 `contextWindow: 400000` 數值確認**

GPT-5.2 的實際 context window 取決於 Azure 部署的具體設定。`400000` (400K tokens) 是合理估計，但建議與 Azure portal 中的 deployment 限制比對確認。

**6. `gateway.bind: "lan"` 下缺少 gateway host 自身 LAN IP**

Gateway 綁定在 `lan`（0.0.0.0），但 `allowedOrigins` 中沒有 gateway host 自身的 LAN IP。如果 gateway host 的 IP 不是 `10.11.108.117` 或 `10.11.233.155`，從 gateway host 以 LAN IP 存取 Control UI 會被 origin check 擋住（loopback `127.0.0.1` / `localhost` 已在列表中，從 gateway host 本機存取不受影響）。

---

### 整體評估

設定結構正確，`models.providers` 的 Azure 雙 provider 架構和認證方式符合程式碼的預期。主要的 action item 是補上 `azure-gpt41` 的 auth profile，以及清理 `allowedOrigins` 中可能過期的 origin。

是否需要我直接修正 `auth.profiles` 或清理 `allowedOrigins`？

---

**User**

在 10.11.233.155 的電腦瀏覽器用 http://10.11.108.117:28789 的方式連線。allowedOrigins 應該怎麼寫?

---

**Cursor**

`allowedOrigins` 比對的是**瀏覽器送出的 `Origin` header**，而 `Origin` header 的值就是瀏覽器網址列中的 scheme + host + port。

所以你的情境：

> 在 `10.11.233.155` 的電腦，瀏覽器開啟 `http://10.11.108.117:28789`

瀏覽器送出的 `Origin` 會是：

```
http://10.11.108.117:28789
```

`allowedOrigins` 就寫：

```json
"allowedOrigins": [
  "http://10.11.108.117:28789"
]
```

跟「從哪台電腦連」無關，只跟「瀏覽器網址列上的 URL」有關。你目前的設定已經包含這個值，所以不需要修改。

