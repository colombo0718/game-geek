# GG 控制協定 v1.0 — 讓遊戲被 GameGeek 控制

給「負責把某個遊戲接進 GG」的開發者看。目標：讀完這份文件、加一段 `window.addEventListener("message", ...)`，遊戲就能被 GG 的 D-pad／未來的 agent 控制。

---

## 一、協定本身（已實作、已驗證，不是提案）

GG 透過 `iframe.contentWindow.postMessage(...)` 把每次按鍵事件送進遊戲：

```js
{ type: "gg_event", player: 1, btnID: 6, state: "down" }
```

| 欄位 | 說明 |
|------|------|
| `type` | 固定字串 `"gg_event"`，用來跟其他 postMessage 訊息區分 |
| `player` | 玩家編號（目前恆為 `1`，多人房間規劃中，先預留欄位） |
| `btnID` | 見下方固定表 v1.0 |
| `state` | `"down"`（按下）／`"up"`（放開），跟鍵盤 `keydown`/`keyup` 同構 |

**`btnID` 固定表 v1.0**（不會改，新遊戲直接照這張表寫對照邏輯）：

| btnID | 意義 |
|-------|------|
| `0` | none（全部放開，接收端應觸發「所有鍵放開」） |
| `1`～`4` | 功能鍵（對應畫面右側 1/2/3/4 圓鍵） |
| `5` | 上（D-pad ↑） |
| `6` | 左（D-pad ←） |
| `7` | 下（D-pad ↓） |
| `8` | 右（D-pad →） |

---

## 二、接收端最小實作（照抄即可，已在 `santa-gifts` 驗證跑通）

```js
const ggPressed = new Set();

function ggAllUp() {
  ggPressed.forEach(id => setKeysByBtn(id, false));
  ggPressed.clear();
}

window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || d.type !== "gg_event") return;

  // 建議：驗證來源，別跟 GG 自己一樣圖方便用 "*"（見第四節）
  // if (!["https://game-geek.pages.dev"].includes(ev.origin)) return;

  const { btnID, state } = d;
  if (btnID === 0) { ggAllUp(); return; }

  if (state === "down") {
    if (ggPressed.has(btnID)) return;   // 已按住的鍵不重複觸發
    ggPressed.add(btnID);
    setKeysByBtn(btnID, true);
  } else if (state === "up") {
    if (!ggPressed.has(btnID)) return;
    ggPressed.delete(btnID);
    setKeysByBtn(btnID, false);
  }
});

// 防卡鍵：切分頁/切視窗時全部放開
window.addEventListener("blur", ggAllUp);
document.addEventListener("visibilitychange", () => { if (document.hidden) ggAllUp(); });
```

`setKeysByBtn(btnID, pressed)` 是你自己寫的轉換函式——把 GG 的 btnID 接到遊戲原本已有的輸入變數上，不用重寫遊戲邏輯本身。

---

## 三、範例：貓咪排球（`cat_volley_en.html`）怎麼接

**現況**：橘貓（畫面右側）是玩家控制，黑貓/賓士貓是 AI。現有輸入是這樣接的：

```js
const inputLeft     = () => mobileLeft     || !!(keys['ArrowLeft']  || keys['a'] || keys['A']);
const inputRight    = () => mobileRight    || !!(keys['ArrowRight'] || keys['d'] || keys['D']);
const inputJumpHeld = () => mobileJumpHeld || !!(keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W']);
// 跳躍另外有 mobileJumpJust（邊緣觸發，跟 mobileJumpHeld 分開判斷，見 ~line 600）
```

`gg_event` 的 `btnID` 對照到這三個輸入最直覺的方式，是**直接改寫 `mobileLeft/mobileRight/mobileJumpHeld/mobileJumpJust`**（不用碰 `keys{}`）：

```js
window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || d.type !== "gg_event") return;
  const { btnID, state } = d;
  const pressed = state === "down";

  if (btnID === 0) { mobileLeft = mobileRight = mobileJumpHeld = false; return; }
  if (btnID === 6) mobileLeft = pressed;                 // ← 左
  if (btnID === 8) mobileRight = pressed;                // → 右
  if (btnID === 5) {                                     // ↑ 跳
    if (pressed && !mobileJumpHeld) mobileJumpJust = true;  // 邊緣觸發：剛按下那一刻才算一次跳
    mobileJumpHeld = pressed;
  }
});
window.addEventListener("blur", () => { mobileLeft = mobileRight = mobileJumpHeld = false; });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { mobileLeft = mobileRight = mobileJumpHeld = false; }
});
```

`btnID 7`（下）貓排球用不到，不用處理。

**重要：現有的 canvas 觸控按鈕（`BTN.left/right/jump`）建議在 GG 裡隱藏或不繪製**——GG 的 D-pad 跟這組 canvas 按鈕現在同時存在、同時能動，兩套輸入疊在一起，人類玩家在同一個畫面上會看到兩組控制、容易搞混（GG 端稽核截圖已經證實這個衝突）。判斷「現在是不是在 GG 裡」最簡單的方式：

```js
const inGG = window.self !== window.top;  // 被嵌在 iframe 裡就是 true
if (inGG) { /* 跳過繪製 BTN.left/right/jump 那三顆 canvas 按鈕 */ }
```

（若貓排球本身也會被嵌在其他 iframe 裡、不只 GG，更保險的做法是收到第一個 `gg_event` 才動態隱藏，而不是一開始就用 `inGG` 判斷。）

---

## 四、安全性建議（GG 目前還沒做到，接收端請自己補）

GG 目前送出 `postMessage` 用的是 `targetOrigin: "*"`（沒有限制對象），這是已知待補項。**接收端可以自己防**：在監聽器裡檢查 `ev.origin`，只接受來自 GG 已知網域的訊息：

```js
const GG_ORIGINS = ["https://game-geek.pages.dev", "https://game-geek-kappa.vercel.app"];
if (!GG_ORIGINS.includes(ev.origin)) return;
```

---

## 五、驗收checklist

- [ ] 加上第二節的監聽器（或第三節貓排球專用版本）
- [ ] 在 GG（`https://game-geek.pages.dev`）裡用啟動器貼上遊戲網址載入，確認 D-pad 能動
- [ ] 確認鍵盤操作（沒被 GG 蓋掉）跟 GG 的 D-pad 操作**都還能用**，不互相打架
- [ ] 隱藏/移除遊戲自己畫的 canvas 觸控按鈕（若原本有）
- [ ] 切分頁再切回來，確認角色沒有卡在「一直按著」的狀態（測 blur/visibilitychange）
- [ ] （建議）加上第四節的 origin 白名單檢查

---

## 六、目前狀態誠實說明

- 這份協定只有「操作進去」這一半（GG→遊戲），**遊戲→GG 的 state/reward 回報還沒設計**（規劃中，Phase 2 才會補，屆時會更新這份文件）
- 目前唯一驗證過完整跑通的遊戲是 `santa-gifts`；貓排球是第二個要接的，接完請回報有沒有踩到這份文件沒提到的坑
