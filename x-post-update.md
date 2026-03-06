🔧 Adatool アップデートまとめ

---

📝 投稿案（日本語）:

🔧 Adatool 最新アップデート

⚡ パフォーマンス大幅改善
・JSXプリコンパイル導入 — Babel(3.2MB)のランタイム読み込みを完全除去
・3フェーズ段階ロード — 初回表示に必要なデータのみ先行読込(3.8MB)、残り11MB+はバックグラウンドで遅延読込
・フォント/Chart.js非同期化 — レンダリングブロック解消
・インスタントローディング画面追加

🤖 AI分析を大幅拡張
・対象DRepをTOP100 → TOP700に拡張（全投票権の99%以上をカバー）
・AI Analysisタブをリデザイン — カード型サブタブでわかりやすく

🗳️ SPO投票表示を修正
・ParameterChange提案でSPO投票が「-」表示になるバグを修正
・個別SPO投票データ(spo-votes.json)を優先使用し、Koiosキャッシュの古いデータに依存しない設計に

🖥️ UI改善
・DRep Vote / SPO Vote の拡張→折りたたみ時にフルスクリーンが解除されない問題を修正

https://adatool.net

#Cardano #CardanoGovernance #DRep #Adatool

---

📝 投稿案（English）:

🔧 Adatool Updates

⚡ Major Performance Improvements
- JSX pre-compilation: eliminated babel-standalone (3.2MB) from runtime entirely
- 3-phase progressive loading: only critical data (3.8MB) blocks initial render; 11MB+ loads in background
- Async font & Chart.js: no more render-blocking resources
- Instant loading screen

🤖 AI Analysis Expanded
- DRep coverage: TOP 100 → TOP 700 (covers 99%+ of voting power)
- Redesigned AI Analysis tab with card-style navigation

🗳️ SPO Vote Display Fixed
- Fixed SPO votes showing as "-" for ParameterChange proposals
- Uses individual SPO vote data over stale Koios cache

🖥️ UI Fix
- Fixed expand/collapse behavior for DRep & SPO vote panels

https://adatool.net

#Cardano #CardanoGovernance #DRep #Adatool
