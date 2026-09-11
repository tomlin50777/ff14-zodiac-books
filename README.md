# FF14 古武天書攻略

純靜態版的 FF14 黃道十二文書進度工具，內含巴哈攻略原始地圖圖片。

## 使用方式

直接開啟 `dist/index.html` 即可使用。請保留 `dist/assets` 資料夾；勾選進度會保存在瀏覽器的 localStorage。

## 放到 GitHub Pages

1. 建立 GitHub Repository。
2. 把 `dist/index.html` 上傳到 Repository 根目錄並改放為根目錄的 `index.html`，或保留 `dist` 後用 GitHub Actions 發佈。
3. 在 Repository 的 Settings → Pages，將 Source 設為 `Deploy from a branch`。
4. 選擇 `main` 與 `/ (root)` 後儲存。

最簡單的做法是將 `dist` 裡的 `index.html` 與 `assets` 一起放到 Repository 根目錄。

## 資料說明

- 任務清單與座標：FFXIV Community Wiki 各黃道文書頁面。
- 流程設計與地圖圖片：巴哈姆特 FF14 古武攻略（作者 athena2000）。
- 副本、小怪、FATE 與理符以參考巴哈攻略中的中文名稱為主，並保留英文原名、地區與 X/Y 座標供核對。
- 支援依副本、FATE、討伐、理符、單張地圖或整本書批次完成／取消完成。
- 每本書的討伐＋理符地圖依巴哈攻略原文順序排列；選書首頁會分項顯示尚缺數量，整本完成時會以綠色完成卡標示。

本專案為非官方玩家工具，FINAL FANTASY XIV 相關名稱與商標屬 SQUARE ENIX CO., LTD. 所有。
