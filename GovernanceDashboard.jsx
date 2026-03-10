"use client";
// @ts-nocheck
/* eslint-disable */
/**
 * Governance Dashboard - Next.js component
 * Data source: DBSync API (/api/bf/*)
 */
import React from "react";

// Inject scoped styles
function GovStyles() {
  return React.createElement("style", { dangerouslySetInnerHTML: { __html: `.gov-root{--bg:#0a0d13;--bg2:#111621;--bg3:#181e2c;--bg4:#1f2738;--border:#262f42;--border2:#333e55;--text:#e8ecf4;--text2:#8692ab;--accent:#3b82f6;--accent2:#60a5fa;--yes:#34d399;--no:#f87171;--abstain:#fbbf24;--nv:#4b5563}
.gov-root[data-theme="light"]{--bg:#f5f7fa;--bg2:#e8ecf2;--bg3:#dde3ec;--bg4:#d0d8e4;--border:#c0c8d4;--border2:#a8b4c4;--text:#1a1e28;--text2:#4a5568;--accent:#2563eb;--accent2:#3b82f6;--yes:#059669;--no:#dc2626;--abstain:#d97706;--nv:#9ca3af}
.gov-root{margin:0;padding:0;box-sizing:border-box;background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.5}
.gov-root *{box-sizing:border-box}
.gov-root ::-webkit-scrollbar{width:5px;height:5px}
.gov-root ::-webkit-scrollbar-track{background:var(--bg2)}
.gov-root ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
.gov-root a{color:var(--accent2);text-decoration:none;transition:opacity .15s}.gov-root a:hover{opacity:.75}
.gov-root input,.gov-root select{font-family:inherit}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
.gov-root .loader{display:flex;gap:8px;align-items:center;justify-content:center;padding:40px}
.gov-root .loader span{width:10px;height:10px;border-radius:50%;background:var(--accent);animation:bounce 1.4s ease-in-out infinite}
.gov-root .loader span:nth-child(2){animation-delay:.16s}.gov-root .loader span:nth-child(3){animation-delay:.32s}
@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.gov-root .fade-in{animation:fadeIn .3s ease-out}
.gov-root .tooltip-container{display:inline-block}
.gov-root .tooltip-popup{display:none;position:fixed;z-index:100;
  background:#1e2538;border:1px solid var(--border2);border-radius:8px;padding:10px 12px;
  min-width:240px;max-width:380px;font-size:11px;color:var(--text);line-height:1.5;
  box-shadow:0 8px 32px rgba(0,0,0,.5);pointer-events:none;white-space:normal;word-break:break-word}
.gov-root .tooltip-container:hover .tooltip-popup{display:block}
.gov-root .btn{padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);
  cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .15s}
.gov-root .btn:hover{background:var(--bg4);border-color:var(--border2)}
.gov-root .btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}
.gov-root .btn-primary:hover{background:var(--accent2)}
.gov-root .vote-cell{overflow:hidden;position:relative;z-index:1}
.gov-root .tab-bar{display:flex;gap:2px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:3px;margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.gov-root .tab-btn{flex:0 0 auto;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:700;
  font-family:inherit;background:transparent;color:var(--text2);transition:all .15s;white-space:nowrap}
.gov-root .tab-btn.active{background:var(--accent);color:#fff}
.gov-root .tab-btn:hover:not(.active){background:var(--bg3)}
.gov-root .card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px}
.gov-root input[type=range]{-webkit-appearance:none;background:var(--bg);height:6px;border-radius:3px;outline:none;width:100%}
.gov-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid var(--bg)}
@media(max-width:768px){
  .gov-root{font-size:13px}
  .gov-root .tab-bar{flex-wrap:wrap;gap:1px}
  .gov-root .tab-btn{padding:6px 8px;font-size:11px}
  .gov-root .card{padding:10px}
  .gov-root .tooltip-popup{max-width:280px;min-width:180px}
}
@media(max-width:480px){
  .gov-root{font-size:12px}
  .gov-root .tab-btn{padding:5px 6px;font-size:10px}
  .gov-root .card{padding:8px;border-radius:8px}
  .gov-root .btn{padding:5px 10px;font-size:11px}
}` } });
}

// ─── Main governance code (from index.html) ───
// ════════════════════════════════════════════════════════════════
// i18n
// ════════════════════════════════════════════════════════════════
const LANG = {
  en: {
    title: "Gov Dashboard",
    subtitle_drep: "DReps",
    subtitle_actions: "Actions",
    subtitle_votes: "Votes",
    loading: "Loading…",
    loading_dreps: "Fetching DReps…",
    loading_votes: "Fetching vote data…",
    loading_proposals: "Fetching proposal details…",
    error_title: "Data Fetch Error",
    retry: "Retry",
    demo_btn: "Use Demo Data",
    switch_live: "Switch to Live",
    refresh: "Refresh",
    filter_search: "Search DRep",
    filter_search_ph: "Name or ID…",
    filter_min_stake: "Min Stake (ADA)",
    filter_max_stake: "Max Stake (ADA)",
    filter_action_type: "Action Type",
    filter_all: "All",
    filter_epoch_from: "Epoch From",
    filter_epoch_to: "Epoch To",
    filter_sort: "Sort",
    sort_stake_desc: "Stake ↓",
    sort_stake_asc: "Stake ↑",
    sort_name: "Name A→Z",
    reset: "Reset",
    showing: "Showing",
    csv_export: "Export CSV",
    no_dreps: "No DReps match your filters",
    drep_col: "DRep",
    type_param: "Param Change",
    type_hardfork: "Hard Fork",
    type_treasury: "Treasury",
    type_noconf: "No Confidence",
    type_cc: "Update CC",
    type_const: "New Constitution",
    type_info: "Info Action",
    attached: "attached",
    not_attached: "none",
    data_warnings: "Data Warnings",
    hide: "Hide",
    delegators: "delegators",
    load_more: "Load More",
    csv_visible: "Visible Only",
    csv_all: "All Loaded Data",
    tab_dashboard: "Votes",
    tab_simulator: "Reward Simulator",
    filter_collapse: "Filters",
    cc_section_title: "CC Votes",
    drep_section_title: "DRep Votes",
    zoom_label: "Size",
    cc_member: "CC Member",
    no_cc: "No CC votes found",
    cc_rationale: "Rationale",
    cc_expired_only: "Showing expired governance actions only (static data)",
    cc_ineligible: "N/A",
    cc_not_voted: "Not Voted",
    cc_sim_title: "CC Reward Simulator",
    cc_sim_desc: "Missed votes reduce rewards",
    cc_sim_base: "Base reward per epoch (ADA)",
    cc_sim_eligible: "Eligible GAs",
    cc_sim_voted: "Voted",
    cc_sim_missed: "Missed",
    cc_sim_penalty: "Penalty",
    cc_sim_reward: "Est. Reward",
    cc_sim_factor: "Reward Factor",
    cc_sim_note: "Eligible = all GAs in selected period. All CC members share the same denominator.",
    cc_sim_penalty_label: "Penalty threshold",
    cc_sim_penalty_unit: "missed = 0%",
    cc_sim_date_from: "Period From",
    cc_sim_date_to: "Period To",
    cc_sim_ga_in_range: "GAs in range",
    cc_rationale_loading: "Loading rationale...",
    cc_rationale_error: "Could not load rationale",
    cc_rationale_export: "Export Rationales CSV",
    cc_rationale_exporting: "Exporting...",
    sim_title: "DRep Reward Simulator",
    sim_subtitle: "Middle-Out mechanism comparison (process-first)",
    params: "Parameters",
    summary: "Summary",
    rank: "Rank",
    name: "Name",
    stake: "Stake",
    eligible: "Elig.",
    reward: "Reward",
    vote_rate: "Vote Rate",
    eligible_count: "Eligible",
    avg_reward: "Avg",
    gini: "Gini",
    search: "Search DRep…",
    no_data: "No DRep data",
    mech_equal: "Equal",
    mech_prop: "Proportional",
    mech_bonus: "Prop+Bonus",
    desc_equal: "Exclude top K, pay next N equally.",
    desc_prop: "Exclude top K, pay next N proportional to stake.",
    desc_bonus: "Exclude top K, base proportional + fixed bonus per person among next N.",
    mo_k: "K (exclude top)",
    mo_n: "N (pay next)",
    mo_total: "Total budget (ADA)",
    budget_b2: "Bonus / person",
    budget_b2_mode_ada: "ADA",
    budget_b2_mode_pct: "% of budget",
    vote_start: "Start date",
    vote_end: "End date",
    vote_penalty: "Vote-rate adjustment",
    vote_penalty_on: "Apply",
    vote_penalty_off: "Skip",
    rationale_adj: "Rationale adjustment",
    rationale_rate: "Rat%",
    vote_ga_count: "GAs in range",
    vote_info: "GAs whose voting ended in this period",
    metric_d: "D",
    metric_p: "P",
    metric_c: "C",
    api_stats: "API Stats",
    api_calls: "API calls",
    cached: "cached",
    loading_sim_votes: "Loading vote counts for simulator…",
    sim_common_title: "Budget Overview",
    sim_gov_budget: "Annual Governance Budget (ADA)",
    sim_dist_per_year: "Distributions / Year",
    sim_per_dist: "Per Distribution",
    sim_drep_cc_ratio: "DRep : CC Ratio",
    sim_period: "Reward Calculation Period",
    sim_cc_per_member: "Per CC Member",
    sim_drep_section: "DRep Reward Simulator",
    sim_cc_section: "CC Reward Simulator",
    sim_cc_max_budget: "CC Max Budget (before penalty)",
    sim_cc_actual_budget: "CC Actual (after penalty)",
    sim_annual: "Annual",
    sim_per_distribution: "Per Distribution",
    sim_per_member: "Per Member",
    sim_pool: "Pool",
    export_rationales: "Export Rationales CSV",
    share_url: "Share",
    share_copied: "Copied!",
    export_proposal_rationales: "Export DRep rationales for this proposal",
    download: "Download",
    close: "Close",
    source: "Source",
    expand: "Expand",
    constitution_tool: "Constitution",
    ai_title: "AI Analysis (β)",
    ai_no_data: "AI analysis data has not been generated yet.",
    ai_no_data_desc: "Results will appear here once Claude API analysis runs via GitHub Actions.",
    ai_tab_drep: "DRep Voting Tendencies",
    ai_tab_reasons: "GA Vote Reason Analysis",
    ai_tab_types: "GA Type Voting Trends",
    ai_tab_predict: "DRep Vote Prediction (β)",
    ai_no_data_short: "No data",
    ai_dreps_analyzed: "DReps analyzed",
    ai_generated: "Generated",
    ai_rank: "Rank",
    ai_votes: "Votes",
    ai_not_voted: "NV",
    ai_tendency: "Tendency",
    ai_key_positions: "Key Positions",
    ai_voting_pattern: "Voting Pattern",
    ai_with_rationale: "With Rationale",
    ai_without_rationale: "Without Rationale",
    ai_not_voted_long: "Not Voted",
    ai_yes_reasons: "Yes Reasons",
    ai_no_reasons: "No Reasons",
    ai_abstain_reasons: "Abstain Reasons",
    ai_total_stake: "Total Stake",
    ai_typical_yes: "Typical Yes Reasons",
    ai_typical_no: "Typical No Reasons",
    ai_proposals_count: "proposals",
    ai_rationales: "rationales",
    ai_predict_title: "Vote Prediction (Coming Soon)",
    ai_predict_desc: "Input governance action drafts to predict DRep votes based on historical tendencies.",
    ai_predict_impl: "Planned: Cloudflare Workers + Claude Sonnet API",
    footer_author: "Created by",
    footer_contact: "Contact",
    footer_disclaimer: "This tool is provided as-is. The author assumes no responsibility for any damages arising from its use.",
    theme_toggle: "Theme",
    ai_predict_input: "Describe the governance action draft...",
    ai_predict_type: "Action Type",
    ai_predict_btn: "Predict Votes",
    ai_predict_remaining: "remaining today",
    ai_predict_loading: "Analyzing with Claude AI...",
    ai_predict_result_name: "DRep",
    ai_predict_result_vote: "Predicted Vote",
    ai_predict_result_confidence: "Confidence",
    ai_predict_result_reason: "Reason",
    ai_predict_no_worker: "Vote prediction requires a Cloudflare Worker. See setup instructions.",
    ai_predict_save: "Save Result",
    ai_predict_saved_title: "Saved Predictions",
    ai_predict_saved_empty: "No saved predictions yet",
    ai_predict_saved_count: "saved",
    ai_predict_expand: "Expand",
    ai_predict_collapse: "Collapse",
    tab_tx_analysis: "Tx Analysis",
    txa_title: "Transaction Analysis (β)",
    txa_desc: "Cardano network transaction breakdown — local static data",
    txa_total: "Total Transactions",
    txa_simple: "Simple Transfers",
    txa_smart: "Smart Contract Txs",
    txa_by_project: "By Project/Protocol",
    txa_project: "Project",
    txa_tx_count: "Tx Count",
    txa_share: "Share",
    txa_epoch: "Epoch",
    txa_period: "Period",
    txa_daily_avg: "Daily Average",
    txa_trend: "Trend",
    tab_drep_hub: "DRep Hub",
    dreph_title: "DRep Hub (β)",
    dreph_desc: "Your single source for governance — GAs, alerts, discussions & signals in one feed",
    dreph_digest_positive: "Positive",
    dreph_digest_negative: "Negative",
    dreph_digest_mixed: "Mixed",
    dreph_digest_neutral: "Neutral",
    dreph_mock_label: "Sample data for demonstration",
    demo_mode: "Demo Mode",
    clear_cache: "Clear Cache",
    api_key: "Blockfrost API Key",
    api_key_ph: "project_id…",
    api_key_save: "Save & Load",
    api_key_change: "Change API Key",
    api_key_desc: "Get a free key at blockfrost.io",
    api_key_required: "Blockfrost API key required",
    tab_spo: "SPO Vote",
    spo_pool: "Pool",
    spo_ticker: "Ticker",
    spo_pledge_drep: "Reward DRep",
    spo_stake: "Voting Power",
    spo_csv_export: "CSV Export",
    spo_filter_all: "All",
    spo_filter_voted: "Voted",
    spo_filter_not_voted: "Not Voted",
    spo_filter_auto_abstain: "Auto-Abstain",
    spo_filter_auto_nc: "Auto-NC",
    spo_loading: "Loading SPO votes…",
    spo_auto_abstain: "Auto-Abstain",
    spo_no_eligible: "No SPO-eligible governance actions found",
    spo_hardfork_note: "Hard Fork: explicit vote required (no default)",
    spo_voted: "Voted",
    spo_total_pools: "Total Pools",
    spo_vote_count: "Votes",
    tab_history: "Stake Analytics",
    tab_govdata: "Protocol Info",
    gov_treasury: "Treasury",
    gov_reserves: "Reserves",
    gov_supply: "Circulating Supply",
    gov_live_stake: "Live Stake",
    gov_active_stake: "Active Stake",
    gov_protocol_params: "Protocol Parameters",
    gov_governance_thresholds: "Governance Thresholds",
    gov_drep_threshold: "DRep Threshold",
    gov_spo_threshold: "SPO Threshold",
    gov_cc_threshold: "CC Threshold",
    gov_deposits: "Deposits & Costs",
    gov_block_limits: "Block & Tx Limits",
    gov_economic: "Economic Parameters",
    gov_governance_settings: "Governance Settings",
    gov_epoch: "Epoch",
    summary_approval: "Approval",
    summary_yes: "Yes",
    summary_no: "No",
    summary_abstain: "Abstain",
    summary_threshold: "Threshold",
    summary_drep: "DRep",
    summary_cc: "CC",
    summary_spo: "SPO",
    summary_active: "Active",
    summary_expired: "Expired",
    summary_ratified: "Ratified",
    summary_enacted: "Enacted",
    summary_dropped: "Dropped",
    summary_voting: "Voting",
    summary_na: "N/A",
    summary_proposal_status: "Proposal Status",
    hist_title: "DRep Stake History",
    hist_desc: "Tracking DRep voting power over time (snapshots captured each epoch)",
    hist_total_stake: "Total Stake (ADA)",
    hist_drep_count: "DRep Count",
    hist_top_dreps: "Top DReps by Stake",
    hist_epoch: "Epoch",
    hist_date: "Date",
    hist_no_data: "No history data yet. Snapshots are captured each epoch by the data fetcher.",
    hist_chart_total: "Total DRep Stake Over Time",
    hist_chart_drep: "Individual DRep Stake",
    hist_select_drep: "Select DRep to chart…",
    hist_change: "Change",
    hist_snapshots: "snapshots"
  },
  ja: {
    title: "ガバナンスダッシュボード",
    subtitle_drep: "DRep",
    subtitle_actions: "アクション",
    subtitle_votes: "投票",
    loading: "読み込み中…",
    loading_dreps: "DRep一覧を取得中…",
    loading_votes: "投票データを取得中…",
    loading_proposals: "プロポーザル詳細を取得中…",
    error_title: "データ取得エラー",
    retry: "再試行",
    demo_btn: "デモデータで表示",
    switch_live: "ライブデータに切替",
    refresh: "更新",
    filter_search: "DRep検索",
    filter_search_ph: "名前またはID…",
    filter_min_stake: "最小ステーク(ADA)",
    filter_max_stake: "最大ステーク(ADA)",
    filter_action_type: "アクション種別",
    filter_all: "すべて",
    filter_epoch_from: "Epochから",
    filter_epoch_to: "Epochまで",
    filter_sort: "ソート",
    sort_stake_desc: "ステーク ↓",
    sort_stake_asc: "ステーク ↑",
    sort_name: "名前 A→Z",
    reset: "リセット",
    showing: "表示",
    csv_export: "CSV出力",
    no_dreps: "該当するDRepが見つかりません",
    drep_col: "DRep",
    type_param: "パラメータ変更",
    type_hardfork: "ハードフォーク",
    type_treasury: "トレジャリー",
    type_noconf: "不信任",
    type_cc: "CC更新",
    type_const: "新憲法",
    type_info: "情報",
    attached: "添付あり",
    not_attached: "なし",
    data_warnings: "データ警告",
    hide: "非表示",
    delegators: "委任者",
    load_more: "さらに読込",
    csv_visible: "表示中のみ",
    csv_all: "全読込データ",
    tab_dashboard: "投票",
    tab_simulator: "報酬シミュレーター",
    filter_collapse: "フィルター",
    cc_section_title: "CC投票",
    drep_section_title: "DRep投票",
    zoom_label: "サイズ",
    cc_member: "CC委員",
    no_cc: "CC投票データなし",
    cc_rationale: "根拠",
    cc_expired_only: "期限切れの一部のGAのみ表示しています（静的データ）",
    cc_ineligible: "対象外",
    cc_not_voted: "未投票",
    cc_sim_title: "CC報酬シミュレーター",
    cc_sim_desc: "未投票が報酬を減額",
    cc_sim_base: "1エポックあたり基本報酬 (ADA)",
    cc_sim_eligible: "対象GA",
    cc_sim_voted: "投票済",
    cc_sim_missed: "未投票",
    cc_sim_penalty: "ペナルティ",
    cc_sim_reward: "推定報酬",
    cc_sim_factor: "報酬係数",
    cc_sim_note: "対象GA = 選択期間中の全GA。全CC委員で分母は共通です。",
    cc_sim_penalty_label: "ペナルティ閾値",
    cc_sim_penalty_unit: "回未投票で0%",
    cc_sim_date_from: "期間開始",
    cc_sim_date_to: "期間終了",
    cc_sim_ga_in_range: "対象GA数",
    cc_rationale_loading: "根拠を読込中...",
    cc_rationale_error: "根拠を読み込めませんでした",
    cc_rationale_export: "根拠一括CSV出力",
    cc_rationale_exporting: "出力中...",
    sim_title: "DRep報酬シミュレーター",
    sim_subtitle: "ミドルアウト方式比較（プロセスファースト）",
    params: "パラメータ",
    summary: "サマリー",
    rank: "順位",
    name: "名前",
    stake: "委任額",
    eligible: "対象",
    reward: "報酬",
    vote_rate: "投票率",
    eligible_count: "対象数",
    avg_reward: "平均",
    gini: "ジニ",
    search: "DRep検索…",
    no_data: "DRepデータなし",
    mech_equal: "均等",
    mech_prop: "比例",
    mech_bonus: "比例+ボーナス",
    desc_equal: "上位K人除外、次のN人に均等配分。",
    desc_prop: "上位K人除外、次のN人にステーク比例配分。",
    desc_bonus: "上位K人除外、基本比例＋一人あたり固定ボーナスを次のN人に。",
    mo_k: "K（上位除外数）",
    mo_n: "N（支払対象数）",
    mo_total: "総予算（ADA）",
    budget_b2: "1人あたりボーナス",
    budget_b2_mode_ada: "ADA",
    budget_b2_mode_pct: "% 比率",
    vote_start: "開始日",
    vote_end: "終了日",
    vote_penalty: "投票率補正",
    vote_penalty_on: "適用",
    vote_penalty_off: "なし",
    rationale_adj: "根拠添付補正",
    rationale_rate: "根拠%",
    vote_ga_count: "期間内GA数",
    vote_info: "投票期間終了日がこの範囲内のGA",
    metric_d: "D",
    metric_p: "P",
    metric_c: "C",
    api_stats: "API統計",
    api_calls: "APIコール",
    cached: "キャッシュ",
    loading_sim_votes: "シミュレーター用投票数を取得中…",
    sim_common_title: "予算概要",
    sim_gov_budget: "年間ガバナンス予算 (ADA)",
    sim_dist_per_year: "年間配布回数",
    sim_per_dist: "1回あたり配布額",
    sim_drep_cc_ratio: "DRep : CC 分配比率",
    sim_period: "報酬計算期間",
    sim_cc_per_member: "CC 1人あたり",
    sim_drep_section: "DRep報酬シミュレーター",
    sim_cc_section: "CC報酬シミュレーター",
    sim_cc_max_budget: "CC予算（最大・ペナルティ前）",
    sim_cc_actual_budget: "CC予算（実際・ペナルティ後）",
    sim_annual: "年間",
    sim_per_distribution: "1回あたり",
    sim_per_member: "1人あたり",
    sim_pool: "配分",
    export_rationales: "投票根拠CSV出力",
    share_url: "共有",
    share_copied: "コピーしました！",
    export_proposal_rationales: "この提案のDRep投票根拠を出力",
    download: "ダウンロード",
    close: "閉じる",
    source: "ソース",
    expand: "展開",
    constitution_tool: "憲法ツール",
    ai_title: "AI分析 (β)",
    ai_no_data: "AI分析データはまだ生成されていません。",
    ai_no_data_desc: "GitHub ActionsでClaude APIによる分析が実行されると、ここに結果が表示されます。",
    ai_tab_drep: "DRep別の投票傾向分析",
    ai_tab_reasons: "GA別の賛否理由分析",
    ai_tab_types: "GAタイプ別投票傾向",
    ai_tab_predict: "DRep投票予測(β)",
    ai_no_data_short: "データなし",
    ai_dreps_analyzed: "DRep分析済",
    ai_generated: "生成日",
    ai_rank: "順位",
    ai_votes: "投票",
    ai_not_voted: "未投票",
    ai_tendency: "傾向",
    ai_key_positions: "主要なポジション",
    ai_voting_pattern: "投票パターン",
    ai_with_rationale: "根拠あり",
    ai_without_rationale: "根拠なし",
    ai_not_voted_long: "未投票",
    ai_yes_reasons: "賛成理由",
    ai_no_reasons: "反対理由",
    ai_abstain_reasons: "棄権理由",
    ai_total_stake: "合計ステーク",
    ai_typical_yes: "典型的な賛成理由",
    ai_typical_no: "典型的な反対理由",
    ai_proposals_count: "件",
    ai_rationales: "根拠",
    ai_predict_title: "投票予測 (Coming Soon)",
    ai_predict_desc: "ガバナンスアクションのドラフトを入力すると、DRepの過去の投票傾向から賛成・反対を予測します。",
    ai_predict_impl: "Cloudflare Workers + Claude Sonnet APIで実装予定",
    footer_author: "作成者",
    footer_contact: "お問い合わせ",
    footer_disclaimer: "本ツールの利用による一切の損害について、作者は責任を負いません。",
    theme_toggle: "テーマ",
    ai_predict_input: "ガバナンスアクションのドラフトを入力...",
    ai_predict_type: "アクションタイプ",
    ai_predict_btn: "投票を予測",
    ai_predict_remaining: "本日残り",
    ai_predict_loading: "Claude AIで分析中...",
    ai_predict_result_name: "DRep",
    ai_predict_result_vote: "予測投票",
    ai_predict_result_confidence: "確度",
    ai_predict_result_reason: "理由",
    ai_predict_no_worker: "投票予測にはCloudflare Workerが必要です。セットアップ手順をご確認ください。",
    ai_predict_save: "結果を保存",
    ai_predict_saved_title: "保存済み予測",
    ai_predict_saved_empty: "保存済みの予測結果はありません",
    ai_predict_saved_count: "件",
    ai_predict_expand: "展開",
    ai_predict_collapse: "閉じる",
    tab_tx_analysis: "Tx分析",
    txa_title: "トランザクション分析 (β)",
    txa_desc: "Cardanoネットワークのトランザクション内訳 — ローカル静的データ",
    txa_total: "総トランザクション数",
    txa_simple: "単純送金",
    txa_smart: "スマートコントラクトTx",
    txa_by_project: "プロジェクト/プロトコル別",
    txa_project: "プロジェクト",
    txa_tx_count: "Tx数",
    txa_share: "シェア",
    txa_epoch: "エポック",
    txa_period: "期間",
    txa_daily_avg: "日次平均",
    txa_trend: "トレンド",
    tab_drep_hub: "DRepハブ",
    dreph_title: "DRepハブ (β)",
    dreph_desc: "ガバナンスの全体像をここ1つで — GA・アラート・議論・シグナルを統合表示",
    dreph_digest_positive: "ポジティブ",
    dreph_digest_negative: "ネガティブ",
    dreph_digest_mixed: "混合",
    dreph_digest_neutral: "中立",
    dreph_mock_label: "デモ用サンプルデータ",
    demo_mode: "デモモード",
    clear_cache: "キャッシュクリア",
    api_key: "Blockfrost APIキー",
    api_key_ph: "project_id…",
    api_key_save: "保存して読込",
    api_key_change: "APIキー変更",
    api_key_desc: "blockfrost.ioで無料キーを取得",
    api_key_required: "Blockfrost APIキーが必要です",
    tab_spo: "SPO投票",
    spo_pool: "プール",
    spo_ticker: "ティッカー",
    spo_pledge_drep: "報酬アドレスDRep",
    spo_stake: "投票力",
    spo_csv_export: "CSV出力",
    spo_filter_all: "すべて",
    spo_filter_voted: "投票済",
    spo_filter_not_voted: "未投票",
    spo_filter_auto_abstain: "自動棄権",
    spo_filter_auto_nc: "自動不信任",
    spo_loading: "SPO投票を読み込み中…",
    spo_auto_abstain: "自動棄権",
    spo_no_eligible: "SPO投票対象のガバナンスアクションがありません",
    spo_hardfork_note: "ハードフォーク: 明示投票必須（デフォルトなし）",
    spo_voted: "投票済",
    spo_total_pools: "プール数",
    spo_vote_count: "投票数",
    tab_history: "ステーク分析・予測",
    tab_govdata: "プロトコル情報",
    gov_treasury: "トレジャリー",
    gov_reserves: "リザーブ",
    gov_supply: "流通量",
    gov_live_stake: "ライブステーク",
    gov_active_stake: "アクティブステーク",
    gov_protocol_params: "プロトコルパラメータ",
    gov_governance_thresholds: "ガバナンス閾値",
    gov_drep_threshold: "DRep閾値",
    gov_spo_threshold: "SPO閾値",
    gov_cc_threshold: "CC閾値",
    gov_deposits: "デポジット・コスト",
    gov_block_limits: "ブロック・Tx制限",
    gov_economic: "経済パラメータ",
    gov_governance_settings: "ガバナンス設定",
    gov_epoch: "エポック",
    summary_approval: "承認率",
    summary_yes: "賛成",
    summary_no: "反対",
    summary_abstain: "棄権",
    summary_threshold: "閾値",
    summary_drep: "DRep",
    summary_cc: "CC",
    summary_spo: "SPO",
    summary_active: "アクティブ",
    summary_expired: "期限切れ",
    summary_ratified: "批准済",
    summary_enacted: "制定済",
    summary_dropped: "却下",
    summary_voting: "投票中",
    summary_na: "対象外",
    summary_proposal_status: "提案ステータス",
    hist_title: "DRepステーク推移",
    hist_desc: "DRep投票力の時系列推移（エポックごとにスナップショット記録）",
    hist_total_stake: "総ステーク (ADA)",
    hist_drep_count: "DRep数",
    hist_top_dreps: "ステーク上位DRep",
    hist_epoch: "エポック",
    hist_date: "日付",
    hist_no_data: "履歴データがまだありません。データ取得時にエポックごとにスナップショットが記録されます。",
    hist_chart_total: "DRep総ステーク推移",
    hist_chart_drep: "個別DRepステーク推移",
    hist_select_drep: "チャート表示するDRepを選択…",
    hist_change: "変更",
    hist_snapshots: "スナップショット"
  }
};

// ════════════════════════════════════════════════════════════════
// DBSync API Layer (replaces Blockfrost) with Caching
// ════════════════════════════════════════════════════════════════
const DBSYNC_API = "/api/bf";  // Server-side DBSync API with Blockfrost-compatible endpoints
const BF_PAGE_SIZE = 100;

// Keep getBfKey/setBfKey as no-ops for backward compat with UI code
function getBfKey() { return "dbsync"; }  // Always "has key" — no external API key needed
function setBfKey(k) { /* no-op */ }

// --- In-memory cache ---
const _cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min
let _apiCalls = 0,
  _cacheHits = 0;

// --- Persistent cache (localStorage) for simulator vote data ---
const SIM_CACHE_KEY = "cardano_drep_sim_cache_v4";
const SIM_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function saveSimCache(data) {
  try {
    const payload = {
      ts: Date.now(),
      ...data
    };
    localStorage.setItem(SIM_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("SimCache save failed:", e);
  }
}
function loadSimCache() {
  try {
    const raw = localStorage.getItem(SIM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > SIM_CACHE_TTL) {
      localStorage.removeItem(SIM_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    localStorage.removeItem(SIM_CACHE_KEY);
    return null;
  }
}
function timedFetch(url, opts = {}, ms = 30000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, {
    ...opts,
    signal: c.signal
  }).finally(() => clearTimeout(t));
}

// --- DBSync API adapter: translates Blockfrost-style paths to local /api/bf/ endpoints ---
async function bfFetchJSON(bfPath) {
  // Route Blockfrost paths to local DBSync-compatible API
  let url;

  // /governance/dreps?page=X&count=Y → /api/bf/dreps?page=X&count=Y
  const drepsListMatch = bfPath.match(/^\/governance\/dreps\?(.+)$/);
  if (drepsListMatch) {
    url = `${DBSYNC_API}/dreps?${drepsListMatch[1]}`;
  }
  // /governance/dreps/{id}/metadata → /api/bf/drep/{id}/metadata
  else if (bfPath.match(/^\/governance\/dreps\/([^/]+)\/metadata$/)) {
    const id = bfPath.match(/^\/governance\/dreps\/([^/]+)\/metadata$/)[1];
    url = `${DBSYNC_API}/drep/${encodeURIComponent(id)}/metadata`;
  }
  // /governance/dreps/{id}/votes?page=X → /api/bf/drep/{id}/votes?page=X
  else if (bfPath.match(/^\/governance\/dreps\/([^/]+)\/votes/)) {
    const m = bfPath.match(/^\/governance\/dreps\/([^/]+)\/votes(.*)$/);
    url = `${DBSYNC_API}/drep/${encodeURIComponent(m[1])}/votes${m[2] || ''}`;
  }
  // /governance/dreps/{id} → /api/bf/drep/{id}
  else if (bfPath.match(/^\/governance\/dreps\/([^/?]+)$/)) {
    const id = bfPath.match(/^\/governance\/dreps\/([^/?]+)$/)[1];
    url = `${DBSYNC_API}/drep/${encodeURIComponent(id)}`;
  }
  // /governance/proposals/{hash}/{idx}/metadata → /api/bf/proposal/{hash}/{idx}/metadata
  else if (bfPath.match(/^\/governance\/proposals\/([^/]+)\/(\d+)\/metadata$/)) {
    const m = bfPath.match(/^\/governance\/proposals\/([^/]+)\/(\d+)\/metadata$/);
    url = `${DBSYNC_API}/proposal/${m[1]}/${m[2]}/metadata`;
  }
  // /governance/proposals/{hash}/{idx} → /api/bf/proposal/{hash}/{idx}
  else if (bfPath.match(/^\/governance\/proposals\/([^/]+)\/(\d+)$/)) {
    const m = bfPath.match(/^\/governance\/proposals\/([^/]+)\/(\d+)$/);
    url = `${DBSYNC_API}/proposal/${m[1]}/${m[2]}`;
  }
  // Fallback: prepend API base
  else {
    url = `${DBSYNC_API}${bfPath}`;
  }

  // Check cache
  const cachedEntry = _cache.get(url);
  if (cachedEntry && Date.now() - cachedEntry.ts < CACHE_TTL) {
    _cacheHits++;
    return cachedEntry.data;
  }

  _apiCalls++;
  try {
    const r = await timedFetch(url, { headers: { "Accept": "application/json" } });
    if (r.status === 404) {
      _cache.set(url, { data: null, ts: Date.now() });
      return null;
    }
    if (!r.ok) throw new Error(`DBSync API HTTP ${r.status} for ${url}`);
    const data = await r.json();
    _cache.set(url, { data, ts: Date.now() });
    return data;
  } catch (e) {
    console.warn("DBSync fetch error:", url, e.message);
    throw e;
  }
}

// Fetch all pages of a paginated endpoint
async function bfFetchAllPages(path, maxPages = 20) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await bfFetchJSON(`${path}${sep}page=${page}&count=${BF_PAGE_SIZE}`);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < BF_PAGE_SIZE) break;
  }
  return results;
}
function getApiStats() {
  return {
    calls: _apiCalls,
    cached: _cacheHits
  };
}
function resetApiStats() {
  _apiCalls = 0;
  _cacheHits = 0;
}

// ════════════════════════════════════════════════════════════════
// Shared Helpers
// ════════════════════════════════════════════════════════════════
function fmtAda(lovelace) {
  if (!lovelace) return "0";
  const a = Number(lovelace) / 1e6;
  if (a >= 1e9) return (a / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (a / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (a / 1e3).toFixed(1) + "K";
  return a.toFixed(0);
}
function fmtAdaNum(ada) {
  if (ada >= 1e9) return (ada / 1e9).toFixed(2) + "B";
  if (ada >= 1e6) return (ada / 1e6).toFixed(2) + "M";
  if (ada >= 1e3) return (ada / 1e3).toFixed(1) + "K";
  return ada.toFixed(ada < 1 ? 4 : 1);
}
// Short ADA format (lovelace → 1-decimal) — used by tables and compact displays
function fmtStakeShort(v) {
  const n = Number(v) / 1e6;
  return n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "K" : Math.round(n).toLocaleString();
}
// Truncate string with ellipsis
function truncStr(s, max) {
  return s && s.length > max ? s.slice(0, max) + "…" : s || "";
}

// ─── Threshold lookups (shared across DashboardTab, VoteReminderSection) ───
function getDrepThreshold(pp, ptype) {
  if (!pp) return 0.67;
  if (ptype === "InfoAction") return 0.51;
  if (ptype === "ParameterChange") return Math.max(Number(pp.dvt_p_p_network_group) || 0, Number(pp.dvt_p_p_economic_group) || 0, Number(pp.dvt_p_p_technical_group) || 0, Number(pp.dvt_p_p_gov_group) || 0) || 0.67;
  const m = {
    NoConfidence: "dvt_motion_no_confidence",
    UpdateCommittee: "dvt_committee_normal",
    NewConstitution: "dvt_update_to_constitution",
    HardForkInitiation: "dvt_hard_fork_initiation",
    TreasuryWithdrawals: "dvt_treasury_withdrawal"
  };
  return Number(pp[m[ptype]]) || 0.67;
}
function getSpoThreshold(pp, ptype) {
  const SPO_INELIG = ["TreasuryWithdrawals", "NewConstitution", "InfoAction"];
  if (SPO_INELIG.includes(ptype)) return null;
  if (!pp) return 0.51;
  if (ptype === "NoConfidence") return Number(pp.pvt_motion_no_confidence) || 0.51;
  if (ptype === "HardForkInitiation") return Number(pp.pvt_hard_fork_initiation) || 0.51;
  if (ptype === "UpdateCommittee") return Number(pp.pvt_committee_normal) || 0.51;
  if (ptype === "ParameterChange") return Number(pp.pvt_p_p_security_group) || 0.51;
  return 0.51;
}
function getCCThreshold(pp) {
  return pp ? Number(pp.dvt_committee_normal) || 0.67 : 0.67;
}
// Current epoch from timestamp
function currentEpochNow() {
  return Math.floor((Date.now() - EPOCH_208_TS) / EPOCH_DURATION) + 208;
}

// IPFS URL resolver — convert ipfs:// to gateway URL
function resolveIpfsUrl(url) {
  if (!url) return null;
  if (url.startsWith("ipfs://")) return "https://ipfs.io/ipfs/" + url.slice(7);
  if (url.startsWith("ipfs:")) return "https://ipfs.io/ipfs/" + url.slice(5);
  return url;
}
// ─── URL Hash State Sharing ──────────────────────────────────
// Parse URL hash fragment into key-value params
function parseHash() {
  const h = window.location.hash.slice(1);
  if (!h) return {};
  const p = {};
  try {
    new URLSearchParams(h).forEach((v, k) => {
      p[k] = v;
    });
  } catch {}
  return p;
}
// Global hash state store — tracks current values across all components
const _hs = {};
// Update URL hash from global state (uses replaceState, no page reload)
function syncHash() {
  const entries = Object.entries(_hs).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) {
    window.history.replaceState(null, "", window.location.pathname);
    return;
  }
  window.history.replaceState(null, "", "#" + new URLSearchParams(entries).toString());
}
// Coerce string value to match default value's type
function coerceVal(s, def) {
  if (typeof def === "number") {
    const n = Number(s);
    return isNaN(n) ? def : n;
  }
  if (typeof def === "boolean") return s === "true" || s === "1";
  return s;
}
// Custom hook: useState synced to URL hash
// Returns [value, setter] — same API as useState
function useHashState(key, defaultVal) {
  const initHash = React.useMemo(() => parseHash(), []);
  const initVal = initHash[key] !== undefined ? coerceVal(initHash[key], defaultVal) : defaultVal;
  const [val, setVal] = React.useState(initVal);
  React.useEffect(() => {
    if (String(initVal) !== String(defaultVal)) _hs[key] = String(initVal);
  }, []);
  const setter = React.useCallback(newVal => {
    setVal(prev => {
      const v = typeof newVal === "function" ? newVal(prev) : newVal;
      if (String(v) === String(defaultVal)) {
        delete _hs[key];
      } else {
        _hs[key] = String(v);
      }
      syncHash();
      return v;
    });
  }, [key, defaultVal]);
  return [val, setter];
}

// ADA price hook (CoinGecko free API, cached 10min)
let _adaPriceCache = {
  usd: 0,
  jpy: 0,
  ts: 0
};
function useAdaPrice() {
  const [p, setP] = React.useState(_adaPriceCache);
  React.useEffect(() => {
    if (Date.now() - _adaPriceCache.ts < 600000 && _adaPriceCache.usd > 0) {
      setP(_adaPriceCache);
      return;
    }
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd,jpy").then(r => r.json()).then(d => {
      if (d && d.cardano) {
        const v = {
          usd: d.cardano.usd || 0,
          jpy: d.cardano.jpy || 0,
          ts: Date.now()
        };
        _adaPriceCache = v;
        setP(v);
      }
    }).catch(() => {});
  }, []);
  return p;
}
function fmtFiat(ada, rate, symbol) {
  return rate > 0 ? symbol + Math.round(ada * rate).toLocaleString() : "";
}

// Cardano epoch ↔ date conversion (Shelley era: epoch 208 = 2020-07-29T21:44:51Z, 5 days per epoch)
const EPOCH_208_TS = 1596059091000; // ms
const EPOCH_DURATION = 432000000; // 5 days in ms
function epochToDate(epoch) {
  return new Date(EPOCH_208_TS + (epoch - 208) * EPOCH_DURATION);
}
function dateToEpoch(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.floor((d.getTime() - EPOCH_208_TS) / EPOCH_DURATION) + 208;
}
function epochToDateStr(epoch) {
  const d = epochToDate(epoch);
  return d.toISOString().slice(0, 10);
}

// CC term boundaries — minimum epoch for reward eligibility per member
// All current CC members' term starts from the "Budget: ₳5M Loan" proposal (epoch 587)
// except members who joined later (e.g., Curia replaced Atlantic Council)
const CC_MIN_EPOCH = 587; // 90cf51…#0 — current CC term start
const CC_MEMBER_START = {
  "zvt0am7zyhsx": 604 // Cardano Curia — replaced Atlantic Council; first vote at ep.604
};
function ccMemberMinEpoch(ccId) {
  return CC_MEMBER_START[ccId] || CC_MIN_EPOCH;
}
function shortId(id, n = 8, m = 5) {
  return !id ? "" : id.length <= n + m + 3 ? id : id.slice(0, n) + "…" + id.slice(-m);
}
function safeName(v) {
  if (typeof v === "string") {
    if (v.startsWith("{")) try { const p = JSON.parse(v); return p["@value"] || p.givenName || v; } catch {}
    return v;
  }
  return v && typeof v === "object" ? v["@value"] || v.givenName || JSON.stringify(v) : null;
}
function normalizeType(t) {
  const map = {
    // Blockfrost lowercase types
    "treasury_withdrawals": "TreasuryWithdrawals",
    "hard_fork_initiation": "HardForkInitiation",
    "parameter_change": "ParameterChange",
    "no_confidence": "NoConfidence",
    "update_committee": "UpdateCommittee",
    "new_constitution": "NewConstitution",
    "info_action": "InfoAction",
    // Legacy uppercase types (demo data / backward compat)
    "HARD_FORK_INITIATION": "HardForkInitiation",
    "TREASURY_WITHDRAWALS": "TreasuryWithdrawals",
    "PARAMETER_CHANGE": "ParameterChange",
    "PROTOCOL_PARAMETER_CHANGE": "ParameterChange",
    "NO_CONFIDENCE": "NoConfidence",
    "UPDATE_COMMITTEE": "UpdateCommittee",
    "NEW_CONSTITUTION": "NewConstitution",
    "INFO_ACTION": "InfoAction",
    "INFO": "InfoAction",
    "INFORMATION": "InfoAction"
  };
  return map[t] || map[t?.toLowerCase()] || t || "";
}
// Epoch → Unix timestamp (Shelley era: epoch 208 started at 1596059091)
function epochToTimestamp(epoch) {
  return 1596059091 + (epoch - 208) * 432000;
}
function calcGini(values) {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cumSum = 0,
    giniSum = 0;
  sorted.forEach(v => {
    cumSum += v;
    giniSum += cumSum;
  });
  return 2 * giniSum / (n * sum) - (n + 1) / n;
}

// SPOs can vote on all governance action types

const ACTION_COLORS = {
  ParameterChange: "#8b5cf6",
  HardForkInitiation: "#ef4444",
  TreasuryWithdrawals: "#f59e0b",
  NoConfidence: "#dc2626",
  UpdateCommittee: "#06b6d4",
  NewConstitution: "#10b981",
  InfoAction: "#6366f1"
};
function actionColor(t) {
  return ACTION_COLORS[t] || "#6b7280";
}
function actionLabel(t, T) {
  const m = {
    ParameterChange: "type_param",
    HardForkInitiation: "type_hardfork",
    TreasuryWithdrawals: "type_treasury",
    NoConfidence: "type_noconf",
    UpdateCommittee: "type_cc",
    NewConstitution: "type_const",
    InfoAction: "type_info"
  };
  return T[m[t]] || t || "?";
}

// ════════════════════════════════════════════════════════════════
// Blockfrost API Functions
// ════════════════════════════════════════════════════════════════
const DREP_CHUNK = 100,
  VOTE_BATCH = 5;

// Fetch a page of DRep IDs, then batch-fetch their details + metadata
async function fetchDrepPage(page, addLog, setStage) {
  const ids = await bfFetchJSON(`/governance/dreps?page=${page}&count=${BF_PAGE_SIZE}`);
  if (!ids || !Array.isArray(ids) || ids.length === 0) return {
    dreps: [],
    reachedEnd: true
  };
  const result = [];
  for (let i = 0; i < ids.length; i += VOTE_BATCH) {
    const batch = ids.slice(i, i + VOTE_BATCH);
    if (setStage) setStage(`DReps: ${result.length + batch.length}/${ids.length} (page ${page})`);
    const results = await Promise.allSettled(batch.map(async d => {
      const detail = await bfFetchJSON(`/governance/dreps/${d.drep_id}`);
      if (!detail || detail.retired || detail.expired) return null;
      let name = null,
        image_url = null;
      try {
        const meta = await bfFetchJSON(`/governance/dreps/${d.drep_id}/metadata`);
        if (meta && meta.json_metadata) {
          const body = meta.json_metadata.body || meta.json_metadata;
          name = body?.givenName || body?.name || null;
          image_url = body?.image?.contentUrl || null;
        }
      } catch (e) {}
      return {
        drep_id: d.drep_id,
        name,
        amount: detail.amount || "0",
        image_url,
        delegators: 0
      };
    }));
    results.forEach(r => {
      if (r.status === "fulfilled" && r.value) result.push(r.value);
    });
  }
  return {
    dreps: result,
    reachedEnd: ids.length < BF_PAGE_SIZE
  };
}

// Fetch multiple pages of DReps
async function fetchDrepRange(startPage, numPages, addLog, setStage) {
  const result = [];
  let reachedEnd = false;
  for (let p = startPage; p < startPage + numPages; p++) {
    const {
      dreps: chunk,
      reachedEnd: ended
    } = await fetchDrepPage(p, addLog, setStage);
    result.push(...chunk);
    if (ended) {
      reachedEnd = true;
      break;
    }
  }
  result.sort((a, b) => Number(b.amount) - Number(a.amount));
  return {
    dreps: result,
    nextPage: reachedEnd ? -1 : startPage + numPages,
    reachedEnd
  };
}

// Fetch ALL DReps (for simulator) — details only, skip metadata for speed
async function fetchAllDreps(onProgress) {
  const allIds = await bfFetchAllPages("/governance/dreps", 20);
  if (onProgress) onProgress(0, allIds.length);
  const allDreps = [];
  for (let i = 0; i < allIds.length; i += VOTE_BATCH) {
    const batch = allIds.slice(i, i + VOTE_BATCH);
    const results = await Promise.allSettled(batch.map(async d => {
      const detail = await bfFetchJSON(`/governance/dreps/${d.drep_id}`);
      if (!detail || detail.retired || detail.expired) return null;
      // Try to get name from metadata (best effort)
      let name = null;
      try {
        const meta = await bfFetchJSON(`/governance/dreps/${d.drep_id}/metadata`);
        if (meta && meta.json_metadata) {
          const body = meta.json_metadata.body || meta.json_metadata;
          name = body?.givenName || body?.name || null;
        }
      } catch (e) {}
      return {
        drep_id: d.drep_id,
        name,
        amount: detail.amount || "0",
        image_url: null,
        delegators: 0
      };
    }));
    results.forEach(r => {
      if (r.status === "fulfilled" && r.value) allDreps.push(r.value);
    });
    if (onProgress) onProgress(allDreps.length, allIds.length);
  }
  allDreps.sort((a, b) => Number(b.amount) - Number(a.amount));
  return allDreps;
}

// Fetch all votes for a single DRep from Blockfrost
async function fetchAllVotesForDrep(drepId) {
  return (await bfFetchAllPages(`/governance/dreps/${drepId}/votes`, 10)) || [];
}

// Process a Blockfrost vote record into the vote map
function processVoteRecord(v, drepId, vm, rm, gaMap) {
  const propTxHash = v.proposal_tx_hash || "";
  const propCertIdx = v.proposal_cert_index != null ? v.proposal_cert_index : -1;
  if (!propTxHash) return false;
  const propKey = `${propTxHash}#${propCertIdx}`;
  if (!gaMap[propKey]) {
    gaMap[propKey] = {
      proposal_id: propKey,
      proposal_type: "",
      epoch_no: 0,
      title: "",
      tx_hash: propTxHash,
      cert_index: propCertIdx,
      expiration: 0
    };
  }
  let voteVal = (v.vote || "").toLowerCase();
  if (voteVal === "yes") voteVal = "Yes";else if (voteVal === "no") voteVal = "No";else if (voteVal === "abstain") voteVal = "Abstain";else return false;
  const k = `${drepId}__${propKey}`;
  vm[k] = voteVal;
  // Blockfrost vote records don't include rationale directly
  return true;
}

// Fetch votes for a list of DReps
async function fetchVotesForDreps(drepList, addLog, setStage, stageLabel) {
  const vm = {},
    rm = {},
    gaMap = {};
  let totalVotes = 0;
  for (let batch = 0; batch < drepList.length; batch += VOTE_BATCH) {
    const batchDreps = drepList.slice(batch, batch + VOTE_BATCH);
    if (setStage) setStage(`${stageLabel} (${Math.min(batch + VOTE_BATCH, drepList.length)}/${drepList.length})`);
    await Promise.allSettled(batchDreps.map(async d => {
      try {
        const votes = await fetchAllVotesForDrep(d.drep_id);
        votes.forEach(v => {
          if (processVoteRecord(v, d.drep_id, vm, rm, gaMap)) totalVotes++;
        });
      } catch (e) {/* skip */}
    }));
  }
  return {
    vm,
    rm,
    gaMap,
    totalVotes
  };
}

// Enrich proposals with details (type, expiration) and metadata (title) from Blockfrost
async function enrichProposals(gaMap, addLog, setStage) {
  const proposals = Object.values(gaMap);
  const toFetch = proposals.filter(p => !p.proposal_type && p.tx_hash);
  for (let i = 0; i < toFetch.length; i += VOTE_BATCH) {
    const batch = toFetch.slice(i, i + VOTE_BATCH);
    if (setStage) setStage(`Proposals: ${Math.min(i + VOTE_BATCH, toFetch.length)}/${toFetch.length}`);
    await Promise.allSettled(batch.map(async p => {
      try {
        const detail = await bfFetchJSON(`/governance/proposals/${p.tx_hash}/${p.cert_index}`);
        if (detail) {
          p.proposal_type = normalizeType(detail.governance_type || "");
          p.expiration = detail.expiration || 0;
          p.epoch_no = detail.expiration || 0;
        }
      } catch (e) {}
      try {
        const meta = await bfFetchJSON(`/governance/proposals/${p.tx_hash}/${p.cert_index}/metadata`);
        if (meta && meta.json_metadata) {
          const body = meta.json_metadata.body || meta.json_metadata;
          let title = body?.title || "";
          if (typeof title === "object") title = JSON.stringify(title);
          p.title = title;
        }
      } catch (e) {}
    }));
  }
}

// ════════════════════════════════════════════════════════════════
// Demo Data
// ════════════════════════════════════════════════════════════════
function demoData() {
  const names = ["Yoroi Wallet", "Everstake", "CryptoCrow", "Cardano Foundation", "IOHK DRep", "Tempo.vote", "Sidan Lab", "Mesh", "Socious", "Cerkoryn", "Kyle Solomon", "Chris G", "CardanoSphere", "ADA Whale", "Stakepool Hub", "DRep Alpha", "Governance Pioneer", "Community Voice", "Blockchain Scholar", "ADA Guardian"];
  const rnd = n => Math.floor(Math.random() * n);
  const hex = n => Array(n).fill(0).map(() => "0123456789abcdef"[rnd(16)]).join("");
  const dreps = names.map(name => ({
    drep_id: `drep1${hex(52)}`,
    name,
    amount: String((rnd(800) + 1) * 1e6 * 1e6),
    image_url: null,
    delegators: rnd(5000)
  }));
  const types = ["InfoAction", "TreasuryWithdrawals", "ParameterChange", "UpdateCommittee", "HardForkInitiation", "NewConstitution", "NoConfidence"];
  const props = Array.from({
    length: 20
  }, (_, i) => ({
    proposal_id: `${hex(64)}#0`,
    proposal_type: types[rnd(types.length)],
    epoch_no: 530 + rnd(85),
    title: "",
    tx_hash: hex(64),
    cert_index: 0,
    expiration: 540 + rnd(80)
  }));
  const choices = ["Yes", "No", "Abstain"];
  const vm = {};
  dreps.forEach(d => props.forEach(p => {
    if (Math.random() > .35) {
      const k = `${d.drep_id}__${p.proposal_id}`;
      vm[k] = choices[rnd(3)];
    }
  }));
  return {
    dreps,
    proposals: props,
    votes: vm
  };
}

// ════════════════════════════════════════════════════════════════
// Shared Components
// ════════════════════════════════════════════════════════════════
function Avatar({
  name,
  url,
  size = 28
}) {
  const [err, setErr] = React.useState(false);
  const safeName = typeof name === "string" ? name : name && typeof name === "object" ? name["@value"] || JSON.stringify(name) : "?";
  const ini = safeName.replace(/^drep1/, "").slice(0, 2).toUpperCase();
  const h = safeName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const validUrl = url && !err && !url.startsWith("data:") ? url : null;
  if (validUrl) return /*#__PURE__*/React.createElement("img", {
    src: validUrl,
    alt: "",
    onError: () => setErr(true),
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      objectFit: "cover",
      border: "2px solid var(--border2)",
      flexShrink: 0
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.35,
      fontWeight: 700,
      background: `hsl(${h},40%,20%)`,
      color: `hsl(${h},60%,62%)`,
      border: `2px solid hsl(${h},30%,30%)`,
      flexShrink: 0
    }
  }, ini);
}
function PaginationBar({
  label,
  page,
  setPage,
  total
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, label, ":"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: page === 0,
    onClick: () => setPage(Math.max(0, page - 1)),
    style: {
      padding: "2px 7px",
      fontSize: 11,
      opacity: page === 0 ? .3 : 1
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      minWidth: 36,
      textAlign: "center"
    }
  }, page + 1, "/", total), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: page >= total - 1,
    onClick: () => setPage(Math.min(total - 1, page + 1)),
    style: {
      padding: "2px 7px",
      fontSize: 11,
      opacity: page >= total - 1 ? .3 : 1
    }
  }, "\u2192"));
}

// ─── Shared constants (hoisted outside components to avoid re-creation) ───
const VOTE_STYLES = {
  Yes: {
    bg: "rgba(52,211,153,.12)",
    c: "#34d399",
    bc: "rgba(52,211,153,.25)",
    icon: "✓",
    l: "Y"
  },
  No: {
    bg: "rgba(248,113,113,.12)",
    c: "#f87171",
    bc: "rgba(248,113,113,.25)",
    icon: "✗",
    l: "N"
  },
  Abstain: {
    bg: "rgba(251,191,36,.12)",
    c: "#fbbf24",
    bc: "rgba(251,191,36,.25)",
    icon: "−",
    l: "A"
  },
  NotVoted: {
    bg: "rgba(75,85,99,.06)",
    c: "#555e70",
    bc: "rgba(75,85,99,.12)",
    icon: "",
    l: "−"
  }
};
const INPUT_STYLE = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 12,
  outline: "none"
};
function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function buildCSV(headers, rows) {
  return [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
function RationaleModal({
  modal,
  onClose,
  T
}) {
  if (!modal) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      maxWidth: 700,
      width: "100%",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 20px 60px rgba(0,0,0,.5)"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--text)"
    }
  }, modal.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text2)",
      marginTop: 2
    }
  }, modal.proposalTitle)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "var(--text2)",
      fontSize: 18,
      cursor: "pointer",
      padding: "0 4px"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      overflow: "auto",
      flex: 1
    }
  }, modal.loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 30,
      color: "var(--text2)"
    }
  }, T.cc_rationale_loading) : /*#__PURE__*/React.createElement("pre", {
    style: {
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--text)",
      fontFamily: "inherit",
      margin: 0
    }
  }, modal.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px",
      borderTop: "1px solid var(--border)",
      display: "flex",
      justifyContent: "flex-end",
      gap: 8
    }
  }, modal.text && modal.onDownload && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      fontSize: 11
    },
    onClick: modal.onDownload
  }, "⬇ " + (T.download || "Download")), modal.url && /*#__PURE__*/React.createElement("a", {
    href: modal.url,
    target: "_blank",
    rel: "noopener",
    className: "btn",
    style: {
      fontSize: 11
    }
  }, "🔗 " + (T.source || "Source")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "btn",
    style: {
      fontSize: 11
    }
  }, T.close || "Close"))));
}
function VoteBadge({
  vote
}) {
  const s = VOTE_STYLES[vote] || VOTE_STYLES.NotVoted;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      padding: "2px 5px",
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 700,
      background: s.bg,
      color: s.c,
      border: `1px solid ${s.bc}`,
      minWidth: 28,
      letterSpacing: ".03em",
      lineHeight: 1.2
    }
  }, s.icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9
    }
  }, s.icon), s.l);
}
function SliderParam({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    onChange: e => onChange(Number(e.target.value)),
    min: min,
    max: max,
    step: step,
    style: {
      width: 90,
      textAlign: "right",
      padding: "4px 8px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 12,
      outline: "none"
    }
  }), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text2)"
    }
  }, suffix))), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value)),
    style: {
      background: `linear-gradient(to right, var(--accent) ${(value - min) / (max - min) * 100}%, var(--bg3) ${(value - min) / (max - min) * 100}%)`
    }
  }));
}
function WarningBanner({
  warnings,
  T
}) {
  const [open, setOpen] = React.useState(true);
  if (!warnings || warnings.length === 0) return null;
  if (!open) return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(true),
    style: {
      fontSize: 10,
      padding: "3px 8px",
      color: "#f59e0b"
    }
  }, "\u26A0 ", warnings.length, " ", T.data_warnings));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(245,158,11,.08)",
      border: "1px solid rgba(245,158,11,.25)",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 12,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "#f59e0b"
    }
  }, "\u26A0 ", T.data_warnings, " (", warnings.length, ")"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(false),
    style: {
      fontSize: 10,
      padding: "2px 8px"
    }
  }, T.hide)), warnings.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "3px 0",
      color: w.type === "error" ? "#f87171" : "#fbbf24",
      fontSize: 11
    }
  }, w.type === "error" ? "❌" : "⚠️", " ", w.msg)));
}

// Reward Calculation Models (3 mechanisms, computed simultaneously)
// ════════════════════════════════════════════════════════════════
function calcAllMechanisms(dreps, params, voteData, totalActions, periodVoteData) {
  const n = dreps.length;
  if (n === 0) return {
    mo_equal: [],
    mo_prop: [],
    mo_bonus: []
  };
  const budget = params.totalBudget;
  function tagEligible() {
    let paidCount = 0;
    return dreps.map((d, i) => {
      const excluded = i < params.K;
      const inBand = !excluded && Number(d.amount) > 0 && paidCount < params.N;
      if (inBand) paidCount++;
      return {
        ...d,
        rank: i + 1,
        eligible: inBand
      };
    });
  }
  function applyPeriodVotePenalty(tagged, rewards) {
    if (!periodVoteData) return rewards;
    return rewards.map((r, i) => {
      if (r === 0) return 0;
      const pd = periodVoteData[tagged[i].drep_id];
      if (!pd || pd.actionsInPeriod === 0) return 0;
      let factor = 1;
      // Vote-rate adjustment
      if (params.votePenaltyOn) {
        factor *= pd.votesInPeriod / pd.actionsInPeriod;
      }
      // Rationale adjustment: blend between 1.0 (no effect) and rationaleRate
      if (params.rationaleWeight > 0 && pd.votesInPeriod > 0) {
        const ratRate = pd.rationalesInPeriod / pd.votesInPeriod;
        factor *= 1 - params.rationaleWeight * (1 - ratRate);
      }
      return r * factor;
    });
  }
  function adjustAndNormalize(tagged, rewards) {
    let adj = applyPeriodVotePenalty(tagged, rewards);
    const total = adj.reduce((a, b) => a + b, 0);
    if (total > 0) adj = adj.map(r => r * budget / total);
    return tagged.map((d, i) => ({
      ...d,
      reward: adj[i]
    }));
  }
  function calcEqual() {
    const tagged = tagEligible();
    const weights = tagged.map(d => d.eligible ? 1 : 0);
    const sumW = weights.reduce((a, b) => a + b, 0);
    const base = tagged.map((d, i) => sumW > 0 && d.eligible ? budget * (weights[i] / sumW) : 0);
    return adjustAndNormalize(tagged, base);
  }
  function calcProp() {
    const tagged = tagEligible();
    const weights = tagged.map(d => d.eligible ? Number(d.amount) : 0);
    const sumW = weights.reduce((a, b) => a + b, 0);
    const base = tagged.map((d, i) => sumW > 0 && d.eligible ? budget * (weights[i] / sumW) : 0);
    return adjustAndNormalize(tagged, base);
  }
  function calcBonus() {
    const tagged = tagEligible();
    const eligibleList = tagged.filter(d => d.eligible);
    if (eligibleList.length === 0) return tagged.map(d => ({
      ...d,
      reward: 0
    }));
    const eligibleStake = eligibleList.reduce((s, d) => s + Number(d.amount), 0);
    const totalBonusPool = params.b2 * eligibleList.length;
    const baseBudget = budget - totalBonusPool;
    const base = tagged.map(d => {
      if (!d.eligible) return 0;
      const propPart = eligibleStake > 0 && baseBudget > 0 ? baseBudget * (Number(d.amount) / eligibleStake) : 0;
      return propPart + params.b2;
    });
    return adjustAndNormalize(tagged, base);
  }
  return {
    mo_equal: calcEqual(),
    mo_prop: calcProp(),
    mo_bonus: calcBonus()
  };
}
function calcProcessMetrics(results, totalEligible) {
  const rewarded = results.filter(r => r.reward > 0);
  const eligibleCount = rewarded.length;
  const totalReward = rewarded.reduce((s, r) => s + r.reward, 0);
  const rewards = rewarded.map(r => r.reward);
  const P = totalEligible > 0 ? eligibleCount / totalEligible : 0;
  let C = 0;
  if (totalReward > 0 && eligibleCount > 1) {
    const hhi = rewarded.reduce((s, r) => s + Math.pow(r.reward / totalReward, 2), 0);
    C = (hhi - 1 / eligibleCount) / (1 - 1 / eligibleCount);
  }
  const rewardedStake = rewarded.reduce((s, r) => s + Number(r.amount), 0);
  let D = 0;
  if (rewardedStake > 0 && totalEligible > 0) {
    const stakeHHI = rewarded.reduce((s, r) => s + Math.pow(Number(r.amount) / rewardedStake, 2), 0);
    const effectiveN = stakeHHI > 0 ? 1 / stakeHHI : 0;
    D = effectiveN / totalEligible;
  }
  const gini = calcGini(rewards);
  const minR = rewards.length > 0 ? Math.min(...rewards) : 0;
  const maxR = rewards.length > 0 ? Math.max(...rewards) : 0;
  const avgR = rewards.length > 0 ? totalReward / rewards.length : 0;
  const medR = rewards.length > 0 ? [...rewards].sort((a, b) => a - b)[Math.floor(rewards.length / 2)] : 0;
  return {
    D,
    P,
    C,
    eligible: eligibleCount,
    gini,
    minR,
    maxR,
    avgR,
    medR,
    totalReward
  };
}

// ─── Share Button ─────────────────────────────────────────────
function ShareButton({
  T
}) {
  const [copied, setCopied] = React.useState(false);
  return React.createElement("button", {
    className: "btn",
    onClick: () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    style: {
      fontSize: 11,
      padding: "4px 12px",
      gap: 4,
      display: "inline-flex",
      alignItems: "center"
    }
  }, copied ? "✓ " + (T.share_copied || "Copied!") : "🔗 " + (T.share_url || "Share"));
}

// ════════════════════════════════════════════════════════════════
// Dashboard Tab
// ════════════════════════════════════════════════════════════════
function DashboardTab({
  dreps,
  proposals,
  votes,
  drepRationales,
  warnings,
  hasMore,
  pageLoading,
  stage,
  loadMoreDreps,
  T,
  isDemo,
  ccMembers,
  ccVotes,
  ccRationales,
  spoVotes,
  spoPoolInfo,
  govInfo
}) {
  const [search, setSearch] = useHashState("d_search", "");
  const [minStake, setMinStake] = useHashState("d_minStake", "");
  const [maxStake, setMaxStake] = useHashState("d_maxStake", "");
  const [actType, setActType] = useHashState("d_actType", "all");
  const [epFrom, setEpFrom] = useHashState("d_epFrom", "");
  const [epTo, setEpTo] = useHashState("d_epTo", "");
  const [sortBy, setSortBy] = useHashState("d_sort", "stake_desc");
  const [dPage, setDPage] = useHashState("d_dp", 0);
  const [pPage, setPPage] = useHashState("d_pp", 0);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = useHashState("d_fo", true);
  const [drepOpen, setDrepOpen] = useHashState("d_do", true);
  const [ccOpen, setCcOpen] = useHashState("d_co", true);
  const [spoOpen, setSpoOpen] = useHashState("d_so", true);
  const [spoFull, setSpoFull] = React.useState(false);
  const [spoSearchQ, setSpoSearchQ] = React.useState("");
  const [spoSortKey, setSpoSortKey] = React.useState("stake");
  const [spoSortDir, setSpoSortDir] = React.useState("desc");
  const [spoFilter, setSpoFilter] = React.useState("all");
  const [spoGaFilter, setSpoGaFilter] = React.useState("");
  const [spoGaVoteFilter, setSpoGaVoteFilter] = React.useState("not_voted");
  const [spoPage, setSpoPage] = React.useState(0);
  const [spoDrepFilter, setSpoDrepFilter] = React.useState("all"); // all | auto_abstain | auto_nc | custom_drep
  const [zoom, setZoom] = useHashState("d_zm", 80); // 50-150 %
  // ─── Shared helpers (inside component to access zoom) ───
  const sz = (v) => Math.round(v * zoom / 100);
  const rowBg = (i) => i % 2 === 0 ? "var(--bg2)" : "rgba(255,255,255,.01)";
  const stickyLeft = (bg) => ({ ...stickyLeft(bg) });
  const [drepFull, setDrepFull] = React.useState(false); // fullscreen expand for DRep table
  const [ccFull, setCcFull] = React.useState(false); // fullscreen expand for CC table
  const drepScrollRef = React.useRef(null);
  const ccScrollRef = React.useRef(null);
  const spoScrollRef = React.useRef(null);
  const scrollSyncLock = React.useRef(false);
  const syncScroll = React.useCallback((source, ...targets) => {
    if (scrollSyncLock.current) return;
    scrollSyncLock.current = true;
    targets.forEach(t => {
      if (t.current) t.current.scrollLeft = source.current.scrollLeft;
    });
    requestAnimationFrame(() => {
      scrollSyncLock.current = false;
    });
  }, []);
  const DPP = 100,
    PPP = 20;
  const fDreps = React.useMemo(() => {
    let r = dreps.filter(d => d.drep_id !== "drep_always_abstain" && d.drep_id !== "drep_always_no_confidence");
    if (minStake) {
      const m = parseFloat(minStake) * 1e6;
      r = r.filter(d => Number(d.amount) >= m);
    }
    if (maxStake) {
      const m = parseFloat(maxStake) * 1e6;
      r = r.filter(d => Number(d.amount) <= m);
    }
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(d => {
        const sn = safeName(d.name) || "";
        return sn.toLowerCase().includes(q) || d.drep_id && d.drep_id.toLowerCase().includes(q);
      });
    }
    if (sortBy === "stake_desc") r.sort((a, b) => Number(b.amount) - Number(a.amount));else if (sortBy === "stake_asc") r.sort((a, b) => Number(a.amount) - Number(b.amount));else r.sort((a, b) => (safeName(a.name) || "zzz").localeCompare(safeName(b.name) || "zzz"));
    return r;
  }, [dreps, minStake, maxStake, search, sortBy]);
  const totalStake = React.useMemo(() => dreps.filter(d => d.drep_id !== "drep_always_abstain" && Number(d.amount) > 0).reduce((s, d) => s + Number(d.amount), 0), [dreps]);
  const fProps = React.useMemo(() => {
    let r = [...proposals];
    if (actType !== "all") r = r.filter(p => p.proposal_type === actType);
    if (epFrom) r = r.filter(p => Number(p.epoch_no) >= parseInt(epFrom));
    if (epTo) r = r.filter(p => Number(p.epoch_no) <= parseInt(epTo));
    return r;
  }, [proposals, actType, epFrom, epTo]);
  const pgD = fDreps.slice(dPage * DPP, (dPage + 1) * DPP);
  const pgP = fProps.slice(pPage * PPP, (pPage + 1) * PPP);
  const tDP = Math.max(1, Math.ceil(fDreps.length / DPP));
  const tPP = Math.max(1, Math.ceil(fProps.length / PPP));
  const actTypes = [...new Set(proposals.map(p => p.proposal_type).filter(Boolean))];
  const [ratModal, setRatModal] = React.useState(null); // {name, proposalTitle, text}

  // CC vote logic (merged from CCVotesTab)
  const ccProposalIds = React.useMemo(() => {
    const ids = new Set();
    Object.keys(ccVotes || {}).forEach(k => {
      const pid = k.split("__")[1];
      if (pid) ids.add(pid);
    });
    return ids;
  }, [ccVotes]);
  const eligibleMap = React.useMemo(() => {
    const m = {};
    (ccMembers || []).forEach(cc => {
      if (cc.eligible_proposals) {
        cc.eligible_proposals.forEach(pid => {
          m[`${cc.cc_id}__${pid}`] = true;
        });
      }
    });
    return m;
  }, [ccMembers]);
  function ccGv(ccId, pid) {
    const v = (ccVotes || {})[`${ccId}__${pid}`];
    if (v) return v;
    return eligibleMap[`${ccId}__${pid}`] ? "NotVoted" : "Ineligible";
  }
  function ccGr(ccId, pid) {
    const r = (ccRationales || {})[`${ccId}__${pid}`];
    if (!r) return null;
    if (typeof r === "string") return {
      url: resolveIpfsUrl(r),
      text: ""
    };
    return r;
  }
  const [ccRatModal, setCcRatModal] = React.useState(null);
  function gv(did, pid) {
    return votes[`${did}__${pid}`] || "NotVoted";
  }
  function getDrepRat(did, pid) {
    const r = drepRationales[`${did}__${pid}`];
    if (!r) return null;
    if (typeof r === "string") return {
      url: resolveIpfsUrl(r),
      text: ""
    };
    return r;
  }
  function exportDrepRationalesCSV() {
    const hdr = ["DRep Name", "DRep ID", "Proposal", "Vote", "Rationale"];
    const rows = [];
    dreps.forEach(d => {
      proposals.forEach(p => {
        const v = gv(d.drep_id, p.proposal_id);
        const rat = getDrepRat(d.drep_id, p.proposal_id);
        if (rat && rat.text) {
          rows.push([safeName(d.name) || d.drep_id, d.drep_id, p.title || p.proposal_id, v, rat.text]);
        }
      });
    });
    if (rows.length === 0) {
      alert("No rationale data available.");
      return;
    }
    downloadCSV(buildCSV(hdr, rows), "drep_rationales.csv");
  }
  function exportProposalRationales(proposal) {
    const hdr = ["DRep Name", "DRep ID", "Vote", "Rationale"];
    const rows = [];
    dreps.forEach(d => {
      const v = gv(d.drep_id, proposal.proposal_id);
      const rat = getDrepRat(d.drep_id, proposal.proposal_id);
      if (rat && rat.text) {
        rows.push([safeName(d.name) || d.drep_id, d.drep_id, v, rat.text]);
      }
    });
    if (rows.length === 0) {
      alert("No rationale data for this proposal.");
      return;
    }
    const fname = (proposal.title || proposal.proposal_id || "proposal").slice(0, 40).replace(/[^a-zA-Z0-9_\-]/g, "_");
    downloadCSV(buildCSV(hdr, rows), `drep_rationales_${fname}.csv`);
  }
  function handleDPageChange(newPage) {
    setDPage(newPage);
    if ((newPage + 1) * DPP > dreps.length && hasMore && !pageLoading) loadMoreDreps();
  }
  function exportCSV(mode) {
    const csvDreps = mode === "visible" ? pgD : fDreps;
    const csvProps = mode === "visible" ? pgP : fProps;
    const hdr = ["DRep ID", "DRep Name", "Stake (ADA)", "Delegators", ...csvProps.map(p => {
      const t = p.title ? p.title.slice(0, 40) : shortId(p.proposal_id);
      return `[${p.proposal_type}] ${t}`;
    })];
    const rows = csvDreps.map(d => [d.drep_id, safeName(d.name) || "", Math.round(Number(d.amount) / 1e6), d.delegators || 0, ...csvProps.map(p => gv(d.drep_id, p.proposal_id))]);
    downloadCSV(buildCSV(hdr, rows), `cardano_drep_votes_${mode}.csv`);
  }
  function exportCCVotesCSV() {
    const members = ccMembers || [];
    const hdr = ["CC Member ID", "Name", "Vote Count", ...fProps.map(p => {
      const t = p.title ? p.title.slice(0, 40) : shortId(p.proposal_id);
      return `[${p.proposal_type}] ${t}`;
    })];
    const rows = members.map(c => [c.cc_id, c.name || "", c.vote_count, ...fProps.map(p => {
      const v = ccGv(c.cc_id, p.proposal_id);
      const r = ccGr(c.cc_id, p.proposal_id);
      return v + (r ? " [📎]" : "");
    })]);
    downloadCSV(buildCSV(hdr, rows), "cc_votes.csv");
  }
  function exportCCRationalesCSV() {
    const hdr = ["CC Member", "Proposal ID", "Title", "Type", "Vote", "Rationale URL", "Rationale Content"];
    const rows = [];
    for (const cc of ccMembers || []) {
      for (const p of fProps) {
        const vote = (ccVotes || {})[`${cc.cc_id}__${p.proposal_id}`];
        if (!vote) continue;
        const ratObj = ccGr(cc.cc_id, p.proposal_id);
        const content = ratObj ? (ratObj.text || "").replace(/[\r\n]+/g, " ").slice(0, 5000) : "";
        rows.push([cc.name || cc.cc_id, p.proposal_id, p.title || "", p.proposal_type || "", vote, ratObj ? ratObj.url : "", content]);
      }
    }
    downloadCSV(buildCSV(hdr, rows), "cc_rationales.csv");
  }
  function exportSpoVotesCSV() {
    const SPO_INELIG = ["TreasuryWithdrawals", "NewConstitution"];
    const poolIds = new Set();
    Object.keys(spoVotes || {}).forEach(k => poolIds.add(k.split("__")[0]));
    Object.keys(spoPoolInfo || {}).forEach(id => poolIds.add(id));
    const pools = [...poolIds].map(pid => {
      const info = (spoPoolInfo || {})[pid] || {};
      const v = {};
      let vc = 0;
      fProps.forEach(p => {
        const vote = (spoVotes || {})[`${pid}__${p.proposal_id}`];
        if (vote) {
          v[p.proposal_id] = vote;
          vc++;
        }
      });
      return {
        pool_id: pid,
        ticker: info.ticker || "",
        pledge_drep: info.pledge_drep || null,
        active_stake: info.active_stake || "0",
        votes: v,
        voteCount: vc,
        isAA: info.pledge_drep === "drep_always_abstain",
        isNC: info.pledge_drep === "drep_always_no_confidence"
      };
    }).sort((a, b) => Number(b.active_stake) - Number(a.active_stake));
    const hdr = ["Pool ID", "Ticker", "Active Stake (ADA)", "Reward DRep", ...fProps.map(p => `[${p.proposal_type}] ${(p.title || shortId(p.proposal_id)).slice(0, 40)}`)];
    const rows = pools.map(pool => [pool.pool_id, pool.ticker, Math.round(Number(pool.active_stake) / 1e6), pool.isAA ? "Auto-Abstain" : pool.isNC ? "Auto-NoConfidence" : pool.pledge_drep || "", ...fProps.map(p => {
      if (SPO_INELIG.includes(p.proposal_type)) return "N/A";
      const ex = pool.votes[p.proposal_id];
      if (ex) return ex;
      if (p.proposal_type === "HardForkInitiation") return "NotVoted";
      if (pool.isAA) return "Abstain (auto)";
      if (pool.isNC) return p.proposal_type === "NoConfidence" ? "Yes (auto)" : "Abstain (auto)";
      return "NotVoted";
    })]);
    downloadCSV(buildCSV(hdr, rows), "spo_votes.csv");
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(WarningBanner, {
    warnings: warnings,
    T: T
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 12,
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setFiltersOpen(!filtersOpen),
    style: {
      fontSize: 11,
      display: "flex",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-end"
    }
  }, filtersOpen ? "▼" : "▶", " ", T.filter_collapse || "Filters"), filtersOpen && [{
    l: T.filter_search,
    el: /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: T.filter_search_ph,
      value: search,
      onChange: e => {
        setSearch(e.target.value);
        setDPage(0);
      },
      style: {
        ...INPUT_STYLE,
        width: 150
      }
    })
  }, {
    l: T.filter_min_stake,
    el: /*#__PURE__*/React.createElement("input", {
      type: "number",
      placeholder: "1000000",
      value: minStake,
      onChange: e => {
        setMinStake(e.target.value);
        setDPage(0);
      },
      style: {
        ...INPUT_STYLE,
        width: 110
      }
    })
  }, {
    l: T.filter_max_stake,
    el: /*#__PURE__*/React.createElement("input", {
      type: "number",
      placeholder: "999999999",
      value: maxStake,
      onChange: e => {
        setMaxStake(e.target.value);
        setDPage(0);
      },
      style: {
        ...INPUT_STYLE,
        width: 110
      }
    })
  }, {
    l: T.filter_action_type,
    el: /*#__PURE__*/React.createElement("select", {
      value: actType,
      onChange: e => {
        setActType(e.target.value);
        setPPage(0);
      },
      style: {
        ...INPUT_STYLE,
        minWidth: 120
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, T.filter_all), actTypes.map(t => /*#__PURE__*/React.createElement("option", {
      key: t,
      value: t
    }, actionLabel(t, T))))
  }, {
    l: T.filter_sort,
    el: /*#__PURE__*/React.createElement("select", {
      value: sortBy,
      onChange: e => setSortBy(e.target.value),
      style: {
        ...INPUT_STYLE,
        minWidth: 100
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "stake_desc"
    }, T.sort_stake_desc), /*#__PURE__*/React.createElement("option", {
      value: "stake_asc"
    }, T.sort_stake_asc), /*#__PURE__*/React.createElement("option", {
      value: "name_asc"
    }, T.sort_name))
  }].map(({
    l,
    el
  }, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, l), el)), filtersOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "inline-block"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setCsvOpen(!csvOpen)
  }, "\uD83D\uDCE5 ", T.csv_export, " \u25BE"), csvOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: 4,
      background: "var(--bg3)",
      border: "1px solid var(--border2)",
      borderRadius: 6,
      overflow: "hidden",
      zIndex: 50,
      minWidth: 220,
      boxShadow: "0 8px 24px rgba(0,0,0,.5)"
    }
  }, [{
    icon: "👥",
    label: "DRep Votes",
    fn: () => exportCSV("all")
  }, {
    icon: "📝",
    label: "DRep Rationales",
    fn: exportDrepRationalesCSV
  }, {
    icon: "🏛",
    label: "CC Votes",
    fn: exportCCVotesCSV,
    disabled: !(ccMembers && ccMembers.length)
  }, {
    icon: "📝",
    label: "CC Rationales",
    fn: exportCCRationalesCSV,
    disabled: !(ccMembers && ccMembers.length)
  }, {
    icon: "🏊",
    label: "SPO Votes",
    fn: exportSpoVotesCSV,
    disabled: !Object.keys(spoPoolInfo || {}).length
  }].map((item, idx) => /*#__PURE__*/React.createElement("button", {
    key: idx,
    onClick: () => {
      item.fn();
      setCsvOpen(false);
    },
    disabled: item.disabled,
    style: {
      display: "block",
      width: "100%",
      padding: "8px 12px",
      border: "none",
      borderTop: idx > 0 ? "1px solid var(--border)" : "none",
      background: "transparent",
      color: item.disabled ? "var(--text2)" : "var(--text)",
      fontSize: 11,
      cursor: item.disabled ? "default" : "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      opacity: item.disabled ? .4 : 1
    },
    onMouseEnter: e => {
      if (!item.disabled) e.target.style.background = "var(--bg4)";
    },
    onMouseLeave: e => e.target.style.background = "transparent"
  }, item.icon, " ", item.label)))), filtersOpen && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => {
      setSearch("");
      setMinStake("");
      setMaxStake("");
      setActType("all");
      setEpFrom("");
      setEpTo("");
      setSortBy("stake_desc");
      setDPage(0);
      setPPage(0);
    },
    style: {
      alignSelf: "flex-end",
      fontSize: 11
    }
  }, T.reset), filtersOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 10,
      color: "var(--text2)"
    }
  }, T.zoom_label || "Size", ":"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 50,
    max: 150,
    step: 10,
    value: zoom,
    onChange: e => setZoom(Number(e.target.value)),
    style: {
      width: 80,
      accentColor: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text2)",
      minWidth: 28
    }
  }, zoom, "%")), pageLoading && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--accent2)"
    }
  }, "\u23F3 ", stage)), /*#__PURE__*/React.createElement("div", {
    style: drepFull ? {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9998,
      background: "var(--bg)",
      padding: 12,
      display: "flex",
      flexDirection: "column"
    } : {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: drepOpen ? 6 : 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (drepOpen) setDrepFull(false);
      setDrepOpen(!drepOpen);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px 0",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text2)"
    }
  }, drepOpen ? "▼" : "▶"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)"
    }
  }, "\uD83D\uDC65 ", T.drep_section_title || "DRep Votes", " (", fDreps.length, hasMore ? "+" : "", ")")), drepOpen && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setDrepFull(!drepFull),
    style: {
      fontSize: 11,
      padding: "3px 10px",
      marginLeft: "auto",
      background: drepFull ? "var(--accent)" : "var(--bg3)",
      color: drepFull ? "#fff" : "var(--text)",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, drepFull ? "⊗ " + (T.close || "Close") : "⤢ " + (T.expand || "Expand"))), drepOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      background: "var(--bg2)",
      flex: drepFull ? 1 : undefined,
      display: drepFull ? "flex" : undefined,
      flexDirection: drepFull ? "column" : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: drepScrollRef,
    onScroll: () => syncScroll(drepScrollRef, ccScrollRef, spoScrollRef),
    style: {
      overflow: "auto",
      maxHeight: drepFull ? "none" : ccOpen ? "calc(80vh - 120px)" : "calc(100vh - 200px)",
      flex: drepFull ? 1 : undefined
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "separate",
      borderSpacing: 0,
      width: "100%",
      minWidth: pgP.length * sz(70) + sz(260),
      fontSize: sz(14)
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      position: "sticky",
      left: 0,
      top: 0,
      zIndex: 30,
      background: "var(--bg3)",
      padding: `${sz(8)}px ${sz(10)}px`,
      textAlign: "left",
      borderBottom: "2px solid var(--border)",
      borderRight: "2px solid var(--border)",
      fontSize: sz(10),
      fontWeight: 700,
      color: "var(--text2)",
      minWidth: sz(260),
      textTransform: "uppercase",
      letterSpacing: ".05em",
      boxShadow: "4px 0 8px rgba(0,0,0,.3)"
    }
  }, T.drep_col), pgP.map((p, i) => {
    const c = actionColor(p.proposal_type);
    const shortTitle = p.title ? p.title.length > 30 ? p.title.slice(0, 30) + "…" : p.title : "";
    // Proposal approval mini-bars (using Koios voting summaries)
    const ps = govInfo && govInfo.proposalSummaries && govInfo.proposalSummaries[p.proposal_id];
    const pp = govInfo && govInfo.protocolParams;
    // Cardano Conway voting eligibility by proposal type
    const CC_INELIG = ["NoConfidence"];
    const SPO_INELIG = ["TreasuryWithdrawals", "NewConstitution"];
    const ccCanVote = !CC_INELIG.includes(p.proposal_type);
    let spoCanVote = !SPO_INELIG.includes(p.proposal_type);
    // Compute SPO yes% from spo-votes.json (individual votes — more reliable than cached Koios summary)
    let spoYesPctOverride = null;
    let spoVoteCounts = {
      yes: 0,
      no: 0,
      abstain: 0
    };
    if (spoCanVote && spoVotes) {
      const propKey = (p.tx_hash || "") + "#" + (p.cert_index ?? "");
      for (const [k, v] of Object.entries(spoVotes)) {
        if (k.includes("__" + propKey)) {
          if (v === "Yes") spoVoteCounts.yes++;else if (v === "No") spoVoteCounts.no++;else if (v === "Abstain") spoVoteCounts.abstain++;
        }
      }
      const spoTotal = spoVoteCounts.yes + spoVoteCounts.no + spoVoteCounts.abstain;
      if (spoTotal > 0) {
        spoYesPctOverride = spoVoteCounts.yes / spoTotal * 100;
      }
    }
    // For ParameterChange where SPOs have zero yes+no votes: threshold is treated as met
    // Use individual SPO vote data (spo-votes.json) as primary source, fall back to Koios summary
    let spoAllAbstain = false;
    if (spoCanVote && p.proposal_type === "ParameterChange") {
      const spoYesNoFromVotes = spoVoteCounts.yes + spoVoteCounts.no;
      if (spoYesNoFromVotes === 0) {
        // Double-check with Koios summary
        const koiosSpoYesNo = ps ? (ps.spo.yes_votes_cast || 0) + (ps.spo.no_votes_cast || 0) : 0;
        const koiosSpoPct = ps ? (ps.spo.yes_pct || 0) + (ps.spo.no_pct || 0) : 0;
        if (koiosSpoYesNo === 0 && koiosSpoPct === 0) spoAllAbstain = true;
      }
    }
    const _miniBar = (yesPct, thr, label, clr, ineligible) => {
      if (ineligible) return React.createElement("div", {
        key: label,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 1
        },
        title: `${label}: N/A (not eligible to vote)`
      }, React.createElement("span", {
        style: {
          fontSize: 5,
          color: "var(--text2)",
          minWidth: 12,
          textAlign: "right",
          lineHeight: 1,
          opacity: .35
        }
      }, label), React.createElement("div", {
        style: {
          position: "relative",
          width: 24,
          height: 3,
          background: "rgba(128,128,128,.12)",
          borderRadius: 2
        }
      }), React.createElement("span", {
        style: {
          fontSize: 5,
          color: "var(--text2)",
          minWidth: 14,
          lineHeight: 1,
          opacity: .35
        }
      }, "—"));
      if (thr === null) return null;
      const pct = yesPct / 100; // normalize to 0-1
      const met = pct >= thr;
      const pctS = yesPct > 0 ? yesPct.toFixed(0) + "%" : "0%";
      return React.createElement("div", {
        key: label,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 1
        },
        title: `${label}: ${pctS} / ${(thr * 100).toFixed(0)}%`
      }, React.createElement("span", {
        style: {
          fontSize: 5,
          color: clr,
          minWidth: 12,
          textAlign: "right",
          lineHeight: 1
        }
      }, label), React.createElement("div", {
        style: {
          position: "relative",
          width: 24,
          height: 3,
          background: "rgba(255,255,255,.08)",
          borderRadius: 2,
          overflow: "hidden"
        }
      }, React.createElement("div", {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: Math.min(pct, 1) * 100 + "%",
          background: met ? "#34d399" : "#f87171",
          borderRadius: 2
        }
      }), React.createElement("div", {
        style: {
          position: "absolute",
          left: thr * 100 + "%",
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(255,255,255,.5)"
        }
      })), React.createElement("span", {
        style: {
          fontSize: 5,
          fontWeight: 600,
          color: met ? "#34d399" : "#f87171",
          minWidth: 14,
          lineHeight: 1
        }
      }, pctS));
    };
    const _dt = getDrepThreshold(pp, p.proposal_type);
    const _st = spoCanVote ? getSpoThreshold(pp, p.proposal_type) : null;
    const _ct = ccCanVote ? getCCThreshold(pp) : null;
    return /*#__PURE__*/React.createElement("th", {
      key: p.proposal_id || i,
      style: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--bg3)",
        padding: "4px 2px",
        textAlign: "center",
        borderBottom: "2px solid var(--border)",
        fontSize: 9,
        fontWeight: 600,
        minWidth: sz(70),
        maxWidth: sz(90),
        verticalAlign: "bottom"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1
      },
      title: p.title || p.proposal_id
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        padding: "1px 4px",
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        textTransform: "uppercase",
        background: c + "15",
        color: c,
        border: `1px solid ${c}30`,
        lineHeight: 1.6
      }
    }, actionLabel(p.proposal_type, T)), shortTitle && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: "var(--text)",
        lineHeight: 1.2,
        maxWidth: sz(86),
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        wordBreak: "break-all",
        textAlign: "center"
      }
    }, shortTitle), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 2,
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 6,
        color: "var(--text2)",
        opacity: .6
      },
      title: p.proposal_id
    }, shortId(p.tx_hash || p.proposal_id, 6, 4)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        cursor: "pointer",
        opacity: .7
      },
      title: T.export_proposal_rationales || "Export DRep rationales for this proposal",
      onClick: () => exportProposalRationales(p)
    }, "\uD83D\uDCCE")), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        marginTop: 1,
        width: "100%"
      }
    }, _miniBar(ps ? ps.drep.yes_pct : 0, _dt, "D", "#8b5cf6", false), _miniBar(ps ? ps.cc.yes_pct : 0, _ct, "C", "#f59e0b", !ccCanVote), _miniBar(spoYesPctOverride !== null ? spoYesPctOverride : ps ? ps.spo.yes_pct : 0, _st, "S", "#06b6d4", !spoCanVote)), (() => {
      // Determine status: explicit fields → voting threshold analysis → expiration
      let st = p.status || "";
      let epochInfo = "";
      if (p.enacted_epoch) {
        st = st || "enacted";
        epochInfo = `E${p.enacted_epoch}`;
      } else if (p.ratified_epoch) {
        st = st || "ratified";
        epochInfo = `E${p.ratified_epoch}`;
      } else if (p.dropped_epoch) {
        st = st || "dropped";
        epochInfo = `E${p.dropped_epoch}`;
      } else if (p.expired_epoch) {
        st = st || "expired";
        epochInfo = `E${p.expired_epoch}`;
      } else if (!st && p.expiration) {
        const curEp = govInfo && govInfo.protocolParams && govInfo.protocolParams.epoch || Math.floor((Date.now() - 1596059091000) / 432000000) + 208;
        const isExpired = p.expiration <= curEp;
        // Check threshold achievement from voting summary
        if (ps && _dt !== null) {
          const drepMet = (ps.drep.yes_pct || 0) / 100 >= _dt;
          const ccMet = !ccCanVote || (_ct !== null ? (ps.cc.yes_pct || 0) / 100 >= _ct : true);
          const spoYesPctForStatus = spoYesPctOverride !== null ? spoYesPctOverride : ps.spo.yes_pct || 0;
          const spoMet = !spoCanVote || spoAllAbstain || (_st !== null ? spoYesPctForStatus / 100 >= _st : true);
          const allMet = drepMet && ccMet && spoMet;
          if (isExpired) {
            st = allMet ? "ratified" : "expired";
          } else {
            st = allMet ? "passing" : "active";
          }
        } else {
          st = isExpired ? "expired" : "active";
        }
      }
      const stMap = {
        active: {
          label: T.summary_active || "Active",
          bg: "#3b82f620",
          color: "#60a5fa",
          border: "#3b82f640"
        },
        passing: {
          label: "Passing",
          bg: "#10b98120",
          color: "#34d399",
          border: "#10b98140"
        },
        ratified: {
          label: T.summary_ratified || "Ratified",
          bg: "#8b5cf620",
          color: "#a78bfa",
          border: "#8b5cf640"
        },
        enacted: {
          label: T.summary_enacted || "Enacted",
          bg: "#10b98120",
          color: "#34d399",
          border: "#10b98140"
        },
        expired: {
          label: T.summary_expired || "Expired",
          bg: "#6b728020",
          color: "#9ca3af",
          border: "#6b728040"
        },
        dropped: {
          label: T.summary_dropped || "Dropped",
          bg: "#ef444420",
          color: "#f87171",
          border: "#ef444440"
        }
      };
      const s = stMap[st] || (st ? {
        label: st,
        bg: "#6b728020",
        color: "#9ca3af",
        border: "#6b728040"
      } : null);
      return s ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 6,
          fontWeight: 700,
          padding: "1px 3px",
          borderRadius: 2,
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          lineHeight: 1.4,
          marginTop: 1,
          textTransform: "uppercase",
          letterSpacing: ".03em"
        },
        title: epochInfo ? `${s.label} at Epoch ${epochInfo.slice(1)}` : s.label
      }, s.label, epochInfo ? ` ${epochInfo}` : "") : null;
    })()));
  }))), /*#__PURE__*/React.createElement("tbody", null, pgD.map((d, ri) => {
    const bg = rowBg(ri);
    const share = totalStake > 0 ? Number(d.amount) / totalStake * 100 : 0;
    return /*#__PURE__*/React.createElement("tr", {
      key: d.drep_id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        position: "sticky",
        left: 0,
        zIndex: 10,
        background: bg,
        padding: `${sz(7)}px ${sz(8)}px`,
        borderBottom: "1px solid var(--border)",
        borderRight: "2px solid var(--border)",
        minWidth: sz(260),
        boxShadow: "4px 0 8px rgba(0,0,0,.3)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: sz(7)
      }
    }, zoom >= 70 && /*#__PURE__*/React.createElement(Avatar, {
      name: safeName(d.name) || d.drep_id,
      url: d.image_url
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: sz(11),
        fontWeight: 600,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: sz(150)
      }
    }, safeName(d.name) || shortId(d.drep_id)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: sz(10),
        color: "var(--text2)",
        display: "flex",
        gap: 5,
        flexWrap: "wrap",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      title: `${(Number(d.amount) / 1e6).toLocaleString()} ADA`
    }, "\u20B3 ", fmtAda(d.amount)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: sz(9),
        fontWeight: 600,
        color: share >= 5 ? "var(--accent2)" : share >= 1 ? "var(--text2)" : "var(--text2)",
        opacity: share >= 1 ? 1 : .7
      }
    }, share.toFixed(share >= 10 ? 1 : 2), "%"), zoom >= 80 && d.delegators > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: sz(9),
        opacity: .7
      }
    }, "(", d.delegators.toLocaleString(), " ", T.delegators, ")"))))), pgP.map((p, ci) => {
      const v = gv(d.drep_id, p.proposal_id);
      const rat = getDrepRat(d.drep_id, p.proposal_id);
      return /*#__PURE__*/React.createElement("td", {
        key: p.proposal_id || ci,
        style: {
          padding: 0,
          borderBottom: "1px solid var(--border)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "vote-cell",
        style: {
          padding: `${sz(3)}px ${sz(2)}px`,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          flexDirection: "row"
        },
        title: rat && rat.text ? rat.text.slice(0, 300) : undefined
      }, /*#__PURE__*/React.createElement(VoteBadge, {
        vote: v
      }), rat && rat.text && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 7,
          color: "var(--yes)",
          cursor: "pointer",
          lineHeight: 1
        },
        onClick: () => setRatModal({
          name: safeName(d.name) || shortId(d.drep_id),
          proposalTitle: p.title || shortId(p.proposal_id),
          text: rat.text,
          url: rat.url
        })
      }, "\uD83D\uDCCE")));
    }));
  }), pgD.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: pgP.length + 1,
    style: {
      padding: 40,
      textAlign: "center",
      color: "var(--text2)",
      fontSize: 13
    }
  }, T.no_dreps))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg3)",
      flexWrap: "wrap",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(PaginationBar, {
    label: T.subtitle_drep,
    page: dPage,
    setPage: handleDPageChange,
    total: hasMore ? tDP + 1 : tDP
  }), hasMore && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: loadMoreDreps,
    disabled: pageLoading,
    style: {
      fontSize: 10,
      padding: "3px 10px"
    }
  }, pageLoading ? "⏳" : "⬇", " ", T.load_more)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(PaginationBar, {
    label: T.subtitle_actions,
    page: pPage,
    setPage: setPPage,
    total: tPP
  }))))), (ccMembers || []).length > 0 && pgP.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: ccFull ? {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9998,
      background: "var(--bg)",
      padding: 12,
      display: "flex",
      flexDirection: "column"
    } : {}
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (ccOpen) setCcFull(false);
      setCcOpen(!ccOpen);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px 0",
      marginBottom: ccOpen ? 6 : 0,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text2)"
    }
  }, ccOpen ? "▼" : "▶"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)"
    }
  }, "\uD83C\uDFDB ", T.cc_section_title || "CC Votes", " (", (ccMembers || []).length, ")")), ccOpen && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setCcFull(!ccFull),
    style: {
      fontSize: 11,
      padding: "3px 10px",
      marginLeft: "auto",
      background: ccFull ? "var(--accent)" : "var(--bg3)",
      color: ccFull ? "#fff" : "var(--text)",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, ccFull ? "⊗ " + (T.close || "Close") : "⤢ " + (T.expand || "Expand"))), ccOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      background: "var(--bg2)",
      flex: ccFull ? 1 : undefined,
      display: ccFull ? "flex" : undefined,
      flexDirection: ccFull ? "column" : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ccScrollRef,
    onScroll: () => syncScroll(ccScrollRef, drepScrollRef, spoScrollRef),
    style: {
      overflow: "auto",
      maxHeight: ccFull ? "none" : drepOpen ? "calc(40vh - 60px)" : "calc(100vh - 300px)",
      flex: ccFull ? 1 : undefined
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "separate",
      borderSpacing: 0,
      width: "100%",
      minWidth: pgP.length * sz(70) + sz(260),
      fontSize: sz(14)
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      position: "sticky",
      left: 0,
      top: 0,
      zIndex: 30,
      background: "var(--bg3)",
      padding: `${sz(6)}px ${sz(8)}px`,
      textAlign: "left",
      borderBottom: "2px solid var(--border)",
      borderRight: "2px solid var(--border)",
      fontSize: sz(9),
      fontWeight: 700,
      color: "var(--text2)",
      minWidth: sz(260),
      boxShadow: "4px 0 8px rgba(0,0,0,.3)"
    }
  }, T.cc_member), pgP.map((p, i) => {
    const c = actionColor(p.proposal_type);
    const ccInelig = p.proposal_type === "NoConfidence";
    return /*#__PURE__*/React.createElement("th", {
      key: p.proposal_id || i,
      style: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: ccInelig ? "rgba(128,128,128,.1)" : "var(--bg3)",
        padding: "4px 2px",
        textAlign: "center",
        borderBottom: "2px solid var(--border)",
        fontSize: 8,
        fontWeight: 600,
        minWidth: sz(70),
        maxWidth: sz(90),
        opacity: ccInelig ? .35 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        padding: "1px 3px",
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: c + "15",
        color: c,
        border: `1px solid ${c}30`
      }
    }, actionLabel(p.proposal_type, T)));
  }))), /*#__PURE__*/React.createElement("tbody", null, (ccMembers || []).map((cc, ri) => {
    const bg = rowBg(ri);
    return /*#__PURE__*/React.createElement("tr", {
      key: cc.cc_id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        position: "sticky",
        left: 0,
        zIndex: 10,
        background: bg,
        padding: `${sz(5)}px ${sz(8)}px`,
        borderBottom: "1px solid var(--border)",
        borderRight: "2px solid var(--border)",
        boxShadow: "4px 0 8px rgba(0,0,0,.3)",
        fontSize: sz(11),
        fontWeight: 600,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: sz(180)
      }
    }, cc.name || shortId(cc.cc_id)), pgP.map((p, ci) => {
      const ccInelig = p.proposal_type === "NoConfidence";
      if (ccInelig) return /*#__PURE__*/React.createElement("td", {
        key: p.proposal_id || ci,
        style: {
          padding: 0,
          borderBottom: "1px solid var(--border)",
          background: "rgba(128,128,128,.06)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          fontSize: 8,
          color: "var(--text2)",
          opacity: .3
        }
      }, "\u2014"));
      const v = ccGv(cc.cc_id, p.proposal_id);
      const ratObj = ccGr(cc.cc_id, p.proposal_id);
      return /*#__PURE__*/React.createElement("td", {
        key: p.proposal_id || ci,
        style: {
          padding: 0,
          borderBottom: "1px solid var(--border)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "vote-cell",
        style: {
          padding: `${sz(3)}px ${sz(2)}px`,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          flexDirection: "row"
        }
      }, v === "Ineligible" ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 8,
          color: "var(--text2)"
        }
      }, "\u2014") : /*#__PURE__*/React.createElement(VoteBadge, {
        vote: v
      }), ratObj && /*#__PURE__*/React.createElement("a", {
        href: "#",
        style: {
          fontSize: 7,
          color: ratObj.text ? "var(--yes)" : "var(--accent2)",
          lineHeight: 1
        },
        onClick: e => {
          e.preventDefault();
          setCcRatModal({
            ccName: cc.name || cc.cc_id,
            proposalTitle: p.title || shortId(p.proposal_id),
            url: ratObj.url || "",
            text: ratObj.text || T.cc_rationale_error,
            loading: false
          });
        }
      }, "\uD83D\uDCCE")));
    }));
  }))))))), pgP.length > 0 && Object.keys(spoPoolInfo || {}).length > 0 && (() => {
    const SPO_INELIGIBLE_TYPES = ["TreasuryWithdrawals", "NewConstitution"];
    // For ParameterChange, detect non-security-group proposals (SPOs can only vote on security group)
    const isSpoIneligible = proposal => {
      if (SPO_INELIGIBLE_TYPES.includes(proposal.proposal_type)) return true;
      if (proposal.proposal_type === "ParameterChange" && govInfo && govInfo.proposalSummaries) {
        const ps = govInfo.proposalSummaries[proposal.proposal_id];
        if (ps) {
          const total = (ps.spo.yes_votes_cast || 0) + (ps.spo.no_votes_cast || 0) + (ps.spo.abstain_votes_cast || 0);
          const pct = (ps.spo.yes_pct || 0) + (ps.spo.no_pct || 0);
          if (total === 0 && pct === 0) return true;
        }
      }
      return false;
    };
    const spoPerPage = 100;
    const toggleSpoSort = key => {
      if (spoSortKey === key) setSpoSortDir(d => d === "asc" ? "desc" : "asc");else {
        setSpoSortKey(key);
        setSpoSortDir(key === "ticker" ? "asc" : "desc");
      }
      setSpoPage(0);
    };
    const spoSortArrow = key => spoSortKey === key ? spoSortDir === "asc" ? " ▲" : " ▼" : "";
    function getSpoEffVote(pool, proposal) {
      const explicit = pool.votes[proposal.proposal_id];
      if (explicit) return {
        vote: explicit,
        type: "explicit"
      };
      if (isSpoIneligible(proposal)) return {
        vote: "Ineligible",
        type: "ineligible"
      };
      if (proposal.proposal_type === "HardForkInitiation") return {
        vote: "NotVoted",
        type: "none"
      };
      if (pool.isAutoAbstain) return {
        vote: "Abstain",
        type: "auto"
      };
      if (pool.isAutoNoConf) {
        return proposal.proposal_type === "NoConfidence" ? {
          vote: "Yes",
          type: "auto"
        } : {
          vote: "Abstain",
          type: "auto"
        };
      }
      if (pool.pledge_drep) return {
        vote: "NotVoted",
        type: "delegated"
      };
      return {
        vote: "NotVoted",
        type: "none"
      };
    }
    const poolIds = new Set();
    Object.keys(spoVotes || {}).forEach(k => poolIds.add(k.split("__")[0]));
    Object.keys(spoPoolInfo || {}).forEach(id => poolIds.add(id));
    const allPools = [...poolIds].map(poolId => {
      const info = (spoPoolInfo || {})[poolId] || {};
      const votes = {};
      let voteCount = 0;
      pgP.forEach(p => {
        const v = (spoVotes || {})[`${poolId}__${p.proposal_id}`];
        if (v) {
          votes[p.proposal_id] = v;
          voteCount++;
        }
      });
      return {
        pool_id: poolId,
        ticker: info.ticker || "",
        pledge_drep: info.pledge_drep || null,
        active_stake: info.active_stake || "0",
        votes,
        voteCount,
        isAutoAbstain: info.pledge_drep === "drep_always_abstain",
        isAutoNoConf: info.pledge_drep === "drep_always_no_confidence"
      };
    });
    let spoList = [...allPools];
    if (spoSearchQ) {
      const q = spoSearchQ.toLowerCase();
      spoList = spoList.filter(p => p.ticker && p.ticker.toLowerCase().includes(q) || p.pool_id.toLowerCase().includes(q));
    }
    if (spoFilter === "voted") spoList = spoList.filter(p => p.voteCount > 0);else if (spoFilter === "not_voted") spoList = spoList.filter(p => p.voteCount === 0);else if (spoFilter === "auto_abstain") spoList = spoList.filter(p => p.isAutoAbstain);else if (spoFilter === "auto_nc") spoList = spoList.filter(p => p.isAutoNoConf);
    if (spoDrepFilter === "auto_abstain") spoList = spoList.filter(p => p.isAutoAbstain);else if (spoDrepFilter === "auto_nc") spoList = spoList.filter(p => p.isAutoNoConf);else if (spoDrepFilter === "custom_drep") spoList = spoList.filter(p => p.pledge_drep && !p.isAutoAbstain && !p.isAutoNoConf);
    if (spoGaFilter) {
      const gaProp = pgP.find(p => p.proposal_id === spoGaFilter);
      if (gaProp) spoList = spoList.filter(pool => {
        const ev = getSpoEffVote(pool, gaProp);
        if (spoGaVoteFilter === "not_voted") return ev.vote === "NotVoted";
        if (spoGaVoteFilter === "yes") return ev.vote === "Yes";
        if (spoGaVoteFilter === "no") return ev.vote === "No";
        if (spoGaVoteFilter === "abstain") return ev.vote === "Abstain";
        return true;
      });
    }
    const dir = spoSortDir === "asc" ? 1 : -1;
    spoList.sort((a, b) => {
      if (spoSortKey === "stake") return dir * (Number(a.active_stake) - Number(b.active_stake));
      if (spoSortKey === "ticker") return dir * (a.ticker || a.pool_id).localeCompare(b.ticker || b.pool_id);
      if (spoSortKey === "votes") return dir * (a.voteCount - b.voteCount);
      return 0;
    });
    const spoPageData = spoList.slice(spoPage * spoPerPage, (spoPage + 1) * spoPerPage);
    const spoTotalPages = Math.max(1, Math.ceil(spoList.length / spoPerPage));
    const fmtStake = fmtStakeShort;
    const spoFBtnS = active => ({
      fontSize: 8,
      padding: "2px 6px",
      borderRadius: 4,
      cursor: "pointer",
      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
      background: active ? "rgba(59,130,246,.12)" : "var(--bg)",
      color: active ? "var(--accent)" : "var(--text2)"
    });
    return /*#__PURE__*/React.createElement("div", {
      style: spoFull ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        background: "var(--bg)",
        padding: 12,
        display: "flex",
        flexDirection: "column"
      } : {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (spoOpen) setSpoFull(false);
        setSpoOpen(!spoOpen);
      },
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 0",
        marginBottom: spoOpen ? 6 : 0,
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--text2)"
      }
    }, spoOpen ? "▼" : "▶"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "var(--accent2)"
      }
    }, "\uD83C\uDFCA ", T.tab_spo, " (", spoList.length.toLocaleString(), ")")), spoOpen && /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => setSpoFull(!spoFull),
      style: {
        fontSize: 11,
        padding: "3px 10px",
        marginLeft: "auto",
        background: spoFull ? "var(--accent)" : "var(--bg3)",
        color: spoFull ? "#fff" : "var(--text)",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, spoFull ? "⊗ " + (T.close || "Close") : "⤢ " + (T.expand || "Expand"))), spoOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 6,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, [["all", T.spo_filter_all], ["voted", T.spo_filter_voted], ["not_voted", T.spo_filter_not_voted]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => {
        setSpoFilter(k);
        setSpoPage(0);
      },
      style: spoFBtnS(spoFilter === k)
    }, label))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: "var(--text2)",
        margin: "0 2px"
      }
    }, "|"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: "var(--text2)"
      }
    }, "DRep:"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, [["all", "All"], ["auto_abstain", "Auto-Abstain"], ["auto_nc", "Auto-NC"], ["custom_drep", "DRep委任"]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => {
        setSpoDrepFilter(k);
        setSpoPage(0);
      },
      style: spoFBtnS(spoDrepFilter === k)
    }, label))), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Search\u2026",
      value: spoSearchQ,
      onChange: e => {
        setSpoSearchQ(e.target.value);
        setSpoPage(0);
      },
      style: {
        padding: "2px 5px",
        borderRadius: 4,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text)",
        fontSize: 9,
        width: 100,
        outline: "none"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: "var(--text2)",
        margin: "0 2px"
      }
    }, "|"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: "var(--text2)"
      }
    }, "GA:"), /*#__PURE__*/React.createElement("select", {
      value: spoGaFilter,
      onChange: e => {
        setSpoGaFilter(e.target.value);
        setSpoPage(0);
      },
      style: {
        fontSize: 8,
        padding: "1px 3px",
        borderRadius: 4,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text)",
        maxWidth: 150
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014"), pgP.filter(p => !isSpoIneligible(p)).map(p => /*#__PURE__*/React.createElement("option", {
      key: p.proposal_id,
      value: p.proposal_id
    }, "[", (p.proposal_type || "").replace("Initiation", "").replace("Withdrawals", ""), "] ", (p.title || shortId(p.proposal_id)).slice(0, 25)))), spoGaFilter && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, [["not_voted", "Not Voted"], ["yes", "Yes"], ["no", "No"], ["abstain", "Abstain"]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => {
        setSpoGaVoteFilter(k);
        setSpoPage(0);
      },
      style: spoFBtnS(spoGaVoteFilter === k)
    }, label)))), /*#__PURE__*/React.createElement("div", {
      style: {
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--bg2)",
        flex: spoFull ? 1 : undefined,
        display: spoFull ? "flex" : undefined,
        flexDirection: spoFull ? "column" : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      ref: spoScrollRef,
      onScroll: () => syncScroll(spoScrollRef, drepScrollRef, ccScrollRef),
      style: {
        overflow: "auto",
        maxHeight: spoFull ? "none" : "calc(40vh - 60px)",
        flex: spoFull ? 1 : undefined
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        borderCollapse: "separate",
        borderSpacing: 0,
        width: "100%",
        minWidth: pgP.length * sz(70) + sz(260),
        fontSize: sz(14)
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        position: "sticky",
        left: 0,
        top: 0,
        zIndex: 30,
        background: "var(--bg3)",
        padding: `${sz(6)}px ${sz(8)}px`,
        textAlign: "left",
        borderBottom: "2px solid var(--border)",
        borderRight: "2px solid var(--border)",
        fontSize: sz(9),
        fontWeight: 700,
        color: "var(--text2)",
        minWidth: sz(260),
        boxShadow: "4px 0 8px rgba(0,0,0,.3)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      onClick: () => toggleSpoSort("ticker"),
      style: {
        cursor: "pointer"
      }
    }, T.spo_ticker, spoSortArrow("ticker")), /*#__PURE__*/React.createElement("span", {
      onClick: () => toggleSpoSort("stake"),
      style: {
        cursor: "pointer",
        fontSize: 7,
        marginLeft: 6,
        fontWeight: 400,
        padding: "1px 3px",
        borderRadius: 3,
        background: spoSortKey === "stake" ? "rgba(59,130,246,.15)" : "transparent"
      }
    }, T.spo_stake, spoSortArrow("stake"))), pgP.map((p, i) => {
      const c = actionColor(p.proposal_type);
      const inelig = isSpoIneligible(p);
      return /*#__PURE__*/React.createElement("th", {
        key: p.proposal_id || i,
        style: {
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: inelig ? "rgba(128,128,128,.1)" : "var(--bg3)",
          padding: "4px 2px",
          textAlign: "center",
          borderBottom: "2px solid var(--border)",
          fontSize: 8,
          fontWeight: 600,
          minWidth: sz(70),
          maxWidth: sz(90),
          opacity: inelig ? .35 : 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: "inline-block",
          padding: "1px 3px",
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          background: c + "15",
          color: c,
          border: `1px solid ${c}30`
        }
      }, actionLabel(p.proposal_type, T)));
    }))), /*#__PURE__*/React.createElement("tbody", null, spoPageData.map((pool, ri) => {
      const bg = rowBg(ri);
      return /*#__PURE__*/React.createElement("tr", {
        key: pool.pool_id
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          position: "sticky",
          left: 0,
          zIndex: 10,
          background: bg,
          padding: `${sz(5)}px ${sz(8)}px`,
          borderBottom: "1px solid var(--border)",
          borderRight: "2px solid var(--border)",
          boxShadow: "4px 0 8px rgba(0,0,0,.3)",
          fontSize: sz(11),
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: sz(180)
        },
        title: pool.pool_id
      }, /*#__PURE__*/React.createElement("span", null, pool.ticker || shortId(pool.pool_id)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: sz(8),
          color: "var(--text2)",
          marginLeft: 6
        },
        title: `${Math.round(Number(pool.active_stake) / 1e6).toLocaleString()} ADA`
      }, fmtStake(pool.active_stake)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: sz(8),
          marginLeft: 4,
          padding: pool.isAutoAbstain || pool.isAutoNoConf ? "1px 4px" : "0 2px",
          borderRadius: 4,
          background: pool.isAutoAbstain ? "rgba(251,191,36,0.18)" : pool.isAutoNoConf ? "rgba(220,38,38,0.18)" : "transparent",
          color: pool.isAutoAbstain ? "#fbbf24" : pool.isAutoNoConf ? "#ef4444" : pool.pledge_drep ? "var(--text2)" : "transparent",
          fontWeight: 700,
          letterSpacing: 0.3
        }
      }, pool.isAutoAbstain ? "Auto-Abstain" : pool.isAutoNoConf ? "Auto-NC" : pool.pledge_drep ? "DRep" : "−")), pgP.map((p, ci) => {
        const inelig = isSpoIneligible(p);
        if (inelig) return /*#__PURE__*/React.createElement("td", {
          key: p.proposal_id || ci,
          style: {
            padding: 0,
            borderBottom: "1px solid var(--border)",
            background: "rgba(128,128,128,.06)"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            textAlign: "center",
            fontSize: 8,
            color: "var(--text2)",
            opacity: .3
          }
        }, "\u2014"));
        const ev = getSpoEffVote(pool, p);
        const isAuto = ev.type === "auto";
        return /*#__PURE__*/React.createElement("td", {
          key: p.proposal_id || ci,
          style: {
            padding: 0,
            borderBottom: "1px solid var(--border)"
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "vote-cell",
          style: {
            padding: `${sz(3)}px ${sz(2)}px`,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }
        }, /*#__PURE__*/React.createElement(VoteBadge, {
          vote: ev.vote
        }), isAuto && /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 6,
            opacity: .5
          }
        }, "*")));
      }));
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg3)"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      disabled: spoPage === 0,
      onClick: () => setSpoPage(spoPage - 1),
      style: {
        padding: "1px 6px",
        fontSize: 9,
        opacity: spoPage === 0 ? .3 : 1
      }
    }, "\u2190"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9
      }
    }, spoPage + 1, " / ", spoTotalPages), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      disabled: spoPage >= spoTotalPages - 1,
      onClick: () => setSpoPage(spoPage + 1),
      style: {
        padding: "1px 6px",
        fontSize: 9,
        opacity: spoPage >= spoTotalPages - 1 ? .3 : 1
      }
    }, "\u2192")))));
  })(), /*#__PURE__*/React.createElement(RationaleModal, {
    modal: ccRatModal ? {
      name: ccRatModal.ccName,
      proposalTitle: ccRatModal.proposalTitle,
      text: ccRatModal.text,
      url: ccRatModal.url
    } : null,
    onClose: () => setCcRatModal(null),
    T: T
  }), /*#__PURE__*/React.createElement(RationaleModal, {
    modal: ratModal ? {
      ...ratModal,
      onDownload: ratModal.text ? () => {
        const blob = new Blob([ratModal.text], {
          type: "text/plain"
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `rationale_${ratModal.name}_${(ratModal.proposalTitle || "").slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
      } : null
    } : null,
    onClose: () => setRatModal(null),
    T: T
  }), govInfo && govInfo.protocolParams && React.createElement(VoteReminderSection, {
    govInfo,
    T,
    dreps,
    votes,
    proposals,
    ccMembers,
    ccVotes,
    spoVotes,
    spoPoolInfo,
    pp: govInfo.protocolParams
  }));
}

// Stake History Tab — DRep stake distribution over time
// ════════════════════════════════════════════════════════════════

// Entity merge rules: group DReps that belong to same entity
const ENTITY_MERGES = {
  "Yoroi + EMURGO": d => d.name && (d.name.includes("Yoroi") || d.name === "EMURGO")
};

// Filter out auto-mechanism DReps and inactive from history snapshots
function sanitizeHistory(history) {
  return history.map(s => {
    const filtered = (s.top || []).filter(d => d.id !== "drep_always_abstain" && Number(d.amount) > 0);
    const hadAbstain = (s.top || []).find(d => d.id === "drep_always_abstain");
    const totalRaw = Number(s.total_stake);
    const abstainAmt = hadAbstain ? Number(hadAbstain.amount) : 0;
    const inactiveAmt = (s.top || []).filter(d => d.id !== "drep_always_abstain" && Number(d.amount) <= 0).reduce((sum, d) => sum + Number(d.amount), 0);
    return {
      ...s,
      top: filtered,
      total_stake: String(totalRaw - abstainAmt - inactiveAmt),
      drep_count: filtered.length
    };
  });
}
function StakeHistoryTab({
  history: rawHistory,
  liveDreps,
  T,
  lang,
  govInfo
}) {
  // Merge: sanitize stored history + append live DRep snapshot if newer
  const history = React.useMemo(() => {
    const base = sanitizeHistory(rawHistory);
    if (!liveDreps || liveDreps.length === 0) return base;
    // Build live snapshot from current dreps data
    const active = liveDreps.filter(d => d.drep_id !== "drep_always_abstain" && Number(d.amount) > 0);
    if (active.length === 0) return base;
    const top50 = active.slice(0, 50).map(d => ({
      id: d.drep_id,
      name: d.name,
      amount: d.amount,
      delegators: d.delegators
    }));
    const totalStake = active.reduce((s, d) => s + Number(d.amount), 0);
    const currentEpoch = currentEpochNow();
    // Only add if we don't already have this epoch
    const lastEpoch = base.length > 0 ? base[base.length - 1].epoch : 0;
    if (currentEpoch > lastEpoch) {
      base.push({
        epoch: currentEpoch,
        timestamp: Date.now(),
        total_stake: String(totalStake),
        drep_count: active.length,
        top: top50,
        live: true
      });
    }
    return base;
  }, [rawHistory, liveDreps]);
  const [topN, setTopN] = useHashState("h_topN", 10);
  const [chartMode, setChartMode] = useHashState("h_mode", "ada"); // "ada" | "pct"
  const [mergeEntities, setMergeEntities] = useHashState("h_merge", false);
  const [projEpochs, setProjEpochs] = useHashState("h_proj", 36); // default: 36 epochs ≈ 6 months forecast
  const [projWindow, setProjWindow] = useHashState("h_projW", 5); // how many recent epochs to use for trend
  const [displayRange, setDisplayRange] = useHashState("h_range", "all"); // "1m" | "3m" | "6m" | "1y" | "2y" | "all"
  const stackedRef = React.useRef(null);
  const stackedCanvasRef = React.useRef(null);
  const concRef = React.useRef(null);
  const concCanvasRef = React.useRef(null);
  const COLORS = ["#3b82f6", "#f87171", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6", "#4ade80", "#e879f9", "#facc15", "#2dd4bf", "#818cf8", "#fb7185", "#22d3ee", "#a3e635", "#c084fc", "#f97316", "#67e8f9", "#d946ef"];

  // Filter history by display range
  const rangedHistory = React.useMemo(() => {
    if (displayRange === "all" || history.length === 0) return history;
    const rangeMs = {
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
      "2y": 730
    };
    const days = rangeMs[displayRange] || Infinity;
    const cutoff = Date.now() - days * 86400000;
    const filtered = history.filter(s => {
      const ts = s.timestamp || epochToTimestamp(s.epoch) * 1000;
      return ts >= cutoff;
    });
    return filtered.length > 0 ? filtered : history.slice(-1); // at least 1 point
  }, [history, displayRange]);

  // Process history: optionally merge entities
  const processedHistory = React.useMemo(() => {
    if (!mergeEntities) return rangedHistory;
    return rangedHistory.map(s => {
      const top = [...(s.top || [])];
      // For each merge rule, combine matching DReps
      Object.entries(ENTITY_MERGES).forEach(([name, matchFn]) => {
        const matching = top.filter(matchFn);
        if (matching.length <= 1) return;
        const mergedAmount = matching.reduce((sum, d) => sum + Number(d.amount), 0);
        const mergedDelegators = matching.reduce((sum, d) => sum + (d.delegators || 0), 0);
        const ids = matching.map(d => d.id);
        // Remove all matching
        for (let i = top.length - 1; i >= 0; i--) {
          if (ids.includes(top[i].id)) top.splice(i, 1);
        }
        // Add merged entry
        top.push({
          id: "merged__" + name,
          name,
          amount: String(mergedAmount),
          delegators: mergedDelegators
        });
      });
      top.sort((a, b) => Number(b.amount) - Number(a.amount));
      return {
        ...s,
        top
      };
    });
  }, [rangedHistory, mergeEntities]);

  // Identify top N DReps by latest snapshot — sorted by stake descending
  const topDreps = React.useMemo(() => {
    if (processedHistory.length === 0) return [];
    const latest = processedHistory[processedHistory.length - 1];
    return (latest.top || []).slice(0, topN).map((d, i) => ({
      id: d.id,
      name: d.name || d.id.slice(0, 16) + "…",
      color: COLORS[i % COLORS.length]
    }));
  }, [processedHistory, topN]);

  // Simple trend projection: average per-epoch change over recent 'window' points, extended forward
  function simpleProject(ys, window, offset) {
    const w = Math.min(window, ys.length);
    const recent = ys.slice(-w);
    const n = recent.length;
    if (n < 2) return recent[n - 1] || 0;
    const avgChange = (recent[n - 1] - recent[0]) / (n - 1);
    return recent[n - 1] + avgChange * offset;
  }
  const labels = React.useMemo(() => {
    const base = processedHistory.map(s => {
      const ts = s.timestamp || epochToTimestamp(s.epoch) * 1000;
      const d = new Date(ts);
      return `E${s.epoch} (${d.getMonth() + 1}/${d.getDate()})`;
    });
    if (projEpochs > 0 && processedHistory.length > 0) {
      const lastEpoch = processedHistory[processedHistory.length - 1].epoch;
      for (let j = 1; j <= projEpochs; j++) {
        const fe = lastEpoch + j * 2;
        const ts = epochToTimestamp(fe) * 1000;
        const d = new Date(ts);
        base.push(`E${fe} (${d.getMonth() + 1}/${d.getDate()}) ⟶`);
      }
    }
    return base;
  }, [processedHistory, projEpochs]);

  // Stacked area chart — ADA or %, reversed order so largest on top
  React.useEffect(() => {
    if (!stackedCanvasRef.current || processedHistory.length === 0 || topDreps.length === 0 || typeof Chart === "undefined") return;
    if (stackedRef.current) stackedRef.current.destroy();
    const isPct = chartMode === "pct";
    const nHist = processedHistory.length;
    const nProj = projEpochs;

    // Always compute projections in ADA first, then convert to % if needed
    const reversedDreps = [...topDreps].reverse();

    // Step 1: Build ADA series + ADA projections for each DRep
    const adaSeries = {}; // drep.id → [ada values including proj]
    reversedDreps.forEach(drep => {
      const adaHist = processedHistory.map(s => {
        const found = (s.top || []).find(d => d.id === drep.id);
        return found ? Math.round(Number(found.amount) / 1e6) : 0;
      });
      const proj = [];
      if (nProj > 0) {
        for (let j = 1; j <= nProj; j++) proj.push(Math.max(0, Math.round(simpleProject(adaHist, projWindow, j))));
      }
      adaSeries[drep.id] = [...adaHist, ...proj];
    });

    // Others ADA series
    const othersAdaHist = processedHistory.map(s => {
      const topSum = topDreps.reduce((sum, drep) => {
        const found = (s.top || []).find(d => d.id === drep.id);
        return sum + (found ? Number(found.amount) : 0);
      }, 0);
      return Math.round((Number(s.total_stake) - topSum) / 1e6);
    });
    const othersProj = [];
    if (nProj > 0) {
      for (let j = 1; j <= nProj; j++) othersProj.push(Math.max(0, Math.round(simpleProject(othersAdaHist, projWindow, j))));
    }
    const othersAda = [...othersAdaHist, ...othersProj];

    // Step 2: If % mode, compute totals per point then convert
    const toDisplay = (adaArr, allAdaArrays) => {
      if (!isPct) return adaArr;
      return adaArr.map((v, i) => {
        const total = allAdaArrays.reduce((s, a) => s + (a[i] || 0), 0);
        return total > 0 ? v / total * 100 : 0;
      });
    };
    const allArrays = [...reversedDreps.map(d => adaSeries[d.id]), othersAda];
    const datasets = reversedDreps.map(drep => ({
      label: drep.name,
      data: toDisplay(adaSeries[drep.id], allArrays),
      backgroundColor: drep.color + "cc",
      borderColor: drep.color,
      borderWidth: 1,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      segment: nProj > 0 ? {
        borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
      } : undefined
    }));

    // Others goes first (bottom of stack) since we reversed the order
    datasets.unshift({
      label: lang === "ja" ? "その他" : "Others",
      data: toDisplay(othersAda, allArrays),
      backgroundColor: "rgba(75,85,99,0.5)",
      borderColor: "#4b5563",
      borderWidth: 1,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      segment: nProj > 0 ? {
        borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
      } : undefined
    });

    // Projection boundary annotation
    const projLine = nProj > 0 ? [{
      type: "line",
      xMin: nHist - 0.5,
      xMax: nHist - 0.5,
      borderColor: "rgba(255,255,255,0.3)",
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: lang === "ja" ? "予測→" : "Projection→",
        position: "start",
        color: "#8692ab",
        font: {
          size: 10
        }
      }
    }] : [];
    stackedRef.current = new Chart(stackedCanvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: "#e8ecf4",
              font: {
                size: 10
              },
              boxWidth: 12,
              padding: 8
            },
            position: "bottom",
            maxHeight: 80,
            // Reverse legend order so largest is first
            reverse: true
          },
          title: {
            display: true,
            text: isPct ? lang === "ja" ? "DRepステーク割合推移 (%)" : "DRep Stake Share Over Time (%)" : (lang === "ja" ? "DRepステーク推移 (ADA)" : "DRep Stake Over Time (ADA)") + (nProj > 0 ? lang === "ja" ? " + 予測" : " + Projection" : ""),
            color: "#e8ecf4",
            font: {
              size: 14
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                const isProj = ctx.dataIndex >= nHist;
                const prefix = isProj ? "📈 " : "";
                return isPct ? `${prefix}${ctx.dataset.label}: ${v.toFixed(2)}%` : `${prefix}${ctx.dataset.label}: ${v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : v} ADA`;
              }
            }
          },
          annotation: projLine.length > 0 ? {
            annotations: {
              projLine: projLine[0]
            }
          } : undefined
        },
        scales: {
          x: {
            ticks: {
              color: "#8692ab",
              maxRotation: 45,
              font: {
                size: 10
              }
            },
            grid: {
              color: "#262f42"
            }
          },
          y: {
            stacked: true,
            ticks: {
              color: "#8692ab",
              callback: v => isPct ? v.toFixed(0) + "%" : v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(0) + "M" : v
            },
            grid: {
              color: "#262f42"
            },
            title: {
              display: true,
              text: isPct ? "%" : "ADA",
              color: "#8692ab"
            },
            max: isPct ? 100 : undefined
          }
        }
      }
    });
    return () => {
      if (stackedRef.current) stackedRef.current.destroy();
    };
  }, [processedHistory, topDreps, chartMode, projEpochs, projWindow, lang, labels]);

  // Concentration chart (top 1/3/5/10 share %)
  React.useEffect(() => {
    if (!concCanvasRef.current || processedHistory.length === 0 || typeof Chart === "undefined") return;
    if (concRef.current) concRef.current.destroy();
    const nHist = processedHistory.length;
    const makeShareData = n => {
      // Project in ADA, then convert to %
      const adaTopHist = processedHistory.map(s => Math.round((s.top || []).slice(0, n).reduce((sum, d) => sum + Number(d.amount), 0) / 1e6));
      const adaTotalHist = processedHistory.map(s => Math.round(Number(s.total_stake) / 1e6));
      let adaTop = [...adaTopHist],
        adaTotal = [...adaTotalHist];
      if (projEpochs > 0) {
        for (let j = 1; j <= projEpochs; j++) {
          adaTop.push(Math.max(0, Math.round(simpleProject(adaTopHist, projWindow, j))));
          adaTotal.push(Math.max(1, Math.round(simpleProject(adaTotalHist, projWindow, j))));
        }
      }
      return adaTop.map((v, i) => adaTotal[i] > 0 ? v / adaTotal[i] * 100 : 0);
    };
    concRef.current = new Chart(concCanvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Top 1",
          data: makeShareData(1),
          borderColor: "#f87171",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          segment: projEpochs > 0 ? {
            borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
          } : undefined
        }, {
          label: "Top 3",
          data: makeShareData(3),
          borderColor: "#fbbf24",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          segment: projEpochs > 0 ? {
            borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
          } : undefined
        }, {
          label: "Top 5",
          data: makeShareData(5),
          borderColor: "#3b82f6",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          segment: projEpochs > 0 ? {
            borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
          } : undefined
        }, {
          label: "Top 10",
          data: makeShareData(10),
          borderColor: "#34d399",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          segment: projEpochs > 0 ? {
            borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
          } : undefined
        }, {
          label: "Top 20",
          data: makeShareData(20),
          borderColor: "#a78bfa",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          segment: projEpochs > 0 ? {
            borderDash: ctx => ctx.p0DataIndex >= nHist - 1 ? [4, 4] : undefined
          } : undefined
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#e8ecf4",
              font: {
                size: 11
              }
            },
            position: "bottom"
          },
          title: {
            display: true,
            text: (lang === "ja" ? "ステーク集中度（上位N DRepの占有率 %）" : "Stake Concentration (Top N DRep Share %)") + (projEpochs > 0 ? lang === "ja" ? " + 予測" : " + Projection" : ""),
            color: "#e8ecf4",
            font: {
              size: 14
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const isProj = ctx.dataIndex >= nHist;
                return `${isProj ? "📈 " : ""}${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#8692ab",
              maxRotation: 45,
              font: {
                size: 10
              }
            },
            grid: {
              color: "#262f42"
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: "#8692ab",
              callback: v => v + "%"
            },
            grid: {
              color: "#262f42"
            },
            title: {
              display: true,
              text: lang === "ja" ? "占有率 (%)" : "Share (%)",
              color: "#8692ab"
            }
          }
        }
      }
    });
    return () => {
      if (concRef.current) concRef.current.destroy();
    };
  }, [processedHistory, projEpochs, projWindow, lang, labels]);
  if (history.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 32,
        textAlign: "center",
        color: "var(--text2)"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 16,
        marginBottom: 8
      }
    }, T.hist_no_data));
  }
  const fmtDate = ts => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Distribution table
  const latest = processedHistory[processedHistory.length - 1];
  const first = processedHistory[0];
  const totalLatest = Number(latest.total_stake);
  const totalFirst = Number(first.total_stake);
  const distRows = (latest.top || []).slice(0, Math.max(topN, 20)).map((d, i) => {
    const pctNow = totalLatest > 0 ? Number(d.amount) / totalLatest * 100 : 0;
    const prev = (first.top || []).find(fd => fd.id === d.id);
    const pctPrev = prev && totalFirst > 0 ? Number(prev.amount) / totalFirst * 100 : null;
    const adaChange = prev ? (Number(d.amount) - Number(prev.amount)) / 1e6 : null;
    const pctChange = pctPrev !== null ? pctNow - pctPrev : null;
    return {
      rank: i + 1,
      name: d.name || d.id.slice(0, 16) + "…",
      id: d.id,
      amount: d.amount,
      pctNow,
      pctPrev,
      adaChange,
      pctChange,
      delegators: d.delegators
    };
  });
  const btnStyle = active => ({
    fontSize: 11,
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
    background: active ? "var(--accent)" : "var(--bg3)",
    color: active ? "#fff" : "var(--text2)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400
  });
  const toggleStyle = active => ({
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid " + (active ? "#fbbf24" : "var(--border)"),
    background: active ? "rgba(251,191,36,0.15)" : "var(--bg3)",
    color: active ? "#fbbf24" : "var(--text2)",
    cursor: "pointer"
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "16px 20px",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 4
    }
  }, T.hist_title), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text2)",
      fontSize: 13,
      margin: 0
    }
  }, T.hist_desc, " (", history.length, " ", T.hist_snapshots, ": E", history[0].epoch, "\u2013E", history[history.length - 1].epoch, ")", history[history.length - 1].live && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      padding: "1px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      background: "rgba(52,211,153,0.15)",
      color: "var(--yes)",
      border: "1px solid rgba(52,211,153,0.3)"
    }
  }, "LIVE"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "12px 20px",
      marginBottom: 12,
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, lang === "ja" ? "期間:" : "Range:"), [["1m", "1M"], ["3m", "3M"], ["6m", "6M"], ["1y", "1Y"], ["2y", "2Y"], ["all", lang === "ja" ? "全期間" : "All"]].map(([val, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: val,
    onClick: () => setDisplayRange(val),
    style: btnStyle(displayRange === val)
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setChartMode("ada"),
    style: btnStyle(chartMode === "ada")
  }, "ADA"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setChartMode("pct"),
    style: btnStyle(chartMode === "pct")
  }, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, "Top N:"), /*#__PURE__*/React.createElement("select", {
    value: topN,
    onChange: e => setTopN(Number(e.target.value)),
    style: {
      ...INPUT_STYLE,
      width: 55,
      padding: "3px 6px"
    }
  }, [5, 10, 15, 20].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMergeEntities(!mergeEntities),
    style: toggleStyle(mergeEntities)
  }, mergeEntities ? "✓ " : "", lang === "ja" ? "Yoroi+EMURGO 統合" : "Merge Yoroi+EMURGO"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, lang === "ja" ? "予測:" : "Forecast:"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 220,
    step: 1,
    value: projEpochs,
    onChange: e => setProjEpochs(Number(e.target.value)),
    style: {
      width: 120,
      accentColor: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: projEpochs > 0 ? "var(--accent2)" : "var(--text2)",
      minWidth: 70
    }
  }, projEpochs > 0 ? (() => {
    const days = Math.round(projEpochs * 5);
    return days >= 365 ? `+${(days / 365).toFixed(1)}${lang === "ja" ? "年" : "y"}` : days >= 30 ? `+${Math.round(days / 30)}${lang === "ja" ? "ヶ月" : "mo"}` : `+${days}${lang === "ja" ? "日" : "d"}`;
  })() + ` (${projEpochs}ep)` : "OFF")), projEpochs > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, lang === "ja" ? "基準:" : "Basis:"), /*#__PURE__*/React.createElement("select", {
    value: projWindow,
    onChange: e => setProjWindow(Number(e.target.value)),
    style: {
      ...INPUT_STYLE,
      width: 75,
      padding: "3px 6px"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: 3
  }, lang === "ja" ? "直近3" : "Last 3"), /*#__PURE__*/React.createElement("option", {
    value: 5
  }, lang === "ja" ? "直近5" : "Last 5"), /*#__PURE__*/React.createElement("option", {
    value: 10
  }, lang === "ja" ? "直近10" : "Last 10"), /*#__PURE__*/React.createElement("option", {
    value: 999
  }, lang === "ja" ? "全期間" : "All")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text2)"
    }
  }, "ep")))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "16px 20px",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 420,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: stackedCanvasRef
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "16px 20px",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 300,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: concCanvasRef
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "16px 20px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      marginBottom: 4
    }
  }, lang === "ja" ? `ステーク分布（最新 E${latest.epoch} vs 初回 E${first.epoch}）` : `Stake Distribution (Latest E${latest.epoch} vs First E${first.epoch})`), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "var(--text2)",
      marginBottom: 10
    }
  }, lang === "ja" ? `総ステーク: ${fmtAda(latest.total_stake)} ADA / DRep数: ${latest.drep_count}` : `Total: ${fmtAda(latest.total_stake)} ADA / DReps: ${latest.drep_count}`, mergeEntities && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      color: "#fbbf24"
    }
  }, "(", lang === "ja" ? "エンティティ統合表示" : "Entities merged", ")")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: "2px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "center",
      padding: "6px 6px",
      color: "var(--text2)",
      width: 30
    }
  }, "#"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "left",
      padding: "6px 8px",
      color: "var(--text2)"
    }
  }, lang === "ja" ? "DRep名" : "DRep"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right",
      padding: "6px 8px",
      color: "var(--text2)"
    }
  }, lang === "ja" ? "ステーク(ADA)" : "Stake (ADA)"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right",
      padding: "6px 8px",
      color: "var(--text2)"
    }
  }, lang === "ja" ? "割合" : "Share"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right",
      padding: "6px 8px",
      color: "var(--text2)"
    }
  }, lang === "ja" ? "変化(ADA)" : "Δ ADA"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "right",
      padding: "6px 8px",
      color: "var(--text2)"
    }
  }, lang === "ja" ? "割合変化" : "Δ Share"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: "left",
      padding: "6px 8px",
      color: "var(--text2)",
      minWidth: 120
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, distRows.map((r, i) => {
    const changeColor = r.adaChange > 0 ? "var(--yes)" : r.adaChange < 0 ? "var(--no)" : "var(--text2)";
    const pctChangeColor = r.pctChange > 0 ? "var(--yes)" : r.pctChange < 0 ? "var(--no)" : "var(--text2)";
    const isMerged = r.id.startsWith("merged__");
    return /*#__PURE__*/React.createElement("tr", {
      key: r.id,
      style: {
        borderBottom: "1px solid var(--border)",
        background: i % 2 === 0 ? "transparent" : "var(--bg2)"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        padding: "5px 6px",
        color: "var(--text2)",
        fontSize: 11
      }
    }, r.rank), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "5px 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 12
      }
    }, isMerged && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#fbbf24",
        marginRight: 4,
        fontSize: 10
      }
    }, "\u2295"), r.name), !isMerged && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "var(--text2)",
        fontFamily: "monospace"
      }
    }, r.id.slice(0, 24), "\u2026")), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "right",
        padding: "5px 8px",
        fontFamily: "monospace",
        fontSize: 12
      }
    }, fmtAda(r.amount)), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "right",
        padding: "5px 8px",
        fontWeight: 600,
        color: "var(--accent2)"
      }
    }, r.pctNow.toFixed(2), "%"), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "right",
        padding: "5px 8px",
        fontFamily: "monospace",
        fontSize: 11,
        color: changeColor
      }
    }, r.adaChange !== null ? (r.adaChange >= 0 ? "+" : "") + (Math.abs(r.adaChange) >= 1e6 ? (r.adaChange / 1e6).toFixed(1) + "M" : Math.abs(r.adaChange) >= 1e3 ? (r.adaChange / 1e3).toFixed(0) + "K" : r.adaChange.toFixed(0)) : "—"), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "right",
        padding: "5px 8px",
        fontSize: 11,
        color: pctChangeColor
      }
    }, r.pctChange !== null ? (r.pctChange >= 0 ? "+" : "") + r.pctChange.toFixed(2) + "pp" : "—"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "5px 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--bg4)",
        borderRadius: 3,
        height: 14,
        overflow: "hidden",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.min(r.pctNow * 2, 100) + "%",
        height: "100%",
        borderRadius: 3,
        background: i < 3 ? "var(--accent)" : i < 10 ? "var(--accent2)" : "var(--text2)",
        opacity: 0.7
      }
    }))));
  })))))), govInfo && govInfo.protocolParams && React.createElement(VetoPowerSection, {
    dreps: liveDreps,
    pp: govInfo.protocolParams,
    T
  }));
}

// Collapsible section header (shared)
const SectionHeader = ({
  title,
  show,
  setShow,
  color,
  extra
}) => /*#__PURE__*/React.createElement("div", {
  onClick: () => setShow(!show),
  style: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: color || "var(--bg3)",
    borderRadius: show ? "8px 8px 0 0" : "8px",
    border: "1px solid var(--border)",
    borderBottom: show ? "none" : "1px solid var(--border)"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "center",
    gap: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 11,
    transition: "transform .2s",
    transform: show ? "rotate(90deg)" : "rotate(0deg)"
  }
}, "\u25B6"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 700
  }
}, title)), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "center",
    gap: 8
  }
}, extra));

// Simulator Tab — Single table with 3 reward columns side by side
// ════════════════════════════════════════════════════════════════
function SimulatorTab({
  dreps: rawDreps,
  voteData,
  totalActions,
  periodVoteData,
  computePeriodVoteData,
  setPeriodVoteData,
  loadingVotes,
  progress,
  ccMembers,
  ccVotes,
  proposals,
  T
}) {
  const dreps = React.useMemo(() => rawDreps.filter(d => d.drep_id !== "drep_always_abstain" && d.drep_id !== "drep_always_no_confidence"), [rawDreps]);
  const rowBg = (i) => i % 2 === 0 ? "var(--bg2)" : "rgba(255,255,255,.01)";
  // ── Common parameters ──
  const todayStr = new Date().toISOString().slice(0, 10);
  const [govBudget, setGovBudget] = useHashState("s_budget", 500000);
  const [distPerYear, setDistPerYear] = useHashState("s_dist", 2);
  const [drepRatio, setDrepRatio] = useHashState("s_ratio", 60);
  const [periodFrom, setPeriodFrom] = useHashState("s_from", epochToDateStr(CC_MIN_EPOCH));
  const [periodTo, setPeriodTo] = useHashState("s_to", todayStr);
  const perDist = distPerYear > 0 ? Math.round(govBudget / distPerYear) : govBudget;
  const drepBudget = Math.round(perDist * drepRatio / 100);
  const ccBudgetTotal = Math.round(perDist * (100 - drepRatio) / 100);
  const drepAnnual = Math.round(govBudget * drepRatio / 100);
  const ccAnnual = Math.round(govBudget * (100 - drepRatio) / 100);
  const adaPrice = useAdaPrice();

  // ── Collapsible panels ──
  const [showCommon, setShowCommon] = useHashState("s_showC", true);
  const [showDrep, setShowDrep] = useHashState("s_showD", true);
  const [showCC, setShowCC] = useHashState("s_showCC", true);

  // ── DRep parameters ──
  const [K, setK] = useHashState("s_K", 5);
  const [N, setN] = useHashState("s_N", 100);
  const [b2, setB2] = useHashState("s_b2", 1000);
  const [b2Pct, setB2Pct] = useHashState("s_b2p", 30);
  const [b2Mode, setB2Mode] = useHashState("s_b2m", "ada");
  const b2Eff = b2Mode === "pct" ? N > 0 ? Math.round(drepBudget * b2Pct / 100 / N) : 0 : b2;
  const [votePenaltyOn, setVotePenaltyOn] = useHashState("s_penalty", true);
  const [rationaleWeight, setRationaleWeight] = useHashState("s_ratW", 0);
  const [searchQ, setSearchQ] = useHashState("s_q", "");
  const [page, setPage] = useHashState("s_p", 0);
  const perPage = 100;
  const b1 = Math.max(0, drepBudget - b2Eff);

  // ── CC parameters ──
  const ccMemberCount = ccMembers.length || 1;
  const ccPerMember = ccMemberCount > 0 ? Math.round(ccBudgetTotal / ccMemberCount) : 0;
  const [penaltyThreshold, setPenaltyThreshold] = useHashState("s_ccPen", 3);
  React.useEffect(() => {
    if (computePeriodVoteData && periodFrom && periodTo && !loadingVotes) {
      const pvd = computePeriodVoteData(periodFrom, periodTo);
      setPeriodVoteData(pvd);
    }
  }, [periodFrom, periodTo, loadingVotes]);
  const gasInRange = React.useMemo(() => {
    if (!periodVoteData) return 0;
    const first = Object.values(periodVoteData)[0];
    return first ? first.actionsInPeriod : 0;
  }, [periodVoteData]);
  const params = React.useMemo(() => ({
    K,
    N,
    totalBudget: drepBudget,
    b1,
    b2: b2Eff,
    votePeriod: votePenaltyOn ? 1 : 0,
    votePenaltyOn,
    rationaleWeight: rationaleWeight / 100
  }), [K, N, drepBudget, b1, b2Eff, votePenaltyOn, rationaleWeight]);
  const allResults = React.useMemo(() => calcAllMechanisms(dreps, params, voteData, totalActions, periodVoteData), [dreps, params, voteData, totalActions, periodVoteData]);
  const totalEligible = dreps.filter(d => Number(d.amount) > 0).length;
  const MECHS = [{
    id: "mo_equal",
    l: T.mech_equal,
    d: T.desc_equal,
    c: "#14b8a6"
  }, {
    id: "mo_prop",
    l: T.mech_prop,
    d: T.desc_prop,
    c: "#f59e0b"
  }, {
    id: "mo_bonus",
    l: T.mech_bonus,
    d: T.desc_bonus,
    c: "#a78bfa"
  }];
  const merged = React.useMemo(() => {
    const eq = allResults.mo_equal,
      pr = allResults.mo_prop,
      bo = allResults.mo_bonus;
    return eq.map((d, i) => ({
      ...d,
      r_equal: d.reward,
      r_prop: pr[i]?.reward || 0,
      r_bonus: bo[i]?.reward || 0,
      periodVR: periodVoteData && periodVoteData[d.drep_id] ? periodVoteData[d.drep_id].actionsInPeriod > 0 ? periodVoteData[d.drep_id].votesInPeriod / periodVoteData[d.drep_id].actionsInPeriod * 100 : 0 : null,
      periodRR: periodVoteData && periodVoteData[d.drep_id] && periodVoteData[d.drep_id].votesInPeriod > 0 ? periodVoteData[d.drep_id].rationalesInPeriod / periodVoteData[d.drep_id].votesInPeriod * 100 : null
    }));
  }, [allResults, periodVoteData]);
  const filtered = React.useMemo(() => {
    if (!searchQ) return merged;
    const q = searchQ.toLowerCase();
    return merged.filter(d => {
      const sn = safeName(d.name) || "";
      return sn.toLowerCase().includes(q) || d.drep_id.toLowerCase().includes(q);
    });
  }, [merged, searchQ]);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  function exportDrepCSV() {
    const hdr = ["Rank", "DRep ID", "Name", "Stake (ADA)", "Eligible", "Equal (ADA)", "Prop (ADA)", "Prop+Bonus (ADA)", "Period Vote Rate %", "Rationale Rate %", "Vote Count", "Overall Vote Rate %"];
    const rows = merged.map(d => [d.rank, d.drep_id, safeName(d.name) || "", Math.round(Number(d.amount) / 1e6), d.eligible ? "Yes" : "No", d.r_equal.toFixed(2), d.r_prop.toFixed(2), d.r_bonus.toFixed(2), d.periodVR != null ? d.periodVR.toFixed(1) : "", d.periodRR != null ? d.periodRR.toFixed(1) : "", voteData[d.drep_id] || "", totalActions > 0 ? ((voteData[d.drep_id] || 0) / totalActions * 100).toFixed(1) : ""]);
    downloadCSV(buildCSV(hdr, rows), "drep_rewards_comparison.csv");
  }

  // ── CC Simulator logic ──
  const ccProposals = React.useMemo(() => {
    const ids = new Set();
    Object.keys(ccVotes).forEach(k => {
      const pid = k.split("__")[1];
      if (pid) ids.add(pid);
    });
    return proposals.filter(p => ids.has(p.proposal_id));
  }, [ccVotes, proposals]);
  const currentEpoch = React.useMemo(() => Math.floor((Date.now() - EPOCH_208_TS) / EPOCH_DURATION) + 208, []);
  const simEpFrom = periodFrom ? dateToEpoch(periodFrom) : 0;
  const simEpTo = periodTo ? dateToEpoch(periodTo) : 99999;
  const ccSimEpFrom = Math.max(simEpFrom, CC_MIN_EPOCH);
  const simProps = React.useMemo(() => {
    return ccProposals.filter(p => {
      const ep = Number(p.epoch_no);
      const expiry = Number(p.expiration || p.epoch_no);
      return ep >= ccSimEpFrom && ep <= simEpTo && expiry <= currentEpoch;
    });
  }, [ccProposals, ccSimEpFrom, simEpTo, currentEpoch]);
  const ccFMembers = React.useMemo(() => [...ccMembers].sort((a, b) => (Number(b.expiration_epoch) || 0) - (Number(a.expiration_epoch) || 0) || (b.vote_count - a.vote_count)), [ccMembers]);
  const simData = React.useMemo(() => {
    return ccFMembers.map(cc => {
      const memberMin = ccMemberMinEpoch(cc.cc_id);
      const memberProps = simProps.filter(p => Number(p.epoch_no) >= memberMin);
      const totalEligible = memberProps.length;
      const voted = memberProps.filter(p => ccVotes[`${cc.cc_id}__${p.proposal_id}`]).length;
      const missed = totalEligible - voted;
      const factor = Math.max(0, 1 - missed / penaltyThreshold);
      const reward = ccPerMember * factor;
      return {
        cc,
        eligible: totalEligible,
        voted,
        missed,
        factor,
        reward
      };
    });
  }, [ccFMembers, simProps, ccVotes, ccPerMember, penaltyThreshold]);
  const ccMaxBudget = ccFMembers.length * ccPerMember;
  const ccActualBudget = simData.reduce((s, d) => s + d.reward, 0);
  const tdS = bg => ({
    background: bg,
    padding: "2px 4px",
    borderBottom: "1px solid var(--border)",
    fontSize: 9,
    textAlign: "right"
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: T.sim_common_title,
    show: showCommon,
    setShow: setShowCommon,
    color: "rgba(59,130,246,.08)",
    extra: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "var(--text2)",
        fontWeight: 400
      }
    }, "\u20B3", govBudget.toLocaleString(), "/yr \xB7 \xD7", distPerYear, " \xB7 DRep ", drepRatio, "% / CC ", 100 - drepRatio, "%")
  }), showCommon && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
      padding: 14,
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SliderParam, {
    label: T.sim_gov_budget,
    value: govBudget,
    onChange: setGovBudget,
    min: 50000,
    max: 5000000,
    step: 10000,
    suffix: " ADA"
  }), /*#__PURE__*/React.createElement(SliderParam, {
    label: T.sim_dist_per_year,
    value: distPerYear,
    onChange: v => setDistPerYear(Math.max(1, v)),
    min: 1,
    max: 12,
    step: 1,
    suffix: "x"
  }), /*#__PURE__*/React.createElement(SliderParam, {
    label: T.sim_drep_cc_ratio,
    value: drepRatio,
    onChange: setDrepRatio,
    min: 50,
    max: 100,
    step: 1,
    suffix: "%"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "collapse",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--bg3)"
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 10px",
      fontSize: 9,
      fontWeight: 700,
      color: "var(--text2)",
      textAlign: "left",
      borderBottom: "2px solid var(--border)"
    }
  }, T.sim_pool), [T.sim_annual, T.sim_per_distribution, T.sim_per_member].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    colSpan: 2,
    style: {
      padding: "6px 10px",
      fontSize: 9,
      fontWeight: 700,
      color: "var(--text2)",
      textAlign: "center",
      borderBottom: "2px solid var(--border)"
    }
  }, h))), /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--bg3)"
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "3px 10px",
      fontSize: 8,
      color: "var(--text2)",
      textAlign: "left",
      borderBottom: "1px solid var(--border)"
    }
  }), ["ADA", "USD", "ADA", "USD", "ADA", "USD"].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: "3px 6px",
      fontSize: 8,
      fontWeight: 600,
      color: "var(--text2)",
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 10px",
      fontSize: 11,
      fontWeight: 700,
      color: "#3b82f6",
      borderBottom: "1px solid var(--border)"
    }
  }, "DRep (", drepRatio, "%)"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      color: "#3b82f6",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u20B3", drepAnnual.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "right",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, fmtFiat(drepAnnual, adaPrice.usd, "$")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      color: "#3b82f6",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u20B3", drepBudget.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "right",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, fmtFiat(drepBudget, adaPrice.usd, "$")), /*#__PURE__*/React.createElement("td", {
    colSpan: 2,
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "center",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "rgba(255,255,255,.01)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 10px",
      fontSize: 11,
      fontWeight: 700,
      color: "#f59e0b",
      borderBottom: "1px solid var(--border)"
    }
  }, "CC (", 100 - drepRatio, "%)"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      color: "#f59e0b",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u20B3", ccAnnual.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "right",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, fmtFiat(ccAnnual, adaPrice.usd, "$")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      color: "#f59e0b",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u20B3", ccBudgetTotal.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "right",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, fmtFiat(ccBudgetTotal, adaPrice.usd, "$")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      color: "#f59e0b",
      borderBottom: "1px solid var(--border)"
    }
  }, "\u20B3", ccPerMember.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 6px",
      fontSize: 10,
      textAlign: "right",
      color: "var(--text2)",
      borderBottom: "1px solid var(--border)"
    }
  }, fmtFiat(ccPerMember, adaPrice.usd, "$"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 10px",
      background: "var(--bg3)",
      fontSize: 8,
      color: "var(--text2)"
    }
  }, "CC: ", ccMemberCount, " members \xB7 1 ADA \u2248 ", adaPrice.usd > 0 ? "$" + adaPrice.usd.toFixed(3) : "—")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text2)",
      fontWeight: 600,
      marginBottom: 4
    }
  }, T.sim_period), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      fontWeight: 600,
      display: "block",
      marginBottom: 2
    }
  }, T.vote_start), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: periodFrom,
    min: epochToDateStr(CC_MIN_EPOCH),
    onChange: e => setPeriodFrom(e.target.value),
    style: {
      width: "100%",
      padding: "4px 6px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 10,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      fontWeight: 600,
      display: "block",
      marginBottom: 2
    }
  }, T.vote_end), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: periodTo,
    onChange: e => setPeriodTo(e.target.value),
    style: {
      width: "100%",
      padding: "4px 6px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 10,
      outline: "none"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "var(--text2)",
      paddingBottom: 2
    }
  }, "Epoch ", simEpFrom, "\u301C", simEpTo, " \xB7 CC: ep.", ccSimEpFrom, "\u301C", simEpTo)))), loadingVotes && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--accent2)"
    }
  }, "\u23F3 ", progress), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 8
    }
  }, T.params), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(59,130,246,.04)",
      border: "1px solid rgba(59,130,246,.12)",
      borderRadius: 8,
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#3b82f6",
      marginBottom: 8
    }
  }, "DRep"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(SliderParam, {
    label: T.mo_k,
    value: K,
    onChange: setK,
    min: 0,
    max: 100,
    step: 5
  }), /*#__PURE__*/React.createElement(SliderParam, {
    label: T.mo_n,
    value: N,
    onChange: setN,
    min: 10,
    max: 500,
    step: 10
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, T.vote_penalty), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      border: "1px solid var(--border)",
      borderRadius: 5,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setVotePenaltyOn(true),
    style: {
      padding: "2px 7px",
      fontSize: 9,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      background: votePenaltyOn ? "var(--accent)" : "var(--bg3)",
      color: votePenaltyOn ? "#fff" : "var(--text2)"
    }
  }, T.vote_penalty_on), /*#__PURE__*/React.createElement("button", {
    onClick: () => setVotePenaltyOn(false),
    style: {
      padding: "2px 7px",
      fontSize: 9,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      background: !votePenaltyOn ? "var(--accent)" : "var(--bg3)",
      color: !votePenaltyOn ? "#fff" : "var(--text2)"
    }
  }, T.vote_penalty_off))), votePenaltyOn && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: gasInRange > 0 ? "var(--yes)" : "var(--no)"
    }
  }, T.vote_ga_count, ": ", gasInRange, " \u2014 ", T.vote_info)), /*#__PURE__*/React.createElement(SliderParam, {
    label: T.rationale_adj,
    value: rationaleWeight,
    onChange: setRationaleWeight,
    min: 0,
    max: 100,
    step: 5,
    suffix: "%"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(59,130,246,.12)",
      paddingTop: 6,
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#a78bfa",
      background: "rgba(167,139,250,.1)",
      padding: "1px 6px",
      borderRadius: 4
    }
  }, T.mech_bonus), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--text2)"
    }
  }, T.budget_b2), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      border: "1px solid var(--border)",
      borderRadius: 4,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setB2Mode("ada"),
    style: {
      padding: "1px 6px",
      fontSize: 8,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      background: b2Mode === "ada" ? "var(--accent)" : "var(--bg3)",
      color: b2Mode === "ada" ? "#fff" : "var(--text2)"
    }
  }, T.budget_b2_mode_ada), /*#__PURE__*/React.createElement("button", {
    onClick: () => setB2Mode("pct"),
    style: {
      padding: "1px 6px",
      fontSize: 8,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      background: b2Mode === "pct" ? "var(--accent)" : "var(--bg3)",
      color: b2Mode === "pct" ? "#fff" : "var(--text2)"
    }
  }, T.budget_b2_mode_pct)), b2Mode === "ada" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: b2,
    onChange: e => setB2(Math.min(Number(e.target.value), drepBudget)),
    min: 0,
    max: Math.round(drepBudget / N),
    step: 100,
    style: {
      width: 80,
      textAlign: "right",
      padding: "2px 6px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 10
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)"
    }
  }, "ADA")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: b2Pct,
    onChange: e => setB2Pct(Math.min(Number(e.target.value), 80)),
    min: 0,
    max: 80,
    step: 5,
    style: {
      width: 50,
      textAlign: "right",
      padding: "2px 6px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 10
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)"
    }
  }, "%")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)",
      marginLeft: "auto"
    }
  }, "Prop \u20B3", Math.max(0, drepBudget - b2Eff * N).toLocaleString(), " + Bonus \u20B3", b2Eff.toLocaleString(), "/\u4EBA\xD7", N, drepBudget > 0 ? ` (${Math.round(b2Eff * N / drepBudget * 100)}%)` : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(245,158,11,.04)",
      border: "1px solid rgba(245,158,11,.12)",
      borderRadius: 8,
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#f59e0b"
    }
  }, "CC"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, T.cc_sim_penalty_label, ":"), [3, 5, 10].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setPenaltyThreshold(n),
    style: {
      padding: "2px 7px",
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 600,
      cursor: "pointer",
      border: penaltyThreshold === n ? "2px solid var(--accent)" : "1px solid var(--border)",
      background: penaltyThreshold === n ? "rgba(59,130,246,.15)" : "var(--bg)",
      color: penaltyThreshold === n ? "var(--accent)" : "var(--text2)"
    }
  }, n, " ", T.cc_sim_penalty_unit)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)",
      marginLeft: "auto"
    }
  }, "\u20B3", ccPerMember.toLocaleString(), "/", T.sim_per_member, adaPrice.usd > 0 ? ` (${fmtFiat(ccPerMember, adaPrice.usd, "$")})` : "", " \xB7 ", ccFMembers.length, " members \xB7 ", simProps.length, " GAs"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
      flexWrap: "wrap"
    }
  }, loadingVotes && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--accent2)"
    }
  }, "\u23F3 ", progress), !loadingVotes && progress && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)"
    }
  }, progress), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => {
      localStorage.removeItem(SIM_CACHE_KEY);
      window.location.reload();
    },
    style: {
      fontSize: 8,
      padding: "2px 6px",
      opacity: 0.6,
      marginLeft: "auto"
    }
  }, T.clear_cache))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: T.sim_drep_section,
    show: showDrep,
    setShow: setShowDrep,
    color: "rgba(59,130,246,.05)",
    extra: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#3b82f6",
        fontWeight: 600
      }
    }, "\u20B3", drepBudget.toLocaleString())
  }), showDrep && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
      padding: "6px 8px",
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: T.search,
    value: searchQ,
    onChange: e => {
      setSearchQ(e.target.value);
      setPage(0);
    },
    style: {
      padding: "3px 6px",
      borderRadius: 5,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      fontSize: 10,
      width: 160,
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--text2)"
    }
  }, filtered.length, " DReps"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: exportDrepCSV,
    style: {
      fontSize: 8,
      padding: "2px 6px"
    }
  }, "\uD83D\uDCE5 CSV"))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "auto",
      maxHeight: "calc(100vh - 340px)"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "separate",
      borderSpacing: 0,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [{
    t: T.rank,
    a: "right",
    w: 28
  }, {
    t: "",
    a: "left",
    w: 18
  }, {
    t: T.name,
    a: "left"
  }, {
    t: T.stake,
    a: "right"
  }].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      position: "sticky",
      top: 0,
      background: "var(--bg3)",
      padding: "3px 4px",
      textAlign: h.a,
      borderBottom: "2px solid var(--border)",
      fontSize: 8,
      fontWeight: 700,
      color: "var(--text2)",
      whiteSpace: "nowrap",
      width: h.w || "auto"
    }
  }, h.t)), /*#__PURE__*/React.createElement("th", {
    style: {
      position: "sticky",
      top: 0,
      background: "var(--bg3)",
      padding: "3px 4px",
      textAlign: "center",
      borderBottom: "2px solid var(--border)",
      fontSize: 8,
      fontWeight: 700,
      color: "var(--text2)"
    }
  }, "Elig."), MECHS.map(m => /*#__PURE__*/React.createElement("th", {
    key: m.id,
    style: {
      position: "sticky",
      top: 0,
      background: m.c + "15",
      padding: "3px 4px",
      textAlign: "right",
      borderBottom: `2px solid ${m.c}40`,
      fontSize: 8,
      fontWeight: 700,
      color: m.c,
      whiteSpace: "nowrap",
      minWidth: 65
    }
  }, m.l)), /*#__PURE__*/React.createElement("th", {
    style: {
      position: "sticky",
      top: 0,
      background: "var(--bg3)",
      padding: "3px 4px",
      textAlign: "right",
      borderBottom: "2px solid var(--border)",
      fontSize: 8,
      fontWeight: 700,
      color: "var(--text2)",
      whiteSpace: "nowrap"
    }
  }, T.vote_rate), rationaleWeight > 0 && /*#__PURE__*/React.createElement("th", {
    style: {
      position: "sticky",
      top: 0,
      background: "var(--bg3)",
      padding: "3px 4px",
      textAlign: "right",
      borderBottom: "2px solid var(--border)",
      fontSize: 8,
      fontWeight: 700,
      color: "var(--text2)",
      whiteSpace: "nowrap"
    }
  }, T.rationale_rate))), /*#__PURE__*/React.createElement("tbody", null, pageData.map((d, ri) => {
    const bg = rowBg(ri);
    const pvr = d.periodVR;
    return /*#__PURE__*/React.createElement("tr", {
      key: d.drep_id,
      style: {
        opacity: d.eligible ? 1 : 0.35
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        color: "var(--text2)",
        width: 28,
        fontSize: 8
      }
    }, d.rank), /*#__PURE__*/React.createElement("td", {
      style: {
        background: bg,
        padding: "1px 1px",
        borderBottom: "1px solid var(--border)",
        width: 18
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: safeName(d.name) || d.drep_id,
      url: d.image_url,
      size: 14
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        background: bg,
        padding: "2px 4px",
        borderBottom: "1px solid var(--border)",
        fontSize: 9,
        fontWeight: 600,
        maxWidth: 110,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, safeName(d.name) || shortId(d.drep_id)), /*#__PURE__*/React.createElement("td", {
      style: tdS(bg)
    }, "\u20B3", fmtAda(d.amount)), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "center"
      }
    }, d.eligible ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--yes)"
      }
    }, "\u2713") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text2)"
      }
    }, "\u2212")), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        fontWeight: 600,
        color: d.r_equal > 0 ? "#14b8a6" : "var(--text2)",
        background: bg
      }
    }, d.r_equal > 0 ? "₳" + fmtAdaNum(d.r_equal) : "−"), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        fontWeight: 600,
        color: d.r_prop > 0 ? "#f59e0b" : "var(--text2)",
        background: bg
      }
    }, d.r_prop > 0 ? "₳" + fmtAdaNum(d.r_prop) : "−"), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        fontWeight: 600,
        color: d.r_bonus > 0 ? "#a78bfa" : "var(--text2)",
        background: bg
      }
    }, d.r_bonus > 0 ? "₳" + fmtAdaNum(d.r_bonus) : "−"), /*#__PURE__*/React.createElement("td", {
      style: tdS(bg)
    }, pvr != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 2,
        background: "var(--bg4)",
        borderRadius: 1,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${Math.min(pvr, 100)}%`,
        height: "100%",
        background: pvr > 80 ? "var(--yes)" : pvr > 50 ? "var(--abstain)" : "var(--no)",
        borderRadius: 1
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: pvr > 80 ? "var(--yes)" : pvr > 50 ? "var(--abstain)" : "var(--no)"
      }
    }, pvr.toFixed(0), "%")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text2)",
        fontSize: 7
      }
    }, "\u2212")), rationaleWeight > 0 && /*#__PURE__*/React.createElement("td", {
      style: tdS(bg)
    }, d.periodRR != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 2,
        background: "var(--bg4)",
        borderRadius: 1,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${Math.min(d.periodRR, 100)}%`,
        height: "100%",
        background: d.periodRR > 80 ? "var(--yes)" : d.periodRR > 50 ? "var(--abstain)" : "var(--no)",
        borderRadius: 1
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 7,
        color: d.periodRR > 80 ? "var(--yes)" : d.periodRR > 50 ? "var(--abstain)" : "var(--no)"
      }
    }, d.periodRR.toFixed(0), "%")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text2)",
        fontSize: 7
      }
    }, "\u2212")));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      padding: "4px 8px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg3)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: page === 0,
    onClick: () => setPage(page - 1),
    style: {
      padding: "1px 6px",
      fontSize: 9,
      opacity: page === 0 ? .3 : 1
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9
    }
  }, page + 1, " / ", totalPages), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: page >= totalPages - 1,
    onClick: () => setPage(page + 1),
    style: {
      padding: "1px 6px",
      fontSize: 9,
      opacity: page >= totalPages - 1 ? .3 : 1
    }
  }, "\u2192"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: T.sim_cc_section,
    show: showCC,
    setShow: setShowCC,
    color: "rgba(245,158,11,.05)",
    extra: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#f59e0b",
        fontWeight: 600
      }
    }, "\u20B3", ccBudgetTotal.toLocaleString(), " \xB7 ", ccFMembers.length, " members")
  }), showCC && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderTop: "none",
      borderRadius: "0 0 8px 8px",
      padding: 14,
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      background: "var(--bg2)"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "separate",
      borderSpacing: 0,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [{
    t: T.cc_member,
    a: "left"
  }, {
    t: T.cc_sim_eligible,
    a: "center"
  }, {
    t: T.cc_sim_voted,
    a: "center"
  }, {
    t: T.cc_sim_missed,
    a: "center"
  }, {
    t: T.cc_sim_factor,
    a: "center"
  }, {
    t: T.cc_sim_reward + " (1x)",
    a: "right"
  }, {
    t: T.cc_sim_reward + ` (${distPerYear}x/yr)`,
    a: "right"
  }].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      position: "sticky",
      top: 0,
      background: "var(--bg3)",
      padding: "5px 6px",
      textAlign: h.a,
      borderBottom: "2px solid var(--border)",
      fontSize: 9,
      fontWeight: 700,
      color: "var(--text2)",
      whiteSpace: "nowrap"
    }
  }, h.t)))), /*#__PURE__*/React.createElement("tbody", null, simData.map((d, ri) => {
    const bg = rowBg(ri);
    const fc = d.factor > 0.5 ? "#22c55e" : d.factor > 0 ? "#f59e0b" : "#ef4444";
    const rw = Math.round(d.reward);
    const rwYr = rw * distPerYear;
    return /*#__PURE__*/React.createElement("tr", {
      key: d.cc.cc_id
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "left",
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: d.cc.name || d.cc.cc_id,
      url: null,
      size: 18
    }), /*#__PURE__*/React.createElement("span", null, d.cc.name || shortId(d.cc.cc_id)))), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "center"
      }
    }, d.eligible), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "center",
        color: "#22c55e",
        fontWeight: 600
      }
    }, d.voted), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "center",
        color: d.missed === 0 ? "var(--text2)" : d.missed >= penaltyThreshold ? "#ef4444" : "#f59e0b",
        fontWeight: d.missed > 0 ? 700 : 400
      }
    }, d.missed), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        textAlign: "center",
        color: fc,
        fontWeight: 600
      }
    }, Math.round(d.factor * 100), "%"), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        fontWeight: 600,
        color: fc
      }
    }, rw > 0 ? "₳" + rw.toLocaleString() : "₳0", rw > 0 && adaPrice.usd > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: "var(--text2)",
        marginLeft: 4
      }
    }, fmtFiat(rw, adaPrice.usd, "$"))), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdS(bg),
        fontWeight: 600,
        color: fc
      }
    }, rwYr > 0 ? "₳" + rwYr.toLocaleString() : "₳0", rwYr > 0 && adaPrice.usd > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: "var(--text2)",
        marginLeft: 4
      }
    }, fmtFiat(rwYr, adaPrice.usd, "$"))));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)",
      opacity: .7
    }
  }, "\u2139 ", T.cc_sim_note), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: "var(--text2)"
    }
  }, T.sim_cc_actual_budget, ": \u20B3", Math.round(ccActualBudget).toLocaleString(), ccMaxBudget > 0 ? ` (${Math.round(ccActualBudget / ccMaxBudget * 100)}%)` : "", " / Max \u20B3", ccMaxBudget.toLocaleString(), ccMaxBudget > ccActualBudget ? ` · saved ₳${Math.round(ccMaxBudget - ccActualBudget).toLocaleString()}` : "")))));
}

// ════════════════════════════════════════════════════════════════
// Veto Power Analysis — reusable component
function VetoPowerSection({
  dreps,
  pp,
  T
}) {
  if (!pp || !dreps || dreps.length === 0) return null;
  const CE = React.createElement;
  // Total active DRep stake (excluding abstain, including no_confidence)
  const vetoAllDreps = (dreps || []).filter(d => d.drep_id !== "drep_always_abstain" && Number(d.amount) > 0);
  const totalActive = vetoAllDreps.reduce((s, d) => s + Number(d.amount), 0);
  const ncDrep = (dreps || []).find(d => d.drep_id === "drep_always_no_confidence");
  const ncPower = ncDrep ? Number(ncDrep.amount) : 0;
  const ncPct = totalActive > 0 ? ncPower / totalActive * 100 : 0;
  const ENTITY_GROUPS = [{
    name: "Yoroi / EMURGO",
    match: d => /yoroi/i.test(d.name || "") || /emurgo/i.test(d.name || "")
  }];
  const coalitionDreps = (() => {
    const singles = vetoAllDreps.filter(d => d.drep_id !== "drep_always_no_confidence");
    const merged = [];
    const used = new Set();
    for (const eg of ENTITY_GROUPS) {
      const members = singles.filter(d => eg.match(d));
      if (members.length > 1) {
        const totalAmt = members.reduce((s, d) => s + Number(d.amount), 0);
        merged.push({
          drep_id: members.map(d => d.drep_id).join("+"),
          name: eg.name,
          amount: totalAmt,
          merged: true,
          members
        });
        members.forEach(d => used.add(d.drep_id));
      }
    }
    for (const d of singles) {
      if (!used.has(d.drep_id)) merged.push(d);
    }
    return merged.sort((a, b) => Number(b.amount) - Number(a.amount));
  })();
  const actionTypes = [{
    key: "NoConfidence",
    label: T.type_noconf || "No Confidence",
    thr: Number(pp.dvt_motion_no_confidence) || 0.67
  }, {
    key: "UpdateCommittee",
    label: T.type_cc || "Update CC",
    thr: Number(pp.dvt_committee_normal) || 0.67
  }, {
    key: "NewConstitution",
    label: T.type_const || "New Constitution",
    thr: Number(pp.dvt_update_to_constitution) || 0.75
  }, {
    key: "HardForkInitiation",
    label: T.type_hardfork || "Hard Fork",
    thr: Number(pp.dvt_hard_fork_initiation) || 0.6
  }, {
    key: "TreasuryWithdrawals",
    label: T.type_treasury || "Treasury",
    thr: Number(pp.dvt_treasury_withdrawal) || 0.67
  }, {
    key: "ParamNetwork",
    label: "Param: Network",
    thr: Number(pp.dvt_p_p_network_group) || 0.67,
    sub: true
  }, {
    key: "ParamEconomic",
    label: "Param: Economic",
    thr: Number(pp.dvt_p_p_economic_group) || 0.67,
    sub: true
  }, {
    key: "ParamTechnical",
    label: "Param: Technical",
    thr: Number(pp.dvt_p_p_technical_group) || 0.67,
    sub: true
  }, {
    key: "ParamGovernance",
    label: "Param: Governance",
    thr: Number(pp.dvt_p_p_gov_group) || 0.75,
    sub: true
  }, {
    key: "InfoAction",
    label: T.type_info || "Info Action",
    thr: 0.51
  }];
  const vetoRows = actionTypes.map(at => {
    const vetoPct = 1 - at.thr;
    const vetoNeeded = vetoPct * totalActive;
    const deficit = vetoNeeded - ncPower;
    let coalition = [];
    let cumStake = 0;
    let fulfilled = deficit <= 0;
    if (!fulfilled) {
      for (const d of coalitionDreps) {
        coalition.push(d);
        cumStake += Number(d.amount);
        if (cumStake >= deficit) {
          fulfilled = true;
          break;
        }
      }
    }
    return {
      ...at,
      vetoPct,
      vetoNeeded,
      deficit: Math.max(0, deficit),
      coalition,
      cumStake,
      fulfilled,
      deficitPct: totalActive > 0 ? Math.max(0, deficit) / totalActive * 100 : 0
    };
  });
  const maxCoalitionSize = Math.max(...vetoRows.map(vr => vr.coalition.length));
  const rankingDreps = coalitionDreps.slice(0, Math.max(maxCoalitionSize, 5));
  let runningStake = ncPower;
  const ranking = rankingDreps.map((d, i) => {
    runningStake += Number(d.amount);
    return {
      ...d,
      rank: i + 1,
      cumStake: runningStake,
      cumPct: totalActive > 0 ? runningStake / totalActive * 100 : 0
    };
  });
  const thV = {
    fontSize: 9,
    fontWeight: 700,
    padding: "4px 6px",
    borderBottom: "2px solid var(--border)",
    color: "var(--text2)"
  };
  const tdV = {
    fontSize: 10,
    padding: "3px 6px",
    borderBottom: "1px solid var(--border)"
  };
  const fmtS = fmtStakeShort;
  const fmtL = fmtAda; // global fmtAda has same signature (lovelace in)

  return CE("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 10
    }
  }, CE("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)",
      marginBottom: 8
    }
  }, "🛡️ " + (T.gov_veto || "Veto Power Analysis")), CE("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, CE("div", {
    style: {
      background: "var(--bg3)",
      borderRadius: 8,
      padding: "8px 12px",
      borderLeft: "3px solid #ef4444",
      flex: "1 1 200px"
    }
  }, CE("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 2
    }
  }, "Auto-No (drep_always_no_confidence)"), CE("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#ef4444"
    }
  }, "₳" + fmtL(ncPower)), CE("div", {
    style: {
      fontSize: 10,
      color: "var(--text2)"
    }
  }, ncPct.toFixed(2) + "% of active stake")), CE("div", {
    style: {
      background: "var(--bg3)",
      borderRadius: 8,
      padding: "8px 12px",
      borderLeft: "3px solid #3b82f6",
      flex: "1 1 200px"
    }
  }, CE("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 2
    }
  }, "Total Active DRep Stake"), CE("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#3b82f6"
    }
  }, "₳" + fmtL(totalActive)))), CE("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, T.veto_explanation || "Veto = enough No votes to prevent a proposal from reaching its approval threshold. The drep_always_no_confidence auto-voter contributes No votes to every proposal. Below: top DReps by stake with cumulative veto power, then a table showing how many are needed per action type."), CE("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text)",
      marginBottom: 4
    }
  }, "DRep Veto Power Ranking"), CE("div", {
    style: {
      overflowX: "auto",
      marginBottom: 12
    }
  }, CE("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, CE("thead", null, CE("tr", null, CE("th", {
    style: {
      ...thV,
      textAlign: "center",
      width: 24
    }
  }, "#"), CE("th", {
    style: {
      ...thV,
      textAlign: "left"
    }
  }, "DRep / Entity"), CE("th", {
    style: {
      ...thV,
      textAlign: "right"
    }
  }, "Stake"), CE("th", {
    style: {
      ...thV,
      textAlign: "right"
    }
  }, "Stake %"), CE("th", {
    style: {
      ...thV,
      textAlign: "right"
    }
  }, "Cumul. %"), CE("th", {
    style: {
      ...thV,
      width: "30%"
    }
  }, "Cumulative Veto Power"))), CE("tbody", null, CE("tr", {
    key: "nc",
    style: {
      background: "rgba(239,68,68,.06)"
    }
  }, CE("td", {
    style: {
      ...tdV,
      textAlign: "center",
      fontSize: 9,
      color: "#ef4444"
    }
  }, "🔴"), CE("td", {
    style: {
      ...tdV,
      fontWeight: 600,
      color: "#ef4444"
    }
  }, "drep_always_no_confidence"), CE("td", {
    style: {
      ...tdV,
      textAlign: "right"
    }
  }, "₳" + fmtS(ncPower)), CE("td", {
    style: {
      ...tdV,
      textAlign: "right"
    }
  }, ncPct.toFixed(2) + "%"), CE("td", {
    style: {
      ...tdV,
      textAlign: "right",
      fontWeight: 600
    }
  }, ncPct.toFixed(2) + "%"), CE("td", {
    style: {
      ...tdV
    }
  }, CE("div", {
    style: {
      background: "var(--bg)",
      borderRadius: 3,
      overflow: "hidden",
      height: 14,
      position: "relative"
    }
  }, CE("div", {
    style: {
      background: "#ef4444",
      height: "100%",
      width: ncPct + "%",
      borderRadius: 3,
      minWidth: 2
    }
  }), CE("span", {
    style: {
      position: "absolute",
      right: 3,
      top: 0,
      fontSize: 8,
      lineHeight: "14px",
      color: "var(--text2)"
    }
  }, ncPct.toFixed(1) + "%")))), ranking.map((d, i) => {
    const vetosReached = vetoRows.filter(vr => vr.fulfilled && d.rank <= vr.coalition.length).length;
    return CE("tr", {
      key: d.drep_id || i,
      style: {
        background: i % 2 === 0 ? "transparent" : "var(--bg2)"
      }
    }, CE("td", {
      style: {
        ...tdV,
        textAlign: "center",
        fontWeight: 600
      }
    }, d.rank), CE("td", {
      style: {
        ...tdV,
        fontWeight: 600
      }
    }, d.merged ? CE("span", null, d.name, " ", CE("span", {
      style: {
        fontSize: 7,
        color: "var(--text2)",
        background: "var(--bg3)",
        padding: "1px 3px",
        borderRadius: 3
      }
    }, "merged")) : d.name || d.drep_id.slice(0, 25)), CE("td", {
      style: {
        ...tdV,
        textAlign: "right"
      }
    }, "₳" + fmtS(d.amount)), CE("td", {
      style: {
        ...tdV,
        textAlign: "right"
      }
    }, (totalActive > 0 ? Number(d.amount) / totalActive * 100 : 0).toFixed(2) + "%"), CE("td", {
      style: {
        ...tdV,
        textAlign: "right",
        fontWeight: 600
      }
    }, d.cumPct.toFixed(2) + "%"), CE("td", {
      style: {
        ...tdV
      }
    }, CE("div", {
      style: {
        background: "var(--bg)",
        borderRadius: 3,
        overflow: "hidden",
        height: 14,
        position: "relative"
      }
    }, CE("div", {
      style: {
        background: "#ef444480",
        height: "100%",
        width: ncPct + "%",
        borderRadius: "3px 0 0 3px",
        minWidth: 1
      }
    }), CE("div", {
      style: {
        background: "#8b5cf6",
        height: "100%",
        width: d.cumPct - ncPct + "%",
        position: "absolute",
        left: ncPct + "%",
        top: 0,
        borderRadius: "0 3px 3px 0",
        minWidth: 1
      }
    }), vetoRows.filter(vr => vr.vetoPct * 100 <= 50).map(vr => CE("div", {
      key: vr.key,
      title: vr.label + " veto: " + (vr.vetoPct * 100).toFixed(0) + "%",
      style: {
        position: "absolute",
        left: vr.vetoPct * 100 + "%",
        top: 0,
        bottom: 0,
        width: 1,
        background: vr.fulfilled && d.rank <= vr.coalition.length ? "#34d39980" : "rgba(255,255,255,.3)"
      }
    })), CE("span", {
      style: {
        position: "absolute",
        right: 3,
        top: 0,
        fontSize: 8,
        lineHeight: "14px",
        color: "var(--text2)"
      }
    }, d.cumPct.toFixed(1) + "%"))));
  })))), CE("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text)",
      marginBottom: 4
    }
  }, "Veto Threshold by Action Type"), CE("div", {
    style: {
      overflowX: "auto"
    }
  }, CE("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, CE("thead", null, CE("tr", null, CE("th", {
    style: {
      ...thV,
      textAlign: "left"
    }
  }, "Action Type"), CE("th", {
    style: {
      ...thV,
      textAlign: "center",
      color: "#34d399"
    }
  }, "Approval"), CE("th", {
    style: {
      ...thV,
      textAlign: "center",
      color: "#ef4444"
    }
  }, "Veto Need"), CE("th", {
    style: {
      ...thV,
      textAlign: "center",
      color: "#f59e0b"
    }
  }, "Add. Needed"), CE("th", {
    style: {
      ...thV,
      textAlign: "center",
      color: "#8b5cf6"
    }
  }, "Min Coalition"), CE("th", {
    style: {
      ...thV,
      textAlign: "left",
      color: "#8b5cf6"
    }
  }, "Members"))), CE("tbody", null, vetoRows.map(vr => CE("tr", {
    key: vr.key,
    style: {
      background: vr.sub ? "rgba(139,92,246,.04)" : "transparent"
    }
  }, CE("td", {
    style: {
      ...tdV,
      fontWeight: 600,
      paddingLeft: vr.sub ? 16 : 6,
      fontSize: vr.sub ? 9 : 10
    }
  }, vr.label), CE("td", {
    style: {
      ...tdV,
      textAlign: "center",
      color: "#34d399",
      fontWeight: 600
    }
  }, (vr.thr * 100).toFixed(0) + "%"), CE("td", {
    style: {
      ...tdV,
      textAlign: "center",
      color: "#ef4444",
      fontWeight: 600
    }
  }, (vr.vetoPct * 100).toFixed(1) + "%"), CE("td", {
    style: {
      ...tdV,
      textAlign: "center",
      color: vr.deficit <= 0 ? "#34d399" : "#f59e0b",
      fontWeight: 600
    }
  }, vr.deficit <= 0 ? "✅ 0%" : vr.deficitPct.toFixed(1) + "%"), CE("td", {
    style: {
      ...tdV,
      textAlign: "center",
      fontWeight: 700,
      fontSize: 12
    }
  }, vr.deficit <= 0 ? CE("span", {
    style: {
      color: "#ef4444"
    }
  }, "⚠ 0") : !vr.fulfilled ? "—" : CE("span", {
    style: {
      color: "#8b5cf6"
    }
  }, String(vr.coalition.length))), CE("td", {
    style: {
      ...tdV,
      fontSize: 9,
      color: "var(--text2)"
    }
  }, vr.deficit <= 0 ? "Auto-No alone" : !vr.fulfilled ? "Unreachable" : vr.coalition.map(d => d.merged ? d.name : d.name || d.drep_id.slice(0, 12)).join(", "))))))));
}

// Vote Reminder — identify minimum voters needed to reach threshold
// ════════════════════════════════════════════════════════════════
function VoteReminderSection({
  govInfo,
  T,
  dreps,
  votes,
  proposals,
  ccMembers,
  ccVotes,
  spoVotes,
  spoPoolInfo,
  pp
}) {
  const [filterProp, setFilterProp] = React.useState("__all__");
  const [extraCount, setExtraCount] = React.useState(3);
  const [copied, setCopied] = React.useState(false);
  const [expandedProp, setExpandedProp] = React.useState(null);
  const [expandedCells, setExpandedCells] = React.useState({}); // key: "propId__col" → true
  const toggleCell = (propId, col) => setExpandedCells(prev => ({
    ...prev,
    [`${propId}__${col}`]: !prev[`${propId}__${col}`]
  }));
  const isCellExpanded = (propId, col) => !!expandedCells[`${propId}__${col}`];
  const E = React.createElement;
  const fmtStake = fmtStakeShort;
  const curEp = pp && pp.epoch || currentEpochNow();
  // Blockfrost expiration = first epoch where proposal is INACTIVE
  // Voting deadline = start of expiration epoch = end of (expiration-1)
  const epochDeadlineTs = ep => EPOCH_208_TS + (ep - 208) * EPOCH_DURATION;
  const lastVoteEpoch = ep => ep - 1; // last epoch where votes are accepted
  const fmtDate = ts => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const fmtDateTime = ts => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const daysLeft = ep => {
    const ms = epochDeadlineTs(ep) - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  };
  const activeProps = (proposals || []).filter(p => p.expiration && p.expiration > curEp);

  // ─── Thresholds (using shared functions) ───
  const CC_INELIG = ["NoConfidence"];

  // ─── Compute reminder data for ALL active proposals ───
  const allReminders = React.useMemo(() => {
    return activeProps.map(prop => {
      const ps = govInfo && govInfo.proposalSummaries && govInfo.proposalSummaries[prop.proposal_id];
      const hasDrepSummary = ps && ps.drep;
      const hasSpoSummary = ps && ps.spo;

      // DRep analysis — exclude auto voters and 0-stake DReps
      const drepThr = getDrepThreshold(pp, prop.proposal_type);
      const unvotedDreps = dreps.filter(d => {
        if (d.drep_id === "drep_always_abstain" || d.drep_id === "drep_always_no_confidence") return false;
        if (Number(d.amount) <= 0) return false;
        const v = votes[`${d.drep_id}__${prop.proposal_id}`];
        return !v || v === "NotVoted";
      }).sort((a, b) => Number(b.amount) - Number(a.amount));
      let deficit = 0,
        minDreps = [],
        cumStake = 0,
        thresholdMet = false,
        drepYesPct = 0;
      if (hasDrepSummary) {
        const yesPower = Number(ps.drep.yes_power) || 0;
        drepYesPct = ps.drep.yes_pct || 0;
        const yesPctFrac = drepYesPct / 100;
        const totalPower = yesPctFrac > 0 ? yesPower / yesPctFrac : dreps.filter(d => d.drep_id !== "drep_always_abstain" && d.drep_id !== "drep_always_no_confidence" && Number(d.amount) > 0).reduce((s, d) => s + Number(d.amount), 0);
        const needed = drepThr * totalPower;
        deficit = needed - yesPower;
        thresholdMet = deficit <= 0;
        if (!thresholdMet) {
          for (const d of unvotedDreps) {
            minDreps.push(d);
            cumStake += Number(d.amount);
            if (cumStake >= deficit) {
              thresholdMet = true;
              break;
            }
          }
        }
      } else {
        // No summary — show top unvoted DReps (can't calculate deficit)
        minDreps = unvotedDreps.slice(0, 5);
      }
      const extraDreps = unvotedDreps.slice(minDreps.length, minDreps.length + extraCount);

      // CC analysis (independent of proposal summary)
      const ccCanVote = !CC_INELIG.includes(prop.proposal_type);
      let unvotedCC = [];
      if (ccCanVote) {
        unvotedCC = (ccMembers || []).filter(cc => {
          const v = (ccVotes || {})[`${cc.cc_id}__${prop.proposal_id}`];
          return !v || v === "NotVoted";
        });
      }

      // SPO analysis
      const spoThr = getSpoThreshold(pp, prop.proposal_type);
      let minSPOs = [];
      let spoThresholdMet = true;
      let spoYesPct = 0;
      if (spoThr !== null && hasSpoSummary) {
        spoYesPct = ps.spo.yes_pct || 0;
        const spoYesPower = Number(ps.spo.yes_power) || 0;
        const spoYesPctFrac = spoYesPct / 100;
        const spoTotalPower = spoYesPctFrac > 0 ? spoYesPower / spoYesPctFrac : Object.values(spoPoolInfo || {}).reduce((s, p) => s + Number(p.active_stake || 0), 0);
        const spoNeeded = spoThr * spoTotalPower;
        const spoDeficit = spoNeeded - spoYesPower;
        spoThresholdMet = spoDeficit <= 0;
        if (!spoThresholdMet) {
          const votedPoolIds = new Set();
          Object.keys(spoVotes || {}).forEach(k => {
            if (k.endsWith("__" + prop.proposal_id)) votedPoolIds.add(k.split("__")[0]);
          });
          const unvotedPools = Object.keys(spoPoolInfo || {}).filter(pid => !votedPoolIds.has(pid)).map(pid => {
            const info = (spoPoolInfo || {})[pid] || {};
            return {
              pool_id: pid,
              ticker: info.ticker || "",
              active_stake: Number(info.active_stake || 0)
            };
          }).filter(p => p.active_stake > 0).sort((a, b) => b.active_stake - a.active_stake);
          let sCum = 0;
          for (const p of unvotedPools) {
            minSPOs.push(p);
            sCum += p.active_stake;
            if (sCum >= spoDeficit) break;
          }
        }
      }
      return {
        prop,
        ps,
        drepData: {
          threshold: drepThr,
          yesPct: drepYesPct,
          deficit,
          thresholdMet,
          minDreps,
          extraDreps,
          hasSummary: !!hasDrepSummary
        },
        ccData: {
          canVote: ccCanVote,
          threshold: getCCThreshold(pp),
          yesPct: ps && ps.cc ? ps.cc.yes_pct || 0 : 0,
          unvotedCC
        },
        spoData: spoThr !== null ? {
          threshold: spoThr,
          yesPct: spoYesPct,
          thresholdMet: spoThresholdMet,
          minSPOs,
          hasSummary: !!hasSpoSummary,
          extraSPOs: minSPOs.length > 0 ? Object.keys(spoPoolInfo || {}).filter(pid => {
            const voted = new Set();
            Object.keys(spoVotes || {}).forEach(k => {
              if (k.endsWith("__" + prop.proposal_id)) voted.add(k.split("__")[0]);
            });
            return !voted.has(pid) && !minSPOs.find(s => s.pool_id === pid);
          }).map(pid => ({
            pool_id: pid,
            ticker: (spoPoolInfo || {})[pid]?.ticker || "",
            active_stake: Number((spoPoolInfo || {})[pid]?.active_stake || 0)
          })).filter(p => p.active_stake > 0).sort((a, b) => b.active_stake - a.active_stake).slice(0, extraCount) : []
        } : null
      };
    });
  }, [activeProps.length, extraCount, dreps, votes, ccVotes, spoVotes, govInfo]);
  const displayReminders = filterProp === "__all__" ? allReminders : allReminders.filter(r => r.prop.proposal_id === filterProp);

  // ─── Generate X post for one proposal ───
  const generatePostForProp = rem => {
    if (!rem || !rem.drepData) return "";
    const p = rem.prop,
      d = rem.drepData,
      c = rem.ccData,
      s = rem.spoData;
    const dl = daysLeft(p.expiration);
    const dlDate = fmtDate(epochDeadlineTs(p.expiration));
    let post = `📢 Cardano Vote Reminder\n\n`;
    post += `📋 ${p.title || p.proposal_id.slice(0, 20)}\n`;
    post += `📊 ${p.proposal_type}\n`;
    post += `⏰ Deadline: E${lastVoteEpoch(p.expiration)} (${dlDate}) — ${dl} day${dl !== 1 ? "s" : ""} left!\n\n`;
    if (d.hasSummary) {
      post += `🗳️ DRep: ${d.yesPct.toFixed(1)}% / ${(d.threshold * 100).toFixed(0)}%`;
      if (d.deficit <= 0) post += ` ✅\n`;else {
        post += `\n`;
        [...d.minDreps, ...d.extraDreps].forEach(dr => {
          post += `  • ${dr.name || dr.drep_id.slice(0, 20)} (₳${fmtAda(dr.amount)})\n`;
        });
      }
    } else {
      post += `🗳️ DRep: Unvoted top DReps:\n`;
      [...d.minDreps, ...d.extraDreps].forEach(dr => {
        post += `  • ${dr.name || dr.drep_id.slice(0, 20)} (₳${fmtAda(dr.amount)})\n`;
      });
    }
    if (c.canVote && c.unvotedCC.length > 0) {
      post += `\n🏛️ CC${d.hasSummary ? ` (${c.yesPct.toFixed(0)}% / ${(c.threshold * 100).toFixed(0)}%)` : ""}:\n`;
      c.unvotedCC.forEach(cc => {
        post += `  • ${cc.name || cc.cc_id}\n`;
      });
    }
    if (s && s.hasSummary) {
      post += `\n🏊 SPO: ${s.yesPct.toFixed(1)}% / ${(s.threshold * 100).toFixed(0)}%`;
      if (s.thresholdMet) post += ` ✅\n`;else if (s.minSPOs.length > 0) {
        post += `\n`;
        [...s.minSPOs.slice(0, 5), ...s.extraSPOs.slice(0, 3)].forEach(sp => {
          post += `  • ${sp.ticker || sp.pool_id.slice(0, 15)} (₳${fmtAda(sp.active_stake)})\n`;
        });
      } else post += `\n`;
    }
    post += `\n🔗 https://adatool.net\n#Cardano #Governance`;
    return post;
  };
  const copyAll = () => {
    const texts = displayReminders.filter(r => r.drepData).map(r => generatePostForProp(r));
    const text = texts.join("\n\n─────────────\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const copySingle = rem => {
    navigator.clipboard.writeText(generatePostForProp(rem)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const postToX = text => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const postSingleToX = rem => postToX(generatePostForProp(rem));
  const postAllToX = () => {
    // X has a char limit (~280), so post the first proposal or a summary
    const texts = displayReminders.filter(r => r.drepData).map(r => generatePostForProp(r));
    if (texts.length === 1) {
      postToX(texts[0]);
      return;
    }
    // For multiple, post a combined summary (user can edit in X composer)
    postToX(texts.join("\n\n─────\n\n"));
  };

  // ─── Table header cell style ───
  const thS = {
    fontSize: 9,
    fontWeight: 700,
    padding: "4px 6px",
    textAlign: "left",
    borderBottom: "2px solid var(--border)",
    color: "var(--text2)",
    whiteSpace: "nowrap"
  };
  const tdS = {
    fontSize: 10,
    padding: "4px 6px",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "top"
  };
  return E("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 10
    }
  },
  // Header + controls
  E("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      flexWrap: "wrap",
      gap: 6
    }
  }, E("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)"
    }
  }, "📢 Vote Reminder"), E("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  },
  // Filter selector
  E("select", {
    value: filterProp,
    onChange: e => {
      setFilterProp(e.target.value);
      setExpandedProp(null);
    },
    style: {
      fontSize: 10,
      padding: "3px 6px",
      borderRadius: 5,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      maxWidth: 300
    }
  }, E("option", {
    value: "__all__"
  }, `All active (${activeProps.length})`), activeProps.map(p => E("option", {
    key: p.proposal_id,
    value: p.proposal_id
  }, `${(p.proposal_type || "").slice(0, 10)}: ${(p.title || p.proposal_id).slice(0, 40)}`))),
  // +α control
  E("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 3
    }
  }, E("span", {
    style: {
      fontSize: 9,
      color: "var(--text2)"
    }
  }, "+α:"), E("input", {
    type: "number",
    min: 0,
    max: 20,
    value: extraCount,
    onChange: e => setExtraCount(Math.max(0, Math.min(20, Number(e.target.value)))),
    style: {
      width: 36,
      fontSize: 10,
      padding: "2px 3px",
      borderRadius: 4,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--text)",
      textAlign: "center"
    }
  })),
  // Copy button
  E("button", {
    onClick: copyAll,
    className: "btn",
    style: {
      fontSize: 10,
      padding: "4px 10px",
      background: copied ? "#34d399" : "var(--accent)",
      color: "#fff",
      fontWeight: 600,
      borderRadius: 5,
      border: "none",
      cursor: "pointer"
    }
  }, copied ? "✅ Copied!" : "📋 Copy"),
  // Post to X button
  E("button", {
    onClick: postAllToX,
    className: "btn",
    style: {
      fontSize: 10,
      padding: "4px 10px",
      background: "#000",
      color: "#fff",
      fontWeight: 600,
      borderRadius: 5,
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 3
    }
  }, E("span", {
    style: {
      fontWeight: 900,
      fontSize: 11
    }
  }, "𝕏"), " Post"))),
  // Table
  activeProps.length > 0 ? E("div", {
    style: {
      overflowX: "auto"
    }
  }, E("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 10
    }
  }, E("thead", null, E("tr", null, E("th", {
    style: thS
  }, "Proposal"), E("th", {
    style: {
      ...thS
    }
  }, "⏰ Deadline"), E("th", {
    style: {
      ...thS,
      color: "#8b5cf6"
    }
  }, "🗳️ DRep"), E("th", {
    style: {
      ...thS,
      color: "#8b5cf6"
    }
  }, "Min DReps for YES"), E("th", {
    style: {
      ...thS,
      color: "#f59e0b"
    }
  }, "🏛️ CC Unvoted"), E("th", {
    style: {
      ...thS,
      color: "#06b6d4"
    }
  }, "🏊 SPO"), E("th", {
    style: {
      ...thS,
      color: "#06b6d4"
    }
  }, "Min SPOs for YES"), E("th", {
    style: {
      ...thS,
      width: 32
    }
  }, ""))), E("tbody", null, displayReminders.map(rem => {
    const p = rem.prop,
      d = rem.drepData,
      c = rem.ccData,
      s = rem.spoData;

    // Helper: render name list with collapse/expand for long lists
    const COLLAPSE_MAX = 3; // show this many rows when collapsed
    const nameList = (items, extraItems, getName, getStake, colId) => {
      const allItems = [...items, ...(extraItems || [])];
      const total = allItems.length;
      const expanded = isCellExpanded(p.proposal_id, colId);
      const needsCollapse = total > COLLAPSE_MAX + 1; // +1: don't collapse if only 1 extra
      const visibleItems = needsCollapse && !expanded ? allItems.slice(0, COLLAPSE_MAX) : allItems;
      const minCount = items.length;
      const renderItem = (item, i) => E("div", {
        key: i,
        style: {
          fontSize: 9,
          display: "flex",
          justifyContent: "space-between",
          padding: "1px 2px",
          fontWeight: i < minCount ? 600 : 400,
          opacity: i < minCount ? 1 : .55
        }
      }, E("span", {
        style: {
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 150
        }
      }, getName(item)), getStake && E("span", {
        style: {
          color: "var(--text2)",
          whiteSpace: "nowrap",
          marginLeft: 4
        }
      }, getStake(item)));
      return E("div", null, visibleItems.map((item, i) => renderItem(item, i)),
      // separator between min and extra (only when expanded)
      expanded && extraItems && extraItems.length > 0 && minCount <= visibleItems.length ? null : null, needsCollapse && E("div", {
        onClick: ev => {
          ev.stopPropagation();
          toggleCell(p.proposal_id, colId);
        },
        style: {
          fontSize: 8,
          color: "var(--accent)",
          cursor: "pointer",
          padding: "2px 0",
          textAlign: "center",
          userSelect: "none",
          borderTop: "1px dashed var(--border)",
          marginTop: 1
        }
      }, expanded ? "▲ collapse" : `▼ +${total - COLLAPSE_MAX} more`));
    };
    return E("tr", {
      key: p.proposal_id
    },
    // Proposal name
    E("td", {
      style: {
        ...tdS,
        maxWidth: 180
      }
    }, E("div", {
      style: {
        fontWeight: 600,
        fontSize: 10,
        lineHeight: "1.3"
      }
    }, `[${(p.proposal_type || "").slice(0, 10)}] ${(p.title || p.proposal_id).slice(0, 40)}`)),
    // Deadline
    E("td", {
      style: {
        ...tdS,
        whiteSpace: "nowrap",
        textAlign: "center"
      }
    }, E("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: daysLeft(p.expiration) <= 5 ? "#f87171" : daysLeft(p.expiration) <= 15 ? "#f59e0b" : "var(--text)"
      }
    }, `${daysLeft(p.expiration)}d`), E("div", {
      style: {
        fontSize: 8,
        color: "var(--text2)"
      }
    }, `E${lastVoteEpoch(p.expiration)}`), E("div", {
      style: {
        fontSize: 7,
        color: "var(--text2)"
      }
    }, fmtDateTime(epochDeadlineTs(p.expiration)))),
    // DRep %
    E("td", {
      style: {
        ...tdS,
        whiteSpace: "nowrap"
      }
    }, d.hasSummary ? E("span", {
      style: {
        color: d.deficit <= 0 ? "#34d399" : "#f87171",
        fontWeight: 600
      }
    }, `${d.yesPct.toFixed(1)}%/${(d.threshold * 100).toFixed(0)}%`) : E("span", {
      style: {
        color: "var(--text2)",
        fontSize: 9
      }
    }, "?%"), d.hasSummary && d.deficit <= 0 ? " ✅" : ""),
    // Min DReps — show names + stake
    E("td", {
      style: {
        ...tdS,
        minWidth: 160
      }
    }, d.hasSummary && d.deficit <= 0 ? E("span", {
      style: {
        color: "#34d399",
        fontSize: 9
      }
    }, "✅ Threshold met") : !d.hasSummary ? nameList(d.minDreps, d.extraDreps, dr => dr.name || dr.drep_id.slice(0, 20), dr => "₳" + fmtStake(dr.amount), "drep") : d.minDreps.length === 0 ? E("span", {
      style: {
        color: "#f87171",
        fontSize: 9
      }
    }, "Unreachable") : nameList(d.minDreps, d.extraDreps, dr => dr.name || dr.drep_id.slice(0, 20), dr => "₳" + fmtStake(dr.amount), "drep")),
    // CC unvoted — show names (collapsible)
    E("td", {
      style: {
        ...tdS,
        minWidth: 120
      }
    }, !c.canVote ? E("span", {
      style: {
        color: "var(--text2)",
        opacity: .4,
        fontSize: 9
      }
    }, "N/A") : c.unvotedCC.length === 0 ? E("span", {
      style: {
        color: "#34d399",
        fontSize: 9
      }
    }, "✅ All voted") : (() => {
      const ccExpanded = isCellExpanded(p.proposal_id, "cc");
      const ccNeedsCollapse = c.unvotedCC.length > COLLAPSE_MAX + 1;
      const ccVisible = ccNeedsCollapse && !ccExpanded ? c.unvotedCC.slice(0, COLLAPSE_MAX) : c.unvotedCC;
      return E("div", null, E("div", {
        style: {
          fontSize: 8,
          color: "var(--text2)",
          marginBottom: 1
        }
      }, `${c.yesPct.toFixed(0)}%/${(c.threshold * 100).toFixed(0)}%`), ccVisible.map(cc => E("div", {
        key: cc.cc_id,
        style: {
          fontSize: 9,
          padding: "1px 0"
        }
      }, cc.name || cc.cc_id.slice(0, 22))), ccNeedsCollapse && E("div", {
        onClick: ev => {
          ev.stopPropagation();
          toggleCell(p.proposal_id, "cc");
        },
        style: {
          fontSize: 8,
          color: "var(--accent)",
          cursor: "pointer",
          padding: "2px 0",
          textAlign: "center",
          userSelect: "none",
          borderTop: "1px dashed var(--border)",
          marginTop: 1
        }
      }, ccExpanded ? "▲ collapse" : `▼ +${c.unvotedCC.length - COLLAPSE_MAX} more`));
    })()),
    // SPO %
    E("td", {
      style: {
        ...tdS,
        whiteSpace: "nowrap"
      }
    }, !s ? E("span", {
      style: {
        color: "var(--text2)",
        opacity: .4,
        fontSize: 9
      }
    }, "N/A") : !s.hasSummary ? E("span", {
      style: {
        color: "var(--text2)",
        fontSize: 9
      }
    }, "?%") : E("span", {
      style: {
        color: s.thresholdMet ? "#34d399" : "#f87171",
        fontWeight: 600
      }
    }, `${s.yesPct.toFixed(1)}%/${(s.threshold * 100).toFixed(0)}%`), s && s.hasSummary && s.thresholdMet ? " ✅" : ""),
    // Min SPOs — show tickers + stake
    E("td", {
      style: {
        ...tdS,
        minWidth: 140
      }
    }, !s ? E("span", {
      style: {
        color: "var(--text2)",
        opacity: .4,
        fontSize: 9
      }
    }, "—") : !s.hasSummary ? E("span", {
      style: {
        color: "var(--text2)",
        fontSize: 9
      }
    }, "(no data)") : s.thresholdMet ? E("span", {
      style: {
        color: "#34d399",
        fontSize: 9
      }
    }, "✅ Threshold met") : s.minSPOs.length === 0 ? E("span", {
      style: {
        color: "#f87171",
        fontSize: 9
      }
    }, "Unreachable") : nameList(s.minSPOs, s.extraSPOs, sp => sp.ticker || sp.pool_id.slice(0, 12), sp => "₳" + fmtStake(sp.active_stake), "spo")),
    // Copy & Post
    E("td", {
      style: {
        ...tdS,
        textAlign: "center",
        whiteSpace: "nowrap"
      }
    }, E("button", {
      onClick: ev => {
        ev.stopPropagation();
        copySingle(rem);
      },
      title: "Copy",
      style: {
        fontSize: 9,
        padding: "2px 5px",
        background: "transparent",
        color: "var(--text2)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        cursor: "pointer",
        marginRight: 3
      }
    }, "📋"), E("button", {
      onClick: ev => {
        ev.stopPropagation();
        postSingleToX(rem);
      },
      title: "Post to X",
      style: {
        fontSize: 9,
        padding: "2px 5px",
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        fontWeight: 900
      }
    }, "𝕏")));
  })))) : E("div", {
    style: {
      fontSize: 10,
      color: "var(--text2)",
      padding: 8,
      textAlign: "center"
    }
  }, "No active proposals"));
}

// (VetoRow removed — veto coalition now rendered inline in GovernanceDataTab)

// ═══════════════════════════════════════════════════════════════════
// DRep Hub Tab (β) — Unified ADA Digest
// ═══════════════════════════════════════════════════════════════════
function DRepHubTab({
  proposals,
  votes,
  T,
  lang
}) {
  const [showNotifPanel, setShowNotifPanel] = React.useState(false);
  const [email, setEmail] = React.useState(() => {
    try {
      return localStorage.getItem("drephub_email") || "";
    } catch {
      return "";
    }
  });
  const [notif, setNotif] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("drephub_notif") || "null") || {
        newGa: true,
        urgent: true,
        signals: true,
        digest: true,
        weekly: false
      };
    } catch {
      return {
        newGa: true,
        urgent: true,
        signals: true,
        digest: true,
        weekly: false
      };
    }
  });
  const [saved, setSaved] = React.useState(false);
  const [filter, setFilter] = React.useState("all"); // "all","ga","alert","discussion","signal"
  const [expandedItems, setExpandedItems] = React.useState({});
  const E = React.createElement;

  // ─── Helpers ───
  const sentimentColor = s => s === "positive" ? "var(--yes)" : s === "negative" ? "var(--no)" : s === "mixed" ? "var(--abstain)" : "var(--text2)";
  const sentimentLabel = s => T["dreph_digest_" + s] || s;
  const voteColor = v => v === "Yes" ? "var(--yes)" : v === "No" ? "var(--no)" : "var(--abstain)";
  const priorityColor = p => p === "high" ? "var(--no)" : p === "medium" ? "var(--abstain)" : "var(--text2)";
  const toggleExpand = id => setExpandedItems(prev => ({
    ...prev,
    [id]: !prev[id]
  }));

  // ─── Build Unified Feed ───
  // 1) Active Governance Actions → type "ga"
  const gaItems = (proposals || []).filter(p => !p.status || p.status === "active" || p.status === "voting" || p.status === "passing").map(p => {
    const voteKeys = Object.keys(votes || {}).filter(k => k.includes(p.proposal_id));
    const yc = voteKeys.filter(k => votes[k] === "Yes").length;
    const nc = voteKeys.filter(k => votes[k] === "No").length;
    const ac = voteKeys.filter(k => votes[k] === "Abstain").length;
    return {
      id: "ga_" + p.proposal_id,
      type: "ga",
      date: "E" + (p.epoch_no || p.expiration || "?"),
      sortKey: p.epoch_no || p.expiration || 0,
      title: p.title || p.proposal_id?.slice(0, 20) + "…",
      actionType: p.proposal_type || "Unknown",
      yc,
      nc,
      ac,
      expiration: p.expiration,
      proposal: p
    };
  });

  // 2) Alerts / Incidents → type "alert"
  const alertItems = [{
    id: "alert_deadline",
    type: "alert",
    date: "2026-03-05",
    sortKey: 999,
    priority: "high",
    title: lang === "ja" ? "投票期限迫る — 未投票GAあり" : "Vote Deadline Approaching — Unvoted GAs Remain",
    desc: lang === "ja" ? "今エポック末に期限を迎えるGAがあります。未投票のDRepは早めの対応を。" : "GAs expiring this epoch. DReps who haven't voted should act soon.",
    daysLeft: 2
  }, {
    id: "alert_cc",
    type: "alert",
    date: "2026-03-04",
    sortKey: 998,
    priority: "medium",
    title: lang === "ja" ? "CC委員の任期満了が近い" : "CC Member Terms Expiring Soon",
    desc: lang === "ja" ? "2名のCC委員の任期が今月末に満了。UpdateCommitteeアクションが必要になる可能性。" : "2 CC members' terms expiring end of month. May require UpdateCommittee action.",
    daysLeft: 25
  }, {
    id: "alert_draft1",
    type: "alert",
    date: "2026-03-03",
    sortKey: 997,
    priority: "medium",
    title: lang === "ja" ? "[草案] エコシステム助成金プログラム — フィードバック募集中" : "[Draft] Ecosystem Grant Program — Seeking Feedback",
    desc: lang === "ja" ? "年間₳2Mの助成金プログラム草案。Cardano Forumで議論中。DRepの意見を求めています。" : "Draft for annual ₳2M grant program. Under discussion on Cardano Forum. DRep input requested.",
    responses: 18
  }];

  // 3) Discussion Digest → type "discussion"
  const discussionItems = [{
    id: "disc_1",
    type: "discussion",
    date: "2026-03-04",
    sortKey: 996,
    source: "X (Twitter)",
    sentiment: "mixed",
    title: lang === "ja" ? "憲法v2.4の賛否議論 — 主要DRepの立場が分かれる" : "Constitution v2.4 Debate — Major DReps Split",
    desc: lang === "ja" ? "拘束力のない条項の削除を支持する声と慎重な声が混在。主要DRepの多くは条件付き賛成。タイムラインへの懸念も。" : "Mixed views on removing non-binding provisions. Most major DReps conditionally supportive, concerns about rushed timeline.",
    mentions: ["Cardano Foundation", "YUTA", "Intersect"]
  }, {
    id: "disc_2",
    type: "discussion",
    date: "2026-03-03",
    sortKey: 995,
    source: "Cardano Forum",
    sentiment: "positive",
    title: lang === "ja" ? "トレジャリー引き出しの透明性基準が前進" : "Treasury Withdrawal Transparency Standards Advancing",
    desc: lang === "ja" ? "監査要件と透明性基準について議論が進展。定期的な報告義務と第三者監査の導入をコミュニティが推進。" : "Progress on audit requirements and transparency standards. Community pushing for regular reporting and third-party audits.",
    mentions: ["Cerkoryn", "Adam Dean", "CardanoSphere"]
  }, {
    id: "disc_3",
    type: "discussion",
    date: "2026-03-02",
    sortKey: 994,
    source: "Discord",
    sentiment: "neutral",
    title: lang === "ja" ? "DRep報酬モデルの比較検討が活発化" : "DRep Reward Model Comparison Gaining Traction",
    desc: lang === "ja" ? "投票率ペナルティ＋根拠提出ボーナスの組み合わせが有力。複数モデルの比較分析が進行中。" : "Vote-rate penalty + rationale bonus combination gaining favor. Comparative analysis of multiple models underway.",
    mentions: ["SIPO DRep", "Phil UPLC", "Goofycrisp"]
  }, {
    id: "disc_4",
    type: "discussion",
    date: "2026-03-01",
    sortKey: 993,
    source: "Telegram",
    sentiment: "negative",
    title: lang === "ja" ? "パラメータ変更提案に技術コミュニティが懸念" : "Technical Community Concerns on Parameter Change Proposal",
    desc: lang === "ja" ? "max_tx_size増加提案に対し、ブロックサイズとの整合性やネットワーク負荷への影響を懸念する声。" : "Concerns about max_tx_size increase — block size consistency and network load impact worries.",
    mentions: ["IOG", "Tweag", "Well-Typed"]
  }];

  // 4) DRep Signals → type "signal"
  const signalItems = [{
    id: "sig_1",
    type: "signal",
    date: "2026-03-06",
    sortKey: 992,
    drep: "Cardano Foundation",
    ga: "Constitution v2.4",
    vote: "Yes",
    confidence: 85,
    reason: lang === "ja" ? "透明性と説明責任の向上を支持" : "Supports improved transparency and accountability"
  }, {
    id: "sig_2",
    type: "signal",
    date: "2026-03-07",
    sortKey: 991,
    drep: "YUTA",
    ga: "Treasury Withdrawal ₳500K",
    vote: "Yes",
    confidence: 75,
    reason: lang === "ja" ? "エコシステム発展のための適切な投資" : "Appropriate investment for ecosystem development"
  }, {
    id: "sig_3",
    type: "signal",
    date: "2026-03-06",
    sortKey: 990,
    drep: "Yoroi Wallet",
    ga: "Constitution v2.4",
    vote: "Yes",
    confidence: 70,
    reason: lang === "ja" ? "条件付き賛成 — タイムラインの明確化が必要" : "Conditional yes — timeline needs clarification"
  }, {
    id: "sig_4",
    type: "signal",
    date: "2026-03-08",
    sortKey: 989,
    drep: "Army of Spies",
    ga: "Treasury Withdrawal ₳500K",
    vote: "No",
    confidence: 80,
    reason: lang === "ja" ? "監査メカニズムが不十分" : "Insufficient audit mechanisms"
  }, {
    id: "sig_5",
    type: "signal",
    date: "2026-03-09",
    sortKey: 988,
    drep: "Everstake",
    ga: "Param Change: max_tx_size",
    vote: "Abstain",
    confidence: 60,
    reason: lang === "ja" ? "技術的な影響評価がさらに必要" : "Need more technical impact assessment"
  }];

  // Merge & sort (alerts first, then by sortKey desc)
  const allItems = [...gaItems, ...alertItems, ...discussionItems, ...signalItems].sort((a, b) => {
    // alerts always on top
    if (a.type === "alert" && b.type !== "alert") return -1;
    if (b.type === "alert" && a.type !== "alert") return 1;
    return (b.sortKey || 0) - (a.sortKey || 0);
  });
  const filtered = filter === "all" ? allItems : allItems.filter(i => i.type === filter);

  // ─── Type badge config ───
  const typeBadge = type => {
    const map = {
      ga: {
        icon: "📢",
        label: lang === "ja" ? "新GA" : "New GA",
        bg: "rgba(59,130,246,.12)",
        color: "var(--accent2)",
        border: "rgba(59,130,246,.3)"
      },
      alert: {
        icon: "🚨",
        label: lang === "ja" ? "アラート" : "Alert",
        bg: "rgba(248,113,113,.12)",
        color: "var(--no)",
        border: "rgba(248,113,113,.3)"
      },
      discussion: {
        icon: "💬",
        label: lang === "ja" ? "議論" : "Discussion",
        bg: "rgba(139,92,246,.12)",
        color: "#a78bfa",
        border: "rgba(139,92,246,.3)"
      },
      signal: {
        icon: "📡",
        label: lang === "ja" ? "シグナル" : "Signal",
        bg: "rgba(52,211,153,.12)",
        color: "var(--yes)",
        border: "rgba(52,211,153,.3)"
      }
    };
    const m = map[type] || map.discussion;
    return E("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 4,
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        whiteSpace: "nowrap"
      }
    }, m.icon + " " + m.label);
  };

  // ─── Filter bar ───
  const filters = [{
    key: "all",
    label: lang === "ja" ? "すべて" : "All",
    count: allItems.length
  }, {
    key: "ga",
    label: lang === "ja" ? "新GA" : "GAs",
    count: gaItems.length
  }, {
    key: "alert",
    label: lang === "ja" ? "アラート" : "Alerts",
    count: alertItems.length
  }, {
    key: "discussion",
    label: lang === "ja" ? "議論" : "Discussion",
    count: discussionItems.length
  }, {
    key: "signal",
    label: lang === "ja" ? "シグナル" : "Signals",
    count: signalItems.length
  }];

  // ─── Notification settings ───
  const handleNotifSave = () => {
    try {
      localStorage.setItem("drephub_email", email);
      localStorage.setItem("drephub_notif", JSON.stringify(notif));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const toggleNotif = key => setNotif(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
  const ToggleSwitch = ({
    on,
    onClick
  }) => E("button", {
    onClick,
    style: {
      position: "relative",
      width: 40,
      height: 22,
      borderRadius: 11,
      border: "none",
      cursor: "pointer",
      background: on ? "var(--accent)" : "var(--border2)",
      transition: "background .2s",
      padding: 0,
      flexShrink: 0
    }
  }, E("span", {
    style: {
      position: "absolute",
      top: 2,
      left: on ? 20 : 2,
      width: 18,
      height: 18,
      borderRadius: 9,
      background: "#fff",
      transition: "left .2s",
      boxShadow: "0 1px 3px rgba(0,0,0,.3)"
    }
  }));

  // ─── Render each feed item ───
  const renderItem = item => {
    const isExpanded = !!expandedItems[item.id];

    // GA item
    if (item.type === "ga") {
      const aType = item.actionType;
      return E("div", {
        key: item.id,
        style: {
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 6,
          borderLeft: `3px solid ${actionColor(aType)}`
        }
      }, E("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }
      }, E("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center",
          flex: 1,
          minWidth: 0
        }
      }, typeBadge("ga"), E("span", {
        style: {
          fontSize: 9,
          fontWeight: 600,
          padding: "2px 5px",
          borderRadius: 3,
          background: actionColor(aType) + "18",
          color: actionColor(aType)
        }
      }, aType.replace("TreasuryWithdrawals", "Treasury").replace("ParameterChange", "Param").replace("HardForkInitiation", "HardFork").replace("NoConfidence", "NoConf").replace("UpdateCommittee", "CC Update").replace("NewConstitution", "Constitution")), E("span", {
        style: {
          fontSize: 10,
          color: "var(--text2)"
        }
      }, item.date)), E("div", {
        style: {
          display: "flex",
          gap: 8,
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0
        }
      }, E("span", {
        style: {
          color: "var(--yes)"
        }
      }, "Y:" + item.yc), E("span", {
        style: {
          color: "var(--no)"
        }
      }, "N:" + item.nc), E("span", {
        style: {
          color: "var(--abstain)"
        }
      }, "A:" + item.ac))), E("div", {
        style: {
          marginTop: 4,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          cursor: "pointer",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: isExpanded ? "normal" : "nowrap"
        },
        onClick: () => toggleExpand(item.id)
      }, item.title), item.expiration && E("div", {
        style: {
          marginTop: 3,
          fontSize: 9,
          color: "var(--text2)"
        }
      }, (lang === "ja" ? "有効期限: Epoch " : "Expires: Epoch ") + item.expiration));
    }

    // Alert item
    if (item.type === "alert") {
      return E("div", {
        key: item.id,
        style: {
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 6,
          borderLeft: `3px solid ${priorityColor(item.priority)}`
        }
      }, E("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }
      }, E("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center"
        }
      }, typeBadge("alert"), item.priority && E("span", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          padding: "1px 5px",
          borderRadius: 3,
          color: priorityColor(item.priority),
          background: item.priority === "high" ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)"
        }
      }, item.priority.toUpperCase()), E("span", {
        style: {
          fontSize: 10,
          color: "var(--text2)"
        }
      }, item.date)), item.daysLeft != null && E("span", {
        style: {
          fontSize: 10,
          color: "var(--no)",
          fontWeight: 700
        }
      }, lang === "ja" ? "残り" + item.daysLeft + "日" : item.daysLeft + "d left")), E("div", {
        style: {
          marginTop: 4,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)"
        }
      }, item.title), E("div", {
        style: {
          marginTop: 3,
          fontSize: 11,
          color: "var(--text2)",
          lineHeight: 1.5
        }
      }, item.desc), item.responses != null && E("div", {
        style: {
          marginTop: 4,
          fontSize: 10,
          color: "var(--accent2)",
          fontWeight: 600
        }
      }, item.responses + " " + (lang === "ja" ? "件の回答" : "responses")));
    }

    // Discussion item
    if (item.type === "discussion") {
      return E("div", {
        key: item.id,
        style: {
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 6,
          borderLeft: "3px solid #8b5cf6"
        }
      }, E("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }
      }, E("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center"
        }
      }, typeBadge("discussion"), E("span", {
        style: {
          fontSize: 9,
          padding: "2px 5px",
          borderRadius: 4,
          background: "var(--bg3)",
          color: "var(--accent2)",
          fontWeight: 600
        }
      }, item.source), E("span", {
        style: {
          fontSize: 10,
          color: "var(--text2)"
        }
      }, item.date)), E("span", {
        style: {
          fontSize: 9,
          padding: "2px 7px",
          borderRadius: 8,
          fontWeight: 600,
          color: sentimentColor(item.sentiment),
          background: item.sentiment === "positive" ? "rgba(52,211,153,.1)" : item.sentiment === "negative" ? "rgba(248,113,113,.1)" : item.sentiment === "mixed" ? "rgba(251,191,36,.1)" : "rgba(75,85,99,.1)"
        }
      }, sentimentLabel(item.sentiment))), E("div", {
        style: {
          marginTop: 4,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)"
        }
      }, item.title), E("div", {
        style: {
          marginTop: 3,
          fontSize: 11,
          color: "var(--text2)",
          lineHeight: 1.5
        }
      }, item.desc), item.mentions && E("div", {
        style: {
          marginTop: 5,
          display: "flex",
          gap: 4,
          flexWrap: "wrap"
        }
      }, item.mentions.map((m, j) => E("span", {
        key: j,
        style: {
          fontSize: 8,
          padding: "1px 5px",
          borderRadius: 3,
          background: "var(--border)",
          color: "var(--text2)"
        }
      }, m))));
    }

    // Signal item
    if (item.type === "signal") {
      return E("div", {
        key: item.id,
        style: {
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 6,
          borderLeft: `3px solid ${voteColor(item.vote)}`
        }
      }, E("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }
      }, E("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center"
        }
      }, typeBadge("signal"), E("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text)"
        }
      }, item.drep), E("span", {
        style: {
          fontSize: 10,
          color: "var(--text2)"
        }
      }, item.date)), E("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center"
        }
      }, E("span", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: voteColor(item.vote)
        }
      }, item.vote), E("span", {
        style: {
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 10,
          fontWeight: 600,
          background: item.confidence >= 70 ? "rgba(52,211,153,.15)" : item.confidence >= 40 ? "rgba(251,191,36,.15)" : "rgba(248,113,113,.15)",
          color: item.confidence >= 70 ? "var(--yes)" : item.confidence >= 40 ? "var(--abstain)" : "var(--no)"
        }
      }, item.confidence + "%"))), E("div", {
        style: {
          marginTop: 4,
          fontSize: 11,
          color: "var(--text2)"
        }
      }, E("span", {
        style: {
          color: "var(--text)",
          fontWeight: 500
        }
      }, item.ga), " — ", item.reason));
    }
    return null;
  };

  // ─── Main Render ───
  return E("div", {
    className: "card",
    style: {
      padding: 0
    }
  },
  // Header
  E("div", {
    style: {
      padding: "12px 20px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8
    }
  }, E("div", null, E("h2", {
    style: {
      color: "var(--accent2)",
      margin: 0,
      fontSize: 16
    }
  }, "📢 " + T.dreph_title), E("p", {
    style: {
      color: "var(--text2)",
      fontSize: 10,
      margin: "2px 0 0"
    }
  }, lang === "ja" ? "ガバナンスの全体像をここ1つで — GA・アラート・議論・シグナルを統合表示" : "Your single source for governance — GAs, alerts, discussions & signals in one feed")), E("button", {
    onClick: () => setShowNotifPanel(!showNotifPanel),
    style: {
      fontSize: 18,
      background: showNotifPanel ? "var(--accent)" : "var(--bg3)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      width: 36,
      height: 36,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: showNotifPanel ? "#fff" : "var(--text2)",
      transition: "all .15s"
    },
    title: lang === "ja" ? "通知設定" : "Notification Settings"
  }, showNotifPanel ? "✕" : "🔔")),
  // Notification Panel (collapsible)
  showNotifPanel && E("div", {
    style: {
      padding: "12px 20px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg3)"
    }
  }, E("div", {
    style: {
      maxWidth: 500,
      margin: "0 auto"
    }
  }, E("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--text)",
      marginBottom: 10
    }
  }, "🔔 " + (lang === "ja" ? "通知設定" : "Notification Settings")),
  // Email
  E("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 12
    }
  }, E("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: lang === "ja" ? "メールアドレス…" : "Email address…",
    style: {
      flex: 1,
      padding: "6px 10px",
      fontSize: 11,
      borderRadius: 6,
      border: "1px solid var(--border)",
      background: "var(--bg2)",
      color: "var(--text)"
    }
  }), E("button", {
    onClick: handleNotifSave,
    className: "btn btn-primary",
    style: {
      fontSize: 11,
      padding: "6px 14px"
    }
  }, saved ? lang === "ja" ? "保存済" : "Saved!" : lang === "ja" ? "保存" : "Save")),
  // Toggles
  [{
    key: "newGa",
    label: lang === "ja" ? "新しいGA" : "New GAs",
    icon: "📢"
  }, {
    key: "urgent",
    label: lang === "ja" ? "緊急アラート" : "Urgent Alerts",
    icon: "🚨"
  }, {
    key: "digest",
    label: lang === "ja" ? "議論ダイジェスト" : "Discussion Digest",
    icon: "💬"
  }, {
    key: "signals",
    label: lang === "ja" ? "DRepシグナル" : "DRep Signals",
    icon: "📡"
  }, {
    key: "weekly",
    label: lang === "ja" ? "週次まとめ" : "Weekly Summary",
    icon: "📋"
  }].map(n => E("div", {
    key: n.key,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 0",
      borderBottom: "1px solid var(--border)"
    }
  }, E("span", {
    style: {
      fontSize: 11,
      color: "var(--text)"
    }
  }, n.icon + " " + n.label), E(ToggleSwitch, {
    on: !!notif[n.key],
    onClick: () => toggleNotif(n.key)
  }))), E("div", {
    style: {
      textAlign: "center",
      marginTop: 8,
      fontSize: 9,
      color: "var(--text2)",
      opacity: 0.7
    }
  }, lang === "ja" ? "デモ: 設定はブラウザ内のみに保存されます" : "Demo: preferences saved in browser only"))),
  // Filter bar
  E("div", {
    style: {
      display: "flex",
      gap: 4,
      padding: "10px 16px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      overflowX: "auto",
      flexWrap: "wrap"
    }
  }, filters.map(f => E("button", {
    key: f.key,
    onClick: () => setFilter(f.key),
    style: {
      padding: "5px 12px",
      fontSize: 11,
      fontWeight: filter === f.key ? 700 : 500,
      borderRadius: 16,
      cursor: "pointer",
      background: filter === f.key ? "var(--accent)" : "var(--bg3)",
      color: filter === f.key ? "#fff" : "var(--text2)",
      border: filter === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
      transition: "all .15s",
      whiteSpace: "nowrap"
    }
  }, f.label + " (" + f.count + ")"))),
  // Sample data notice
  E("div", {
    style: {
      padding: "6px 16px",
      background: "var(--bg3)",
      fontSize: 9,
      color: "var(--accent2)",
      borderBottom: "1px solid var(--border)"
    }
  }, "ℹ️ " + T.dreph_mock_label + " — " + (lang === "ja" ? "自動収集パイプライン接続後に実データへ切り替わります" : "Will switch to live data once the automated collection pipeline is connected")),
  // Feed
  E("div", {
    style: {
      padding: "12px 16px",
      maxHeight: "75vh",
      overflowY: "auto"
    }
  }, filtered.length === 0 ? E("div", {
    style: {
      textAlign: "center",
      padding: 30,
      color: "var(--text2)",
      fontSize: 12
    }
  }, lang === "ja" ? "該当するアイテムがありません" : "No items match this filter") : filtered.map(item => renderItem(item))));
}

// ═══════════════════════════════════════════════════════════════════
// AI Analysis Tab (β)
// ═══════════════════════════════════════════════════════════════════
const PREDICT_WORKER_URL = "https://predict-vote.adatool.workers.dev";
const PREDICT_STORAGE_KEY = "adatool_saved_predictions";
function loadSavedPredictions() {
  try {
    return JSON.parse(localStorage.getItem(PREDICT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function savePredictions(list) {
  try {
    localStorage.setItem(PREDICT_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}
function AIAnalysisTab({
  aiDrepTendencies,
  aiProposalReasons,
  aiActionTypeSummary,
  aiMeta,
  proposals,
  T,
  lang
}) {
  const [subtab, setSubtab] = React.useState("tendencies");
  const [expandedRows, setExpandedRows] = React.useState({});
  // Vote prediction state
  const [predictText, setPredictText] = React.useState("");
  const [predictType, setPredictType] = React.useState("TreasuryWithdrawals");
  const [predictResult, setPredictResult] = React.useState(null);
  const [predictLoading, setPredictLoading] = React.useState(false);
  const [predictError, setPredictError] = React.useState(null);
  const [predictRemaining, setPredictRemaining] = React.useState(null);
  // Saved predictions state
  const [savedPredictions, setSavedPredictions] = React.useState(loadSavedPredictions);
  const [showSaved, setShowSaved] = React.useState(false);
  const [expandedSaved, setExpandedSaved] = React.useState({});
  const toggleRow = key => setExpandedRows(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
  const hasData = aiDrepTendencies || aiProposalReasons || aiActionTypeSummary;
  // Bilingual helper: pick en/ja field, fallback to old single field
  const L = (obj, field) => {
    if (!obj) return "";
    const v = obj[field + "_" + lang] || obj[field + "_en"] || obj[field] || "";
    return v;
  };
  const LA = (obj, field) => {
    if (!obj) return [];
    return obj[field + "_" + lang] || obj[field + "_en"] || obj[field] || [];
  };
  if (!hasData) {
    return React.createElement("div", {
      className: "card",
      style: {
        padding: 32,
        textAlign: "center"
      }
    }, React.createElement("h2", {
      style: {
        color: "var(--accent2)",
        marginBottom: 16
      }
    }, "🤖 " + T.ai_title), React.createElement("p", {
      style: {
        color: "var(--text2)"
      }
    }, T.ai_no_data), React.createElement("p", {
      style: {
        color: "var(--text2)",
        fontSize: 12,
        marginTop: 8
      }
    }, T.ai_no_data_desc));
  }
  const fmtS = fmtStakeShort;
  const fmtDate = iso => iso ? iso.split("T")[0] : "—";
  const E = React.createElement;
  const thS = {
    padding: "5px 8px",
    fontSize: 10,
    color: "var(--text2)",
    fontWeight: 600,
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "var(--bg)",
    zIndex: 1
  };
  const tdS = {
    padding: "5px 8px",
    fontSize: 11,
    color: "var(--text)",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle"
  };
  const lbS = {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2
  }; // label style

  // ─── Sub-tab: DRep Tendencies (table, multi-expand) ───
  const renderTendencies = () => {
    if (!aiDrepTendencies?.dreps) return E("p", {
      style: {
        color: "var(--text2)"
      }
    }, T.ai_no_data_short);
    const dreps = Object.entries(aiDrepTendencies.dreps).sort((a, b) => Number(b[1].stake) - Number(a[1].stake));
    return E("div", null, E("p", {
      style: {
        color: "var(--text2)",
        fontSize: 11,
        marginBottom: 8
      }
    }, `${dreps.length} ${T.ai_dreps_analyzed} · ${T.ai_generated}: ${fmtDate(aiDrepTendencies.generatedAt)}`), E("div", {
      style: {
        overflowX: "auto",
        maxHeight: "70vh",
        overflowY: "auto"
      }
    }, E("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 11
      }
    }, E("thead", null, E("tr", null, E("th", {
      style: {
        ...thS,
        width: 30
      }
    }, "#"), E("th", {
      style: thS
    }, "DRep"), E("th", {
      style: {
        ...thS,
        textAlign: "right"
      }
    }, "Stake"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        color: "var(--yes)",
        width: 28
      }
    }, "Y"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        color: "var(--no)",
        width: 28
      }
    }, "N"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        color: "var(--abstain)",
        width: 28
      }
    }, "A"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        color: "var(--nv)",
        width: 28
      }
    }, T.ai_not_voted), E("th", {
      style: {
        ...thS,
        width: 80
      }
    }, ""), E("th", {
      style: thS
    }, T.ai_tendency))), E("tbody", null, dreps.map(([id, d]) => {
      const isExp = !!expandedRows["d_" + id];
      const total = d.voteSpread.yes + d.voteSpread.no + d.voteSpread.abstain;
      const yP = total ? d.voteSpread.yes / total * 100 : 0;
      const nP = total ? d.voteSpread.no / total * 100 : 0;
      const aP = total ? d.voteSpread.abstain / total * 100 : 0;
      const nv = Math.max(0, (d.totalVotes || 0) - total);
      const summary = L(d, "tendencySummary");
      const kp = LA(d, "keyPositions");
      const vp = L(d, "votingPattern");
      return E(React.Fragment, {
        key: id
      }, E("tr", {
        onClick: () => toggleRow("d_" + id),
        style: {
          cursor: "pointer",
          background: isExp ? "#151b28" : "transparent",
          transition: "background .1s"
        }
      }, E("td", {
        style: {
          ...tdS,
          color: "var(--text2)",
          textAlign: "center",
          fontSize: 10
        }
      }, d.rank), E("td", {
        style: {
          ...tdS,
          fontWeight: 600,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, d.name), E("td", {
        style: {
          ...tdS,
          textAlign: "right",
          color: "var(--text2)",
          whiteSpace: "nowrap"
        }
      }, "₳" + fmtS(d.stake)), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--yes)"
        }
      }, d.voteSpread.yes), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--no)"
        }
      }, d.voteSpread.no), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--abstain)"
        }
      }, d.voteSpread.abstain), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--nv)"
        }
      }, nv), E("td", {
        style: {
          ...tdS,
          padding: "5px 4px"
        }
      }, total > 0 && E("div", {
        style: {
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--border)",
          width: 80
        }
      }, E("div", {
        style: {
          width: yP + "%",
          background: "var(--yes)"
        }
      }), E("div", {
        style: {
          width: nP + "%",
          background: "var(--no)"
        }
      }), E("div", {
        style: {
          width: aP + "%",
          background: "var(--abstain)"
        }
      }))), E("td", {
        style: {
          ...tdS,
          color: "var(--text2)",
          fontSize: 10,
          maxWidth: 260,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, truncStr(summary, 60))), isExp && E("tr", {
        key: id + "_exp"
      }, E("td", {
        colSpan: 9,
        style: {
          padding: "12px 16px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)"
        }
      }, E("div", {
        style: {
          fontSize: 12,
          color: "var(--text2)",
          marginBottom: 10,
          lineHeight: 1.6
        }
      }, summary), kp && kp.length > 0 && E("div", {
        style: {
          marginBottom: 10
        }
      }, E("div", {
        style: {
          ...lbS,
          color: "var(--accent2)"
        }
      }, T.ai_key_positions + ":"), E("ul", {
        style: {
          margin: "4px 0 0 16px",
          padding: 0
        }
      }, kp.map((pos, i) => E("li", {
        key: i,
        style: {
          color: "var(--text2)",
          fontSize: 11,
          marginBottom: 3,
          lineHeight: 1.5
        }
      }, pos)))), vp && E("div", {
        style: {
          marginBottom: 10
        }
      }, E("div", {
        style: {
          ...lbS,
          color: "var(--accent2)"
        }
      }, T.ai_voting_pattern + ":"), E("div", {
        style: {
          color: "var(--text2)",
          fontSize: 11,
          marginTop: 2
        }
      }, "📊 " + vp)), E("div", {
        style: {
          color: "var(--text2)",
          fontSize: 10,
          marginTop: 4
        }
      }, `${T.ai_with_rationale}: ${d.withRationale}/${d.totalVotes} · ${fmtDate(d.lastAnalyzedAt)}` + (d.cached ? " (cached)" : "")))));
    })))));
  };

  // ─── Sub-tab: Proposal Vote Reasons (table, sorted by epoch desc) ───
  const renderProposalReasons = () => {
    if (!aiProposalReasons?.proposals) return E("p", {
      style: {
        color: "var(--text2)"
      }
    }, T.ai_no_data_short);
    const propEntries = Object.entries(aiProposalReasons.proposals).sort((a, b) => {
      // Sort by submittedEpoch desc, fallback to key
      const ae = a[1].submittedEpoch || 0;
      const be = b[1].submittedEpoch || 0;
      if (be !== ae) return be - ae;
      return b[0].localeCompare(a[0]);
    });
    const renderReasonGroup = (reasons, label, color) => {
      if (!reasons || reasons.length === 0) return null;
      return E("div", {
        style: {
          marginBottom: 14
        }
      }, E("div", {
        style: {
          color,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6
        }
      }, label), reasons.map((r, i) => E("div", {
        key: i,
        style: {
          background: "var(--bg3)",
          borderRadius: 4,
          padding: "8px 10px",
          marginBottom: 5,
          borderLeft: `3px solid ${color}`
        }
      }, E("div", {
        style: {
          color: "var(--text)",
          fontSize: 11,
          marginBottom: 4,
          lineHeight: 1.5
        }
      }, L(r, "reason")), E("div", {
        style: {
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: 10
        }
      }, E("span", {
        style: {
          color: "var(--text2)",
          fontWeight: 600
        }
      }, T.ai_total_stake + ": ₳" + fmtS(r.totalStake)), (r.dreps || []).map((dr, j) => E("span", {
        key: j,
        style: {
          color: "var(--text2)",
          background: "var(--border)",
          borderRadius: 3,
          padding: "1px 5px"
        }
      }, (dr.name || dr) + (dr.stake && Number(dr.stake) > 0 ? " ₳" + fmtS(dr.stake) : "")))))));
    };
    const renderBreakdown = (bd, label, color) => {
      if (!bd) return null;
      return E("div", {
        style: {
          marginBottom: 6,
          fontSize: 10
        }
      }, E("span", {
        style: {
          color,
          fontWeight: 600
        }
      }, label + ": "), E("span", {
        style: {
          color: "var(--text2)"
        }
      }, `${bd.total} (${T.ai_with_rationale}: ${bd.withRationale}, ${T.ai_without_rationale}: ${bd.withoutRationale}) · ₳${fmtS(bd.totalStake)}`), bd.withoutRationale > 0 && bd.withoutRationaleDreps && bd.withoutRationaleDreps.length > 0 && E("div", {
        style: {
          color: "var(--text2)",
          marginTop: 2,
          paddingLeft: 8
        }
      }, (lang === "ja" ? "根拠なし: " : "No rationale: ") + bd.withoutRationaleDreps.map(d => d.name + " ₳" + fmtS(d.stake)).join(", ")));
    };
    return E("div", null, E("p", {
      style: {
        color: "var(--text2)",
        fontSize: 11,
        marginBottom: 8
      }
    }, `${T.ai_generated}: ${fmtDate(aiProposalReasons.generatedAt)}`), E("div", {
      style: {
        overflowX: "auto",
        maxHeight: "70vh",
        overflowY: "auto"
      }
    }, E("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 11
      }
    }, E("thead", null, E("tr", null, E("th", {
      style: thS
    }, "GA"), E("th", {
      style: {
        ...thS,
        width: 100
      }
    }, "Type"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 50
      }
    }, T.ai_with_rationale), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 50
      }
    }, T.ai_without_rationale), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 50
      }
    }, T.ai_not_voted_long), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 30,
        color: "var(--yes)"
      }
    }, "Y"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 30,
        color: "var(--no)"
      }
    }, "N"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 30,
        color: "var(--abstain)"
      }
    }, "A"))), E("tbody", null, propEntries.map(([key, val]) => {
      const isExp = !!expandedRows["p_" + key];
      const yC = val.yesReasons?.length || 0;
      const nC = val.noReasons?.length || 0;
      const aC = val.abstainReasons?.length || 0;
      const st = val.stats || {};
      return E(React.Fragment, {
        key
      }, E("tr", {
        onClick: () => toggleRow("p_" + key),
        style: {
          cursor: "pointer",
          background: isExp ? "#151b28" : "transparent",
          transition: "background .1s"
        }
      }, E("td", {
        style: {
          ...tdS,
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 500
        }
      }, val.title || key.slice(0, 20)), E("td", {
        style: {
          ...tdS,
          color: "var(--text2)",
          fontSize: 10
        }
      }, val.type), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--accent2)"
        }
      }, st.votedWithRationale || 0), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--abstain)"
        }
      }, st.votedWithoutRationale || 0), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--no)"
        }
      }, st.notVoted || 0), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--yes)"
        }
      }, yC), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--no)"
        }
      }, nC), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--abstain)"
        }
      }, aC)), isExp && E("tr", {
        key: key + "_exp"
      }, E("td", {
        colSpan: 8,
        style: {
          padding: "12px 16px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)"
        }
      },
      // Vote breakdown per category
      st.yesBreakdown && renderBreakdown(st.yesBreakdown, "Yes", "var(--yes)"), st.noBreakdown && renderBreakdown(st.noBreakdown, "No", "var(--no)"), st.abstainBreakdown && renderBreakdown(st.abstainBreakdown, "Abstain", "var(--abstain)"),
      // NotVoted info
      st.notVoted > 0 && E("div", {
        style: {
          fontSize: 10,
          marginBottom: 10,
          color: "var(--text2)"
        }
      }, E("span", {
        style: {
          color: "var(--nv)",
          fontWeight: 600
        }
      }, T.ai_not_voted_long + ": "), E("span", null, `${st.notVoted} · ₳${fmtS(st.notVotedTotalStake || 0)}`), st.notVotedTopDreps && st.notVotedTopDreps.length > 0 && E("div", {
        style: {
          marginTop: 2,
          paddingLeft: 8
        }
      }, "Top: " + st.notVotedTopDreps.map(d => d.name + " ₳" + fmtS(d.stake)).join(", "))),
      // Reason groups
      renderReasonGroup(val.yesReasons, "✅ " + T.ai_yes_reasons, "#4fc3f7"), renderReasonGroup(val.noReasons, "❌ " + T.ai_no_reasons, "#ff7043"), renderReasonGroup(val.abstainReasons, "⚖️ " + T.ai_abstain_reasons, "#ffb74d"))));
    })))));
  };

  // ─── Sub-tab: Action Type Summary (table, multi-expand) ───
  const renderActionTypeSummary = () => {
    if (!aiActionTypeSummary?.actionTypes) return E("p", {
      style: {
        color: "var(--text2)"
      }
    }, T.ai_no_data_short);
    const types = Object.entries(aiActionTypeSummary.actionTypes);
    return E("div", null, E("p", {
      style: {
        color: "var(--text2)",
        fontSize: 11,
        marginBottom: 8
      }
    }, `${T.ai_generated}: ${fmtDate(aiActionTypeSummary.generatedAt)}`), E("div", {
      style: {
        overflowX: "auto"
      }
    }, E("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 11
      }
    }, E("thead", null, E("tr", null, E("th", {
      style: thS
    }, "Type"), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        width: 40
      }
    }, "#"), E("th", {
      style: thS
    }, T.ai_typical_yes), E("th", {
      style: thS
    }, T.ai_typical_no))), E("tbody", null, types.map(([type, data]) => {
      const isExp = !!expandedRows["t_" + type];
      const yR = LA(data, "typicalReasonsYes");
      const nR = LA(data, "typicalReasonsNo");
      return E(React.Fragment, {
        key: type
      }, E("tr", {
        onClick: () => toggleRow("t_" + type),
        style: {
          cursor: "pointer",
          background: isExp ? "#151b28" : "transparent",
          transition: "background .1s"
        }
      }, E("td", {
        style: {
          ...tdS,
          fontWeight: 600,
          color: "var(--accent2)"
        }
      }, type), E("td", {
        style: {
          ...tdS,
          textAlign: "center",
          color: "var(--text2)"
        }
      }, data.count), E("td", {
        style: {
          ...tdS,
          color: "var(--yes)",
          fontSize: 10,
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, yR.join(", ")), E("td", {
        style: {
          ...tdS,
          color: "var(--no)",
          fontSize: 10,
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, nR.join(", "))), isExp && E("tr", {
        key: type + "_exp"
      }, E("td", {
        colSpan: 4,
        style: {
          padding: "12px 16px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)"
        }
      }, E("div", {
        style: {
          color: "var(--text2)",
          fontSize: 12,
          marginBottom: 10,
          lineHeight: 1.6
        }
      }, L(data, "summary")), yR.length > 0 && E("div", {
        style: {
          marginBottom: 8
        }
      }, E("div", {
        style: {
          color: "var(--yes)",
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 2
        }
      }, T.ai_typical_yes + ":"), E("ul", {
        style: {
          margin: "2px 0 0 16px",
          padding: 0
        }
      }, yR.map((r, i) => E("li", {
        key: i,
        style: {
          color: "var(--text2)",
          fontSize: 11,
          marginBottom: 2
        }
      }, r)))), nR.length > 0 && E("div", null, E("div", {
        style: {
          color: "var(--no)",
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 2
        }
      }, T.ai_typical_no + ":"), E("ul", {
        style: {
          margin: "2px 0 0 16px",
          padding: 0
        }
      }, nR.map((r, i) => E("li", {
        key: i,
        style: {
          color: "var(--text2)",
          fontSize: 11,
          marginBottom: 2
        }
      }, r)))))));
    })))));
  };

  // ─── Sub-tab: Vote Prediction ───
  const ACTION_TYPES = ["TreasuryWithdrawals", "ParameterChange", "HardForkInitiation", "NoConfidence", "UpdateCommittee", "NewConstitution", "InfoAction"];
  const doPrediction = async () => {
    if (!PREDICT_WORKER_URL) {
      setPredictError(T.ai_predict_no_worker);
      return;
    }
    if (!predictText.trim() || predictText.trim().length < 10) return;
    setPredictLoading(true);
    setPredictError(null);
    setPredictResult(null);
    try {
      const res = await fetch(PREDICT_WORKER_URL + "/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: predictText,
          actionType: predictType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setPredictResult(data);
      if (data.remaining != null) setPredictRemaining(data.remaining);
    } catch (e) {
      setPredictError(e.message);
    } finally {
      setPredictLoading(false);
    }
  };
  const savePredictionResult = () => {
    if (!predictResult) return;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: predictText.slice(0, 200),
      actionType: predictType,
      result: predictResult
    };
    const updated = [entry, ...savedPredictions].slice(0, 50); // keep max 50
    setSavedPredictions(updated);
    savePredictions(updated);
  };
  const deleteSavedPrediction = id => {
    const updated = savedPredictions.filter(s => s.id !== id);
    setSavedPredictions(updated);
    savePredictions(updated);
  };
  const renderPredictionTable = (result, isCompact) => {
    const voteColor = v => v === "Yes" ? "var(--yes)" : v === "No" ? "var(--no)" : "var(--abstain)";
    if (!result || !result.predictions) return null;
    return E("div", null, E("div", {
      style: {
        padding: isCompact ? 8 : 10,
        borderRadius: 6,
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        marginBottom: isCompact ? 8 : 12,
        fontSize: isCompact ? 11 : 12,
        color: "var(--text)"
      }
    }, lang === "ja" ? result.summary_ja : result.summary_en), E("div", {
      style: {
        overflowX: "auto"
      }
    }, E("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 11
      }
    }, E("thead", null, E("tr", null, E("th", {
      style: {
        ...thS,
        minWidth: 100
      }
    }, T.ai_predict_result_name), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        minWidth: 60
      }
    }, T.ai_predict_result_vote), E("th", {
      style: {
        ...thS,
        textAlign: "center",
        minWidth: 60
      }
    }, T.ai_predict_result_confidence), E("th", {
      style: {
        ...thS,
        minWidth: 200
      }
    }, T.ai_predict_result_reason))), E("tbody", null, result.predictions.map((p, i) => E("tr", {
      key: i,
      style: {
        borderBottom: "1px solid var(--border)"
      }
    }, E("td", {
      style: {
        ...tdS,
        fontWeight: 600
      }
    }, p.name), E("td", {
      style: {
        ...tdS,
        textAlign: "center",
        fontWeight: 700,
        color: voteColor(p.vote)
      }
    }, p.vote), E("td", {
      style: {
        ...tdS,
        textAlign: "center"
      }
    }, E("span", {
      style: {
        display: "inline-block",
        padding: "2px 6px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        background: p.confidence >= 70 ? "rgba(52,211,153,.15)" : p.confidence >= 40 ? "rgba(251,191,36,.15)" : "rgba(248,113,113,.15)",
        color: p.confidence >= 70 ? "var(--yes)" : p.confidence >= 40 ? "var(--abstain)" : "var(--no)"
      }
    }, p.confidence + "%")), E("td", {
      style: {
        ...tdS,
        color: "var(--text2)",
        fontSize: 10
      }
    }, lang === "ja" ? p.reason_ja : p.reason_en)))))), (() => {
      const yes = result.predictions.filter(p => p.vote === "Yes").length;
      const no = result.predictions.filter(p => p.vote === "No").length;
      const abs = result.predictions.filter(p => p.vote === "Abstain").length;
      const total = result.predictions.length;
      return E("div", {
        style: {
          marginTop: 8,
          display: "flex",
          gap: 12,
          justifyContent: "center",
          fontSize: 11
        }
      }, E("span", {
        style: {
          color: "var(--yes)",
          fontWeight: 600
        }
      }, "✓ Yes: " + yes + " (" + Math.round(yes / total * 100) + "%)"), E("span", {
        style: {
          color: "var(--no)",
          fontWeight: 600
        }
      }, "✗ No: " + no + " (" + Math.round(no / total * 100) + "%)"), E("span", {
        style: {
          color: "var(--abstain)",
          fontWeight: 600
        }
      }, "− Abstain: " + abs + " (" + Math.round(abs / total * 100) + "%)"));
    })());
  };
  const renderPredict = () => {
    return E("div", {
      style: {
        maxWidth: 800,
        margin: "0 auto"
      }
    }, E("p", {
      style: {
        color: "var(--text2)",
        fontSize: 12,
        marginBottom: 12
      }
    }, T.ai_predict_desc),
    // Input area
    E("textarea", {
      value: predictText,
      onChange: e => setPredictText(e.target.value),
      placeholder: T.ai_predict_input,
      style: {
        width: "100%",
        minHeight: 120,
        padding: 10,
        fontSize: 12,
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--bg2)",
        color: "var(--text)",
        resize: "vertical",
        fontFamily: "inherit"
      }
    }), E("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 8,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, E("select", {
      value: predictType,
      onChange: e => setPredictType(e.target.value),
      style: {
        padding: "6px 10px",
        fontSize: 11,
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--bg2)",
        color: "var(--text)"
      }
    }, ACTION_TYPES.map(t => E("option", {
      key: t,
      value: t
    }, t))), E("button", {
      onClick: doPrediction,
      disabled: predictLoading || !predictText.trim(),
      className: "btn btn-primary",
      style: {
        fontSize: 12,
        padding: "6px 16px",
        opacity: predictLoading ? .6 : 1
      }
    }, predictLoading ? "⏳ " + T.ai_predict_loading : "🔮 " + T.ai_predict_btn), predictRemaining != null && E("span", {
      style: {
        fontSize: 10,
        color: "var(--text2)"
      }
    }, predictRemaining + " " + T.ai_predict_remaining)),
    // Error
    predictError && E("div", {
      style: {
        marginTop: 10,
        padding: 8,
        borderRadius: 6,
        background: "rgba(248,113,113,.1)",
        border: "1px solid rgba(248,113,113,.3)",
        color: "var(--no)",
        fontSize: 11
      }
    }, predictError),
    // Results
    predictResult && E("div", {
      style: {
        marginTop: 16
      }
    },
    // Save button
    E("div", {
      style: {
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 8
      }
    }, E("button", {
      onClick: savePredictionResult,
      className: "btn",
      style: {
        fontSize: 11,
        padding: "4px 12px",
        background: "var(--bg3)",
        border: "1px solid var(--accent)",
        color: "var(--accent2)"
      }
    }, "💾 " + (lang === "ja" ? "結果を保存" : "Save Result"))), renderPredictionTable(predictResult, false)),
    // ─── Saved Predictions Toggle & List ───
    E("div", {
      style: {
        marginTop: 24,
        borderTop: "1px solid var(--border)",
        paddingTop: 16
      }
    }, E("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12
      }
    }, E("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, E("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text)"
      }
    }, "📋 " + (lang === "ja" ? "保存済み予測" : "Saved Predictions")), savedPredictions.length > 0 && E("span", {
      style: {
        fontSize: 10,
        color: "var(--text2)",
        background: "var(--bg3)",
        padding: "2px 8px",
        borderRadius: 10
      }
    }, savedPredictions.length + (lang === "ja" ? "件" : " saved"))), E("button", {
      onClick: () => setShowSaved(!showSaved),
      style: {
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: showSaved ? "var(--accent)" : "var(--border2)",
        transition: "background .2s",
        padding: 0
      }
    }, E("span", {
      style: {
        position: "absolute",
        top: 2,
        left: showSaved ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        background: "#fff",
        transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.3)"
      }
    }))), showSaved && savedPredictions.length === 0 && E("div", {
      style: {
        textAlign: "center",
        padding: 20,
        color: "var(--text2)",
        fontSize: 12
      }
    }, lang === "ja" ? "保存済みの予測結果はありません" : "No saved predictions yet"), showSaved && savedPredictions.map(sp => E("div", {
      key: sp.id,
      style: {
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 8
      }
    }, E("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
      }
    }, E("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flex: 1,
        minWidth: 0
      }
    }, E("span", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: "var(--accent)20",
        color: "var(--accent2)"
      }
    }, sp.actionType), E("span", {
      style: {
        fontSize: 10,
        color: "var(--text2)"
      }
    }, sp.date?.split("T")[0] || ""), E("span", {
      style: {
        fontSize: 10,
        color: "var(--text2)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: 300
      }
    }, sp.text)), E("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexShrink: 0
      }
    }, E("button", {
      onClick: () => setExpandedSaved(prev => ({
        ...prev,
        [sp.id]: !prev[sp.id]
      })),
      className: "btn",
      style: {
        fontSize: 10,
        padding: "2px 8px"
      }
    }, expandedSaved[sp.id] ? lang === "ja" ? "閉じる" : "Collapse" : lang === "ja" ? "展開" : "Expand"), E("button", {
      onClick: () => deleteSavedPrediction(sp.id),
      className: "btn",
      style: {
        fontSize: 10,
        padding: "2px 8px",
        color: "var(--no)",
        borderColor: "var(--no)30"
      }
    }, "✕"))), expandedSaved[sp.id] && renderPredictionTable(sp.result, true)))));
  };
  const tabs = [{
    key: "tendencies",
    label: T.ai_tab_drep,
    icon: "👥",
    desc: lang === "ja" ? "DRep別の投票パターン" : "Voting patterns by DRep"
  }, {
    key: "reasons",
    label: T.ai_tab_reasons,
    icon: "📋",
    desc: lang === "ja" ? "GA別の賛否理由" : "Reasons for/against each GA"
  }, {
    key: "types",
    label: T.ai_tab_types,
    icon: "📊",
    desc: lang === "ja" ? "タイプ別の投票傾向" : "Trends by action type"
  }, {
    key: "predict",
    label: T.ai_tab_predict,
    icon: "🔮",
    desc: lang === "ja" ? "AIによる投票予測" : "AI-powered vote prediction"
  }];
  return E("div", {
    className: "card",
    style: {
      padding: 0
    }
  },
  // Sub-tab selector (card-style buttons)
  E("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 8,
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)"
    }
  }, tabs.map(t => E("button", {
    key: t.key,
    onClick: () => {
      setSubtab(t.key);
      setExpandedRows({});
    },
    style: {
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 600,
      background: subtab === t.key ? "var(--accent)" : "var(--bg3)",
      border: subtab === t.key ? "1px solid var(--accent)" : "1px solid var(--border)",
      borderRadius: 8,
      color: subtab === t.key ? "#fff" : "var(--text2)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "all .15s",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      textAlign: "center",
      lineHeight: 1.3
    }
  }, E("span", {
    style: {
      fontSize: 18
    }
  }, t.icon), E("span", {
    style: {
      fontSize: 11,
      fontWeight: 700
    }
  }, t.label), E("span", {
    style: {
      fontSize: 9,
      opacity: subtab === t.key ? 0.85 : 0.55,
      fontWeight: 400
    }
  }, t.desc)))),
  // Content
  E("div", {
    style: {
      padding: "12px 16px"
    }
  }, subtab === "tendencies" ? renderTendencies() : subtab === "reasons" ? renderProposalReasons() : subtab === "types" ? renderActionTypeSummary() : renderPredict()));
}

// ════════════════════════════════════════════════════════════════
// ADA Hub Tab (β) — X Digest / ADA News Feed
// ════════════════════════════════════════════════════════════════
function GovHubTab({ xDailyDigest, xDigestMeta, T, lang }) {
  const E = React.createElement;
  const [filter, setFilter] = React.useState("all");
  const [expandedIdx, setExpandedIdx] = React.useState({});
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("daily"); // "daily" | "weekly" | "monthly"
  const [digestIndex, setDigestIndex] = React.useState(null);
  const [monthCache, setMonthCache] = React.useState({}); // { "2026-03": [...] }
  const [weeklyDigests, setWeeklyDigests] = React.useState(null);
  const [monthlyDigests, setMonthlyDigests] = React.useState(null);
  const [selectedMonth, setSelectedMonth] = React.useState(null);
  const [showOlderDates, setShowOlderDates] = React.useState(false);
  const [loadingMonth, setLoadingMonth] = React.useState(false);

  const base = "https://adatool.net/data/";
  const v = "?v=" + Date.now();

  const L = (obj, field) => {
    if (!obj) return "";
    return obj[field + "_" + lang] || obj[field + "_en"] || obj[field] || "";
  };

  // ─── Load digest index + monthly digest on mount ──
  React.useEffect(() => {
    fetch(base + "x-digest-index.json" + v).then(r => r.ok ? r.json() : null).then(idx => {
      if (idx) {
        setDigestIndex(idx);
        // Auto-select latest available date
        if (idx.months && idx.months.length > 0) {
          const latestMonth = idx.months[0];
          setSelectedMonth(latestMonth);
          const days = idx.days?.[latestMonth] || [];
          if (days.length > 0) setSelectedDate(days[days.length - 1]);
          // Load the latest month's data
          fetchMonthData(latestMonth);
        }
      }
    }).catch(() => {});
    fetch(base + "x-weekly-digest.json" + v).then(r => r.ok ? r.json() : null).then(data => {
      if (data) setWeeklyDigests(Array.isArray(data) ? data : [data]);
    }).catch(() => {});
    fetch(base + "x-monthly-digest.json" + v).then(r => r.ok ? r.json() : null).then(data => {
      if (data) setMonthlyDigests(Array.isArray(data) ? data : [data]);
    }).catch(() => {});
  }, []);

  // Also seed monthCache from xDailyDigest (backward compat)
  React.useEffect(() => {
    if (xDailyDigest && Array.isArray(xDailyDigest) && xDailyDigest.length > 0) {
      // Group by month
      const byMonth = {};
      for (const d of xDailyDigest) {
        const m = d.date ? d.date.slice(0, 7) : null;
        if (m) { if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(d); }
      }
      setMonthCache(prev => {
        const next = { ...prev };
        for (const [m, digests] of Object.entries(byMonth)) {
          if (!next[m] || next[m].length < digests.length) next[m] = digests;
        }
        return next;
      });
      // Set selectedDate if not yet set
      if (!selectedDate && xDailyDigest[0]?.date) {
        setSelectedDate(xDailyDigest[0].date);
        setSelectedMonth(xDailyDigest[0].date.slice(0, 7));
      }
    }
  }, [xDailyDigest]);

  function fetchMonthData(monthStr) {
    if (monthCache[monthStr]) return;
    setLoadingMonth(true);
    fetch(base + "x-digest-" + monthStr + ".json" + v).then(r => r.ok ? r.json() : null).then(data => {
      if (data && Array.isArray(data)) {
        setMonthCache(prev => ({ ...prev, [monthStr]: data }));
      }
      setLoadingMonth(false);
    }).catch(() => setLoadingMonth(false));
  }

  // Category display info
  const CAT_INFO = {
    governance_action: { icon: "🗳️", color: "#3b82f6" },
    constitution_budget: { icon: "📜", color: "#8b5cf6" },
    protocol_parameter: { icon: "⚙️", color: "#f59e0b" },
    network_ops: { icon: "🖧", color: "#10b981" },
    security: { icon: "🛡️", color: "#ef4444" },
    ecosystem_adoption: { icon: "🌍", color: "#06b6d4" },
    dev_tools: { icon: "🔧", color: "#a855f7" },
    institutional: { icon: "🏛️", color: "#6366f1" },
    key_person: { icon: "👤", color: "#ec4899" },
    governance_tool: { icon: "🔗", color: "#14b8a6" },
    spo: { icon: "🏊", color: "#f97316" },
  };
  const CAT_LABELS = {
    governance_action: { en: "GA & Voting", ja: "GA・投票" },
    constitution_budget: { en: "Constitution & Budget", ja: "憲法・予算" },
    protocol_parameter: { en: "Protocol & Params", ja: "プロトコル" },
    network_ops: { en: "Network Ops", ja: "ネットワーク" },
    security: { en: "Security", ja: "セキュリティ" },
    ecosystem_adoption: { en: "Ecosystem", ja: "エコシステム" },
    dev_tools: { en: "Dev Tools", ja: "開発ツール" },
    institutional: { en: "Official", ja: "公式" },
    key_person: { en: "Key Person", ja: "キーパーソン" },
    governance_tool: { en: "Gov Tool", ja: "ガバナンスツール" },
    spo: { en: "SPO", ja: "SPO" },
  };
  const AUDIENCES = ["all","DRep","CC","SPO","Holder","Builder"];

  // ─── Find digest for selected date ──
  function findDigest(dateStr) {
    if (!dateStr) return null;
    const month = dateStr.slice(0, 7);
    const monthData = monthCache[month] || [];
    const found = monthData.find(d => d.date === dateStr);
    if (found) return found;
    // Fallback: search xDailyDigest
    if (Array.isArray(xDailyDigest)) {
      return xDailyDigest.find(d => d.date === dateStr) || null;
    }
    return null;
  }

  const digest = viewMode === "daily" ? findDigest(selectedDate) : null;
  const highlights = digest?.highlights || [];
  const filtered = filter === "all" ? highlights : highlights.filter(h => (h.audience || []).includes(filter));
  const sorted = [...filtered].sort((a, b) => (b.importance || 0) - (a.importance || 0));

  const toggleExpand = i => setExpandedIdx(p => ({ ...p, [i]: !p[i] }));

  const impBadge = (imp) => {
    const colors = { 5: "#ef4444", 4: "#f59e0b", 3: "#3b82f6", 2: "#6b7280", 1: "#9ca3af" };
    return E("span", { style: {
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: "50%",
      background: colors[imp] || "#6b7280", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0
    }}, imp);
  };

  // ─── Available dates for navigation ──
  const allAvailableDates = React.useMemo(() => {
    const dates = new Set();
    // From index
    if (digestIndex?.days) {
      for (const days of Object.values(digestIndex.days)) {
        for (const d of days) dates.add(d);
      }
    }
    // From monthCache
    for (const digests of Object.values(monthCache)) {
      for (const d of digests) { if (d.date) dates.add(d.date); }
    }
    // From xDailyDigest
    if (Array.isArray(xDailyDigest)) {
      for (const d of xDailyDigest) { if (d.date) dates.add(d.date); }
    }
    return [...dates].sort().reverse(); // newest first
  }, [digestIndex, monthCache, xDailyDigest]);

  const recentDates = showOlderDates ? allAvailableDates : allAvailableDates.slice(0, 7);

  // ─── Date navigation helpers ──
  function navigateDate(direction) {
    const idx = allAvailableDates.indexOf(selectedDate);
    if (idx < 0) return;
    const newIdx = idx + (direction === "prev" ? 1 : -1);
    if (newIdx >= 0 && newIdx < allAvailableDates.length) {
      const newDate = allAvailableDates[newIdx];
      setSelectedDate(newDate);
      setExpandedIdx({});
      const newMonth = newDate.slice(0, 7);
      if (newMonth !== selectedMonth) {
        setSelectedMonth(newMonth);
        fetchMonthData(newMonth);
      }
    }
  }

  function selectDate(d) {
    setSelectedDate(d);
    setExpandedIdx({});
    setViewMode("daily");
    const m = d.slice(0, 7);
    if (m !== selectedMonth) {
      setSelectedMonth(m);
      fetchMonthData(m);
    }
  }

  // ─── Month selector ──
  const availableMonths = React.useMemo(() => {
    const months = new Set();
    if (digestIndex?.months) digestIndex.months.forEach(m => months.add(m));
    for (const k of Object.keys(monthCache)) months.add(k);
    return [...months].sort().reverse();
  }, [digestIndex, monthCache]);

  function selectMonth(m) {
    setSelectedMonth(m);
    fetchMonthData(m);
    // Select latest date in that month
    const days = digestIndex?.days?.[m] || [];
    const monthData = monthCache[m] || [];
    const allDays = [...new Set([...days, ...monthData.map(d => d.date)])].sort();
    if (allDays.length > 0) {
      setSelectedDate(allDays[allDays.length - 1]);
    }
    setShowOlderDates(true);
    setViewMode("daily");
  }

  // ─── Weekly digest: find the week containing selectedDate ──
  function getISOWeekLabel(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00Z");
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yr = tmp.getUTCFullYear();
    const jan4 = new Date(Date.UTC(yr, 0, 4));
    const wk = Math.ceil(((tmp - jan4) / 86400000 + 1) / 7);
    return yr + "-W" + String(wk).padStart(2, "0");
  }
  const selectedWeekLabel = getISOWeekLabel(selectedDate);
  const currentWeeklyDigest = weeklyDigests?.find(d => d.week === selectedWeekLabel) || null;

  // ─── Monthly digest for selected month ──
  const currentMonthlyDigest = monthlyDigests?.find(d => d.month === selectedMonth) || null;

  // ─── Render: No data state ──
  if (allAvailableDates.length === 0 && !digest) {
    return E("div", { className: "card", style: { padding: "32px 24px", textAlign: "center" } },
      E("div", { style: { fontSize: 40, marginBottom: 12 } }, "📡"),
      E("div", { style: { fontSize: 15, color: "var(--text2)", marginBottom: 8 } },
        lang === "ja" ? "ダイジェストデータはまだありません" : "No digest data available yet"),
      E("div", { style: { fontSize: 12, color: "var(--text3)" } },
        lang === "ja" ? "X Digestパイプラインが日次15:00 JSTに自動実行されます" : "X Digest pipeline runs daily at 15:00 JST")
    );
  }

  // ─── Render highlights list (reused for daily view) ──
  const renderHighlights = (items) => {
    if (items.length === 0) {
      return E("div", { style: { padding: "20px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 } },
        lang === "ja" ? "該当するハイライトがありません" : "No highlights match this filter");
    }
    return items.map((h, i) => {
      const catInfo = CAT_INFO[h.category] || { icon: "📌", color: "#6b7280" };
      const catLabel = CAT_LABELS[h.category] || {};
      const expanded = expandedIdx[i];
      return E("div", { key: i, style: {
        padding: "10px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
        cursor: "pointer", transition: "background .15s",
      }, onClick: () => toggleExpand(i),
        onMouseEnter: e => e.currentTarget.style.background = "var(--bg3)",
        onMouseLeave: e => e.currentTarget.style.background = "transparent",
      },
        E("div", { style: { display: "flex", alignItems: "flex-start", gap: 8 } },
          impBadge(h.importance),
          E("div", { style: { flex: 1, minWidth: 0 } },
            E("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4, alignItems: "center" } },
              E("span", { style: {
                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                background: catInfo.color + "22", color: catInfo.color, border: "1px solid " + catInfo.color + "44"
              }}, catInfo.icon + " " + (catLabel[lang] || catLabel.en || h.category)),
              ...(h.audience || []).map(a => E("span", { key: a, style: {
                fontSize: 9, padding: "1px 4px", borderRadius: 3,
                background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)"
              }}, a))
            ),
            E("div", { style: { fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: "var(--text1)" } }, L(h, "title")),
            expanded && E("div", { style: { marginTop: 6 } },
              E("div", { style: { fontSize: 12, lineHeight: 1.6, color: "var(--text2)", marginBottom: 6 } }, L(h, "summary")),
              (h.sources || []).length > 0 && E("div", { style: { fontSize: 10, color: "var(--text3)" } },
                "Sources: " + h.sources.map(s => s.startsWith("@") ? s : "@" + s).join(", "))
            ),
            !expanded && E("div", { style: { fontSize: 11, color: "var(--text3)", marginTop: 2 } },
              "▸ " + (lang === "ja" ? "詳細を表示" : "Show details"))
          )
        )
      );
    });
  };

  // ─── Render weekly digest view ──
  const renderWeeklyView = () => {
    if (!currentWeeklyDigest) {
      return E("div", { style: { padding: "24px 16px", textAlign: "center", color: "var(--text3)" } },
        E("div", { style: { fontSize: 28, marginBottom: 8 } }, "📆"),
        E("div", { style: { fontSize: 13 } },
          lang === "ja"
            ? `${selectedWeekLabel || ""}の週次ダイジェストはまだ作成されていません`
            : `Weekly digest for ${selectedWeekLabel || ""} not yet generated`),
        E("div", { style: { fontSize: 11, marginTop: 4, color: "var(--text3)" } },
          lang === "ja" ? "毎週月曜に自動生成されます" : "Auto-generated every Monday")
      );
    }
    const wd = currentWeeklyDigest;
    return E("div", { style: { padding: 0 } },
      // Weekly summary
      E("div", { style: { padding: "16px", borderBottom: "1px solid var(--border)" } },
        E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
          E("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text1)" } },
            lang === "ja" ? "週間サマリー" : "Weekly Summary"),
          E("div", { style: { fontSize: 11, color: "var(--text3)" } },
            `${wd.startDate || ""} → ${wd.endDate || ""}`)
        ),
        E("div", { style: { fontSize: 13, lineHeight: 1.7, color: "var(--text2)" } }, L(wd, "summary"))
      ),
      // Top highlights
      wd.topHighlights && wd.topHighlights.length > 0 && E("div", { style: { padding: "12px 16px", borderBottom: "1px solid var(--border)" } },
        E("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "今週のトピック" : "This Week's Highlights"),
        ...wd.topHighlights.map((h, i) => {
          const catInfo = CAT_INFO[h.category] || { icon: "📌", color: "#6b7280" };
          return E("div", { key: i, style: { padding: "6px 0", borderBottom: i < wd.topHighlights.length - 1 ? "1px solid var(--border)" : "none" } },
            E("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 } },
              impBadge(h.importance),
              E("span", { style: { fontSize: 10, padding: "1px 6px", borderRadius: 4, background: catInfo.color + "22", color: catInfo.color, fontWeight: 600 } },
                catInfo.icon + " " + (CAT_LABELS[h.category]?.[lang] || h.category)),
              E("span", { style: { fontSize: 13, fontWeight: 600 } }, L(h, "title"))
            ),
            E("div", { style: { fontSize: 12, color: "var(--text2)", marginLeft: 30 } }, L(h, "summary"))
          );
        })
      ),
      // Action items
      wd.actionItems && wd.actionItems.length > 0 && E("div", { style: { padding: "12px 16px" } },
        E("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "来週の注目" : "Next Week Watch"),
        ...wd.actionItems.map((ai, i) =>
          E("div", { key: i, style: { display: "flex", gap: 6, alignItems: "flex-start", padding: "4px 0" } },
            E("span", { style: { color: "var(--accent)" } }, "▸"),
            E("div", null,
              E("div", { style: { fontSize: 12, color: "var(--text2)" } }, L(ai, "action")),
              ai.audience && E("div", { style: { fontSize: 9, color: "var(--text3)", marginTop: 2 } },
                ai.audience.join(" · "))
            )
          )
        )
      ),
      // Stats
      wd.stats && E("div", { style: { padding: "8px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text3)" } },
        `${wd.stats.daysWithData || 0} days · ${wd.stats.totalTweets || 0} tweets · ${wd.stats.totalHighlights || 0} highlights`)
    );
  };

  // ─── Render monthly digest view ──
  const renderMonthlyView = () => {
    if (!currentMonthlyDigest) {
      return E("div", { style: { padding: "24px 16px", textAlign: "center", color: "var(--text3)" } },
        E("div", { style: { fontSize: 28, marginBottom: 8 } }, "📅"),
        E("div", { style: { fontSize: 13 } },
          lang === "ja"
            ? `${selectedMonth || ""}の月間ダイジェストはまだ作成されていません`
            : `Monthly digest for ${selectedMonth || ""} not yet generated`),
        E("div", { style: { fontSize: 11, marginTop: 4, color: "var(--text3)" } },
          lang === "ja" ? "月末の金曜日に自動生成されます" : "Auto-generated on the last Friday of each month")
      );
    }
    const md = currentMonthlyDigest;
    return E("div", { style: { padding: 0 } },
      // Monthly summary
      E("div", { style: { padding: "16px", borderBottom: "1px solid var(--border)" } },
        E("div", { style: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "月間サマリー" : "Monthly Summary"),
        E("div", { style: { fontSize: 13, lineHeight: 1.7, color: "var(--text2)" } }, L(md, "summary"))
      ),
      // Top highlights
      md.topHighlights && md.topHighlights.length > 0 && E("div", { style: { padding: "12px 16px", borderBottom: "1px solid var(--border)" } },
        E("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "主要トピック" : "Top Highlights"),
        ...md.topHighlights.map((h, i) => {
          const catInfo = CAT_INFO[h.category] || { icon: "📌", color: "#6b7280" };
          return E("div", { key: i, style: { padding: "6px 0", borderBottom: i < md.topHighlights.length - 1 ? "1px solid var(--border)" : "none" } },
            E("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 } },
              impBadge(h.importance),
              E("span", { style: { fontSize: 10, padding: "1px 6px", borderRadius: 4, background: catInfo.color + "22", color: catInfo.color, fontWeight: 600 } },
                catInfo.icon + " " + (CAT_LABELS[h.category]?.[lang] || h.category)),
              E("span", { style: { fontSize: 13, fontWeight: 600 } }, L(h, "title"))
            ),
            E("div", { style: { fontSize: 12, color: "var(--text2)", marginLeft: 30 } }, L(h, "summary"))
          );
        })
      ),
      // Trends
      md.trends && md.trends.length > 0 && E("div", { style: { padding: "12px 16px", borderBottom: "1px solid var(--border)" } },
        E("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "トレンド" : "Trends"),
        ...md.trends.map((tr, i) => {
          const trendIcon = tr.trend === "rising" ? "📈" : tr.trend === "declining" ? "📉" : "➡️";
          const catInfo = CAT_INFO[tr.category] || { icon: "📌", color: "#6b7280" };
          return E("div", { key: i, style: { display: "flex", gap: 6, alignItems: "center", padding: "4px 0" } },
            E("span", null, trendIcon),
            E("span", { style: { fontSize: 10, padding: "1px 6px", borderRadius: 4, background: catInfo.color + "22", color: catInfo.color, fontWeight: 600 } },
              CAT_LABELS[tr.category]?.[lang] || tr.category),
            E("span", { style: { fontSize: 12, color: "var(--text2)" } }, L(tr, "note"))
          );
        })
      ),
      // Action items
      md.actionItems && md.actionItems.length > 0 && E("div", { style: { padding: "12px 16px" } },
        E("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text1)" } },
          lang === "ja" ? "注目ポイント" : "Action Items"),
        ...md.actionItems.map((ai, i) =>
          E("div", { key: i, style: { display: "flex", gap: 6, alignItems: "flex-start", padding: "4px 0" } },
            E("span", { style: { color: "var(--accent)" } }, "▸"),
            E("div", null,
              E("div", { style: { fontSize: 12, color: "var(--text2)" } }, L(ai, "action")),
              ai.audience && E("div", { style: { fontSize: 9, color: "var(--text3)", marginTop: 2 } },
                ai.audience.join(" · "))
            )
          )
        )
      ),
      // Stats
      md.stats && E("div", { style: { padding: "8px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text3)" } },
        `${md.stats.daysWithData || 0} days · ${md.stats.totalTweets || 0} tweets · ${md.stats.totalHighlights || 0} highlights`)
    );
  };

  // ─── Main render ──
  const pilStyle = (active) => ({
    padding: "4px 10px", fontSize: 11, fontWeight: active ? 700 : 400,
    borderRadius: 12, border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text2)", cursor: "pointer", transition: "all .15s",
    whiteSpace: "nowrap"
  });

  return E("div", { className: "card", style: { padding: 0 } },
    // ── Header ──
    E("div", { style: {
      padding: "14px 16px", borderBottom: "1px solid var(--border)",
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
    }},
      E("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
        E("span", { style: { fontSize: 20 } }, "📡"),
        E("span", { style: { fontSize: 15, fontWeight: 700 } },
          lang === "ja" ? "ADA ダイジェスト" : "ADA Digest"),
        E("span", { style: { fontSize: 10, background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}, "β")
      ),
      viewMode === "daily" && digest && E("div", { style: { fontSize: 11, color: "var(--text3)" } },
        digest.date + " · " + (digest.tweetCount || 0) + " tweets")
    ),

    // ── Date navigation row ──
    E("div", { style: {
      padding: "8px 16px", borderBottom: "1px solid var(--border)",
      display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center"
    }},
      // Weekly digest button
      E("button", { onClick: () => setViewMode(viewMode === "weekly" ? "daily" : "weekly"),
        style: { ...pilStyle(viewMode === "weekly"), fontWeight: 600 }
      }, "📆 " + (lang === "ja" ? "週間" : "Weekly")),
      // Monthly digest button
      E("button", { onClick: () => setViewMode(viewMode === "monthly" ? "daily" : "monthly"),
        style: { ...pilStyle(viewMode === "monthly"), fontWeight: 600 }
      }, "📅 " + (lang === "ja" ? "月間" : "Monthly")),
      E("span", { style: { width: 1, height: 18, background: "var(--border)", margin: "0 4px" } }),
      // Prev button
      E("button", { onClick: () => navigateDate("prev"),
        disabled: allAvailableDates.indexOf(selectedDate) >= allAvailableDates.length - 1,
        style: { ...pilStyle(false), opacity: allAvailableDates.indexOf(selectedDate) >= allAvailableDates.length - 1 ? 0.3 : 1, padding: "4px 8px" }
      }, "←"),
      // Date pills
      ...recentDates.map(d => {
        const dayNum = d.slice(8); // "06"
        const monthDay = d.slice(5); // "03-06"
        return E("button", { key: d, onClick: () => selectDate(d),
          style: pilStyle(viewMode === "daily" && selectedDate === d)
        }, monthDay);
      }),
      // Next button
      E("button", { onClick: () => navigateDate("next"),
        disabled: allAvailableDates.indexOf(selectedDate) <= 0,
        style: { ...pilStyle(false), opacity: allAvailableDates.indexOf(selectedDate) <= 0 ? 0.3 : 1, padding: "4px 8px" }
      }, "→"),
      // Show older / month selector
      !showOlderDates && allAvailableDates.length > 7 && E("button", {
        onClick: () => setShowOlderDates(true),
        style: { ...pilStyle(false), fontSize: 10 }
      }, lang === "ja" ? "過去を表示..." : "Show older..."),
      // Month selector (when expanded)
      showOlderDates && availableMonths.length > 1 && E("select", {
        value: selectedMonth || "",
        onChange: e => selectMonth(e.target.value),
        style: { fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)",
          background: "var(--bg2)", color: "var(--text2)", cursor: "pointer" }
      }, ...availableMonths.map(m => E("option", { key: m, value: m }, m)))
    ),

    // ── Audience filter (daily view only) ──
    viewMode === "daily" && E("div", { style: {
      padding: "8px 16px", borderBottom: "1px solid var(--border)",
      display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center"
    }},
      E("span", { style: { fontSize: 11, color: "var(--text3)", marginRight: 4 } },
        lang === "ja" ? "対象:" : "For:"),
      ...AUDIENCES.map(a => E("button", { key: a, onClick: () => setFilter(a),
        style: { padding: "3px 10px", fontSize: 11, fontWeight: filter === a ? 700 : 500, borderRadius: 12,
          border: filter === a ? "1px solid var(--accent)" : "1px solid var(--border)",
          background: filter === a ? "var(--accent)" : "transparent",
          color: filter === a ? "#fff" : "var(--text2)", cursor: "pointer", transition: "all .15s"
        }
      }, a === "all" ? (lang === "ja" ? "すべて" : "All") : a))
    ),

    // ── Loading indicator ──
    loadingMonth && E("div", { style: { padding: "12px 16px", textAlign: "center", color: "var(--text3)", fontSize: 12 } },
      lang === "ja" ? "読み込み中..." : "Loading..."),

    // ── Content area ──
    viewMode === "monthly"
      ? renderMonthlyView()
      : viewMode === "weekly"
      ? renderWeeklyView()
      : E("div", { style: { padding: "8px 0" } },
          !digest
            ? E("div", { style: { padding: "20px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 } },
                lang === "ja" ? "この日のダイジェストはありません" : "No digest for this date")
            : renderHighlights(sorted)
        ),

    // ── Subscribe section ──
    E(GovHubSubscribeForm, { lang: lang }),

    // ── Footer ──
    E("div", { style: {
      padding: "10px 16px", borderTop: "1px solid var(--border)",
      fontSize: 10, color: "var(--text3)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4
    }},
      E("span", null, viewMode === "daily" && digest
        ? (lang === "ja"
          ? `生成: ${new Date(digest.generatedAt).toLocaleString("ja-JP")} · 出典: X`
          : `Generated: ${new Date(digest.generatedAt).toLocaleString("en-US")} · Source: X`)
        : (lang === "ja" ? "出典: X (Twitter)" : "Source: X (Twitter)")),
      E("span", null, lang === "ja" ? "Claude Haiku による要約" : "Summarized by Claude Haiku")
    )
  );
}

// ─── Subscribe Form sub-component ───────────────────────────────────────────
function GovHubSubscribeForm({ lang }) {
  const E = React.createElement;
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [frequency, setFrequency] = React.useState("daily");
  const [categories, setCategories] = React.useState([]);
  const [status, setStatus] = React.useState(null); // null | "sending" | "success" | "error"
  const [errorMsg, setErrorMsg] = React.useState("");

  const NOTIFY_API = "https://digest-notify.adatool.workers.dev";
  const NOTIFY_ENABLED = false; // Set to true after deploying Cloudflare Worker

  const ALL_CATS = [
    { key: "governance_action", en: "GA & Voting", ja: "GA・投票" },
    { key: "constitution_budget", en: "Constitution & Budget", ja: "憲法・予算" },
    { key: "protocol_parameter", en: "Protocol & Params", ja: "プロトコル" },
    { key: "security", en: "Security", ja: "セキュリティ" },
    { key: "ecosystem_adoption", en: "Ecosystem", ja: "エコシステム" },
    { key: "dev_tools", en: "Dev Tools", ja: "開発ツール" },
    { key: "institutional", en: "Official", ja: "公式" },
    { key: "spo", en: "SPO", ja: "SPO" },
    { key: "key_person", en: "Key Person", ja: "キーパーソン" },
    { key: "governance_tool", en: "Gov Tool", ja: "ガバナンスツール" },
    { key: "network_ops", en: "Network Ops", ja: "ネットワーク" },
  ];

  function toggleCat(key) {
    setCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  }

  async function handleSubmit() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg(lang === "ja" ? "有効なメールアドレスを入力してください" : "Please enter a valid email");
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(NOTIFY_API + "/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, frequency, categories }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setErrorMsg(data.error || "Subscription failed");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  if (!NOTIFY_ENABLED) return null; // Worker not deployed yet

  if (!open) {
    return E("div", { style: { padding: "12px 16px", borderTop: "1px solid var(--border)", textAlign: "center" } },
      E("button", { onClick: () => setOpen(true), style: {
        padding: "8px 20px", fontSize: 12, fontWeight: 600, borderRadius: 8,
        border: "1px solid var(--accent)", background: "transparent",
        color: "var(--accent)", cursor: "pointer", transition: "all .15s"
      }}, "📧 " + (lang === "ja" ? "ダイジェスト通知を受け取る" : "Subscribe to Digest Notifications"))
    );
  }

  if (status === "success") {
    return E("div", { style: { padding: "20px 16px", borderTop: "1px solid var(--border)", textAlign: "center" } },
      E("div", { style: { fontSize: 28, marginBottom: 8 } }, "✅"),
      E("div", { style: { fontSize: 13, color: "var(--text2)" } },
        lang === "ja" ? "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。"
          : "Confirmation email sent! Click the link in the email to activate your subscription."),
      E("button", { onClick: () => { setOpen(false); setStatus(null); }, style: {
        marginTop: 12, padding: "4px 12px", fontSize: 11, borderRadius: 6,
        border: "1px solid var(--border)", background: "transparent", color: "var(--text3)", cursor: "pointer"
      }}, lang === "ja" ? "閉じる" : "Close")
    );
  }

  return E("div", { style: { padding: "16px", borderTop: "1px solid var(--border)" } },
    E("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
      E("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text1)" } },
        "📧 " + (lang === "ja" ? "通知設定" : "Notification Settings")),
      E("button", { onClick: () => setOpen(false), style: {
        background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16
      }}, "✕")
    ),
    // Email input
    E("div", { style: { marginBottom: 12 } },
      E("input", { type: "email", value: email, onChange: e => { setEmail(e.target.value); setStatus(null); },
        placeholder: lang === "ja" ? "メールアドレス" : "Email address",
        style: { width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6,
          border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text1)",
          boxSizing: "border-box" }
      })
    ),
    // Frequency
    E("div", { style: { marginBottom: 12 } },
      E("div", { style: { fontSize: 11, color: "var(--text3)", marginBottom: 6 } },
        lang === "ja" ? "頻度:" : "Frequency:"),
      E("div", { style: { display: "flex", gap: 8 } },
        ["daily", "monthly"].map(f =>
          E("label", { key: f, style: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text2)", cursor: "pointer" } },
            E("input", { type: "radio", name: "freq", value: f, checked: frequency === f,
              onChange: () => setFrequency(f) }),
            f === "daily" ? (lang === "ja" ? "日次" : "Daily") : (lang === "ja" ? "月次" : "Monthly")
          )
        )
      )
    ),
    // Categories
    E("div", { style: { marginBottom: 12 } },
      E("div", { style: { fontSize: 11, color: "var(--text3)", marginBottom: 6 } },
        lang === "ja" ? "カテゴリ (未選択=全て):" : "Categories (none = all):"),
      E("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
        ALL_CATS.map(c =>
          E("button", { key: c.key, onClick: () => toggleCat(c.key), style: {
            padding: "3px 8px", fontSize: 10, borderRadius: 10,
            border: categories.includes(c.key) ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: categories.includes(c.key) ? "var(--accent)" : "transparent",
            color: categories.includes(c.key) ? "#fff" : "var(--text3)",
            cursor: "pointer", transition: "all .15s"
          }}, c[lang] || c.en)
        )
      )
    ),
    // Error message
    status === "error" && E("div", { style: { fontSize: 11, color: "#ef4444", marginBottom: 8 } }, errorMsg),
    // Submit
    E("button", { onClick: handleSubmit, disabled: status === "sending", style: {
      width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, borderRadius: 8,
      border: "none", background: "var(--accent)", color: "#fff", cursor: status === "sending" ? "wait" : "pointer",
      opacity: status === "sending" ? 0.6 : 1, transition: "opacity .15s"
    }}, status === "sending"
      ? (lang === "ja" ? "送信中..." : "Sending...")
      : (lang === "ja" ? "登録する" : "Subscribe"))
  );
}

// ════════════════════════════════════════════════════════════════
// Governance Data Tab (β) — Treasury, Protocol Params, Network Info
// ════════════════════════════════════════════════════════════════
function GovernanceDataTab({
  govInfo,
  T,
  lang,
  dreps,
  votes,
  proposals,
  ccMembers,
  ccVotes,
  spoVotes,
  spoPoolInfo
}) {
  if (!govInfo) return React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center",
      color: "var(--text2)"
    }
  }, "Governance data not available. Data will appear after the next data update.");
  const net = govInfo.network || {};
  const pp = govInfo.protocolParams || {};
  const fmtL = fmtAda; // reuse global
  const fmtAdaP = v => "₳ " + fmtL(v);
  const pctStr = v => v !== undefined && v !== null ? (Number(v) * 100).toFixed(0) + "%" : "—";
  const Section = ({
    title,
    children
  }) => React.createElement("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)",
      marginBottom: 8
    }
  }, title), children);
  const Row = ({
    label,
    value,
    sub
  }) => React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "3px 0",
      borderBottom: "1px solid var(--border)"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, label), React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text)"
    }
  }, value), sub && React.createElement("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)"
    }
  }, sub)));
  const ThresholdRow = ({
    label,
    drep,
    spo,
    cc
  }) => React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 60px 60px 60px",
      gap: 4,
      padding: "3px 0",
      borderBottom: "1px solid var(--border)",
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text2)"
    }
  }, label), React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#8b5cf6",
      textAlign: "center"
    }
  }, drep), React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#06b6d4",
      textAlign: "center"
    }
  }, spo || "—"), React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#f59e0b",
      textAlign: "center"
    }
  }, cc));
  return React.createElement("div", {
    style: {
      maxWidth: 900,
      margin: "0 auto"
    }
  },
  // Network Overview
  React.createElement(Section, {
    title: "🏦 " + (T.gov_treasury || "Treasury") + " & " + (T.gov_supply || "Supply")
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
      gap: 8,
      marginBottom: 4
    }
  }, ...[{
    label: T.gov_treasury || "Treasury",
    value: fmtAdaP(net.supply_treasury),
    color: "#f59e0b"
  }, {
    label: T.gov_reserves || "Reserves",
    value: fmtAdaP(net.supply_reserves),
    color: "#8b5cf6"
  }, {
    label: T.gov_supply || "Circulating",
    value: fmtAdaP(net.supply_circulating),
    color: "#06b6d4"
  }, {
    label: T.gov_live_stake || "Live Stake",
    value: fmtAdaP(net.stake_live),
    color: "#34d399"
  }, {
    label: T.gov_active_stake || "Active Stake",
    value: fmtAdaP(net.stake_active),
    color: "#14b8a6"
  }].map(({
    label,
    value,
    color
  }, i) => React.createElement("div", {
    key: i,
    style: {
      background: "var(--bg3)",
      borderRadius: 8,
      padding: "10px 12px",
      borderLeft: `3px solid ${color}`
    }
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 2
    }
  }, label), React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color
    }
  }, value)))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      textAlign: "right",
      marginTop: 4
    }
  }, (T.gov_epoch || "Epoch") + ": " + pp.epoch)),
  // Governance Thresholds
  React.createElement(Section, {
    title: "⚖️ " + (T.gov_governance_thresholds || "Governance Thresholds")
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 60px 60px 60px",
      gap: 4,
      padding: "4px 0",
      marginBottom: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, "Action Type"), React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#8b5cf6",
      textAlign: "center",
      fontWeight: 600
    }
  }, T.summary_drep || "DRep"), React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#06b6d4",
      textAlign: "center",
      fontWeight: 600
    }
  }, T.summary_spo || "SPO"), React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#f59e0b",
      textAlign: "center",
      fontWeight: 600
    }
  }, T.summary_cc || "CC")), React.createElement(ThresholdRow, {
    label: T.type_noconf || "No Confidence",
    drep: pctStr(pp.dvt_motion_no_confidence),
    spo: pctStr(pp.pvt_motion_no_confidence),
    cc: "—"
  }), React.createElement(ThresholdRow, {
    label: T.type_cc || "Update CC",
    drep: pctStr(pp.dvt_committee_normal),
    spo: pctStr(pp.pvt_committee_normal),
    cc: "—"
  }), React.createElement(ThresholdRow, {
    label: T.type_const || "New Constitution",
    drep: pctStr(pp.dvt_update_to_constitution),
    spo: "—",
    cc: pctStr(pp.dvt_committee_normal)
  }), React.createElement(ThresholdRow, {
    label: T.type_hardfork || "Hard Fork",
    drep: pctStr(pp.dvt_hard_fork_initiation),
    spo: pctStr(pp.pvt_hard_fork_initiation),
    cc: pctStr(pp.dvt_committee_normal)
  }), React.createElement(ThresholdRow, {
    label: T.type_treasury || "Treasury",
    drep: pctStr(pp.dvt_treasury_withdrawal),
    spo: "—",
    cc: pctStr(pp.dvt_committee_normal)
  }), React.createElement(ThresholdRow, {
    label: T.type_param || "Param Change",
    drep: "67%*",
    spo: pctStr(pp.pvt_p_p_security_group),
    cc: pctStr(pp.dvt_committee_normal)
  }), React.createElement(ThresholdRow, {
    label: T.type_info || "Info Action",
    drep: "51%",
    spo: "51%",
    cc: "51%"
  }), React.createElement("div", {
    style: {
      fontSize: 8,
      color: "var(--text2)",
      marginTop: 4
    }
  }, "* ParameterChange DRep thresholds vary by group: Network=" + pctStr(pp.dvt_p_p_network_group) + ", Economic=" + pctStr(pp.dvt_p_p_economic_group) + ", Technical=" + pctStr(pp.dvt_p_p_technical_group) + ", Governance=" + pctStr(pp.dvt_p_p_gov_group))),
  // Deposits & Costs
  React.createElement(Section, {
    title: "💰 " + (T.gov_deposits || "Deposits & Costs")
  }, React.createElement(Row, {
    label: "DRep Deposit",
    value: fmtAdaP(pp.drep_deposit)
  }), React.createElement(Row, {
    label: "Gov Action Deposit",
    value: fmtAdaP(pp.gov_action_deposit)
  }), React.createElement(Row, {
    label: "Pool Deposit",
    value: fmtAdaP(pp.pool_deposit)
  }), React.createElement(Row, {
    label: "Key Deposit",
    value: fmtAdaP(pp.key_deposit)
  }), React.createElement(Row, {
    label: "Min Pool Cost",
    value: fmtAdaP(pp.min_pool_cost)
  }), React.createElement(Row, {
    label: "Coins per UTxO byte",
    value: fmtAdaP(pp.coins_per_utxo_size)
  })),
  // Governance Settings
  React.createElement(Section, {
    title: "🏛 " + (T.gov_governance_settings || "Governance Settings")
  }, React.createElement(Row, {
    label: "Gov Action Lifetime",
    value: pp.gov_action_lifetime + " epochs"
  }), React.createElement(Row, {
    label: "DRep Activity",
    value: pp.drep_activity + " epochs"
  }), React.createElement(Row, {
    label: "CC Min Size",
    value: String(pp.committee_min_size || "—")
  }), React.createElement(Row, {
    label: "CC Max Term Length",
    value: (pp.committee_max_term_length || "—") + " epochs"
  }), React.createElement(Row, {
    label: "Protocol Version",
    value: "v" + pp.protocol_major_ver + "." + pp.protocol_minor_ver
  })),
  // Block & Tx Limits
  React.createElement(Section, {
    title: "📦 " + (T.gov_block_limits || "Block & Tx Limits")
  }, React.createElement(Row, {
    label: "Max Block Size",
    value: (Number(pp.max_block_size) / 1024).toFixed(0) + " KB"
  }), React.createElement(Row, {
    label: "Max Tx Size",
    value: (Number(pp.max_tx_size) / 1024).toFixed(0) + " KB"
  }), React.createElement(Row, {
    label: "Max Block Header",
    value: pp.max_block_header_size + " bytes"
  }), React.createElement(Row, {
    label: "Max Tx Execution Memory",
    value: pp.max_tx_ex_mem ? Number(pp.max_tx_ex_mem).toLocaleString() : "—"
  }), React.createElement(Row, {
    label: "Max Tx Execution Steps",
    value: pp.max_tx_ex_steps ? Number(pp.max_tx_ex_steps).toLocaleString() : "—"
  }), React.createElement(Row, {
    label: "Max Block Execution Memory",
    value: pp.max_block_ex_mem ? Number(pp.max_block_ex_mem).toLocaleString() : "—"
  }), React.createElement(Row, {
    label: "Max Block Execution Steps",
    value: pp.max_block_ex_steps ? Number(pp.max_block_ex_steps).toLocaleString() : "—"
  }), React.createElement(Row, {
    label: "Max Collateral Inputs",
    value: String(pp.max_collateral_inputs || "—")
  }), React.createElement(Row, {
    label: "Max Value Size",
    value: pp.max_val_size ? Number(pp.max_val_size).toLocaleString() + " bytes" : "—"
  })),
  // Economic Parameters
  React.createElement(Section, {
    title: "📈 " + (T.gov_economic || "Economic Parameters")
  }, React.createElement(Row, {
    label: "Min Fee A (per byte)",
    value: String(pp.min_fee_a || "—")
  }), React.createElement(Row, {
    label: "Min Fee B (constant)",
    value: String(pp.min_fee_b || "—")
  }), React.createElement(Row, {
    label: "Price Memory",
    value: String(pp.price_mem || "—")
  }), React.createElement(Row, {
    label: "Price Step",
    value: String(pp.price_step || "—")
  }), React.createElement(Row, {
    label: "a0 (Pool Influence)",
    value: String(pp.a0 || "—")
  }), React.createElement(Row, {
    label: "ρ (Monetary Expansion)",
    value: String(pp.rho || "—")
  }), React.createElement(Row, {
    label: "τ (Treasury Cut)",
    value: String(pp.tau || "—")
  }), React.createElement(Row, {
    label: "Collateral %",
    value: pp.collateral_percent ? pp.collateral_percent + "%" : "—"
  })),
  // Constitution Tool Link
  React.createElement(Section, {
    title: "📜 " + (T.constitution_tool || "Constitution")
  }, React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text2)",
      marginBottom: 8,
      lineHeight: 1.6
    }
  }, lang === "ja" ? "Cardanoブロックチェーンの憲法を閲覧・検索できるツールです。ガバナンスアクション（特にNewConstitution）の提案時や、投票判断の際にご活用ください。" : "A tool for viewing and searching the Cardano blockchain constitution. Useful when proposing governance actions (especially NewConstitution) or making voting decisions."), React.createElement("a", {
    href: "https://adatool.net/constitution-tool/",
    target: "_blank",
    rel: "noopener",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 16px",
      borderRadius: 8,
      background: "var(--accent)",
      color: "#fff",
      fontSize: 12,
      fontWeight: 600,
      textDecoration: "none",
      transition: "opacity .15s"
    }
  }, "📜 " + (lang === "ja" ? "憲法ツールを開く" : "Open Constitution Tool"))));
}

// ════════════════════════════════════════════════════════════════
// Transaction Analysis Tab (β) — Local static data
// ════════════════════════════════════════════════════════════════
function TransactionAnalysisTab({
  T,
  lang
}) {
  const E = React.createElement;

  // ── Sample static data (will be replaced by real data pipeline later) ──
  const epochData = [{
    epoch: 616,
    total: 412850,
    simple: 198168,
    smart: 214682,
    daily_avg: 82570
  }, {
    epoch: 615,
    total: 398420,
    simple: 191242,
    smart: 207178,
    daily_avg: 79684
  }, {
    epoch: 614,
    total: 425100,
    simple: 204048,
    smart: 221052,
    daily_avg: 85020
  }, {
    epoch: 613,
    total: 389760,
    simple: 187085,
    smart: 202675,
    daily_avg: 77952
  }, {
    epoch: 612,
    total: 405300,
    simple: 194544,
    smart: 210756,
    daily_avg: 81060
  }, {
    epoch: 611,
    total: 378900,
    simple: 181872,
    smart: 197028,
    daily_avg: 75780
  }];
  const projectData = [{
    name: "SundaeSwap",
    txCount: 52340,
    color: "#8b5cf6"
  }, {
    name: "Minswap",
    txCount: 48720,
    color: "#3b82f6"
  }, {
    name: "JPG Store",
    txCount: 35890,
    color: "#f59e0b"
  }, {
    name: "Liqwid Finance",
    txCount: 28450,
    color: "#06b6d4"
  }, {
    name: "Lenfi (Aada)",
    txCount: 18930,
    color: "#34d399"
  }, {
    name: "DexHunter",
    txCount: 15670,
    color: "#f87171"
  }, {
    name: "Optim Finance",
    txCount: 12340,
    color: "#a78bfa"
  }, {
    name: "Splash Protocol",
    txCount: 9850,
    color: "#fbbf24"
  }, {
    name: "Indigo Protocol",
    txCount: 8760,
    color: "#14b8a6"
  }, {
    name: "WingRiders",
    txCount: 7520,
    color: "#fb923c"
  }, {
    name: "Levvy Finance",
    txCount: 5430,
    color: "#e879f9"
  }, {
    name: lang === "ja" ? "その他" : "Others",
    txCount: 21782,
    color: "#6b7280"
  }];
  const latestEpoch = epochData[0];
  const totalProjectTx = projectData.reduce((s, p) => s + p.txCount, 0);
  const smartPct = latestEpoch.total > 0 ? (latestEpoch.smart / latestEpoch.total * 100).toFixed(1) : "0";
  const simplePct = latestEpoch.total > 0 ? (latestEpoch.simple / latestEpoch.total * 100).toFixed(1) : "0";
  const Section = ({
    title,
    children
  }) => E("div", {
    style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 10
    }
  }, E("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--accent2)",
      marginBottom: 8
    }
  }, title), children);
  return E("div", {
    style: {
      maxWidth: 900,
      margin: "0 auto"
    }
  },
  // Header
  E("div", {
    className: "card",
    style: {
      padding: "16px 20px",
      marginBottom: 12
    }
  }, E("h2", {
    style: {
      color: "var(--accent2)",
      margin: 0,
      fontSize: 16,
      marginBottom: 4
    }
  }, "📊 " + T.txa_title), E("p", {
    style: {
      color: "var(--text2)",
      fontSize: 11,
      margin: 0
    }
  }, T.txa_desc), E("p", {
    style: {
      color: "var(--abstain)",
      fontSize: 10,
      margin: "4px 0 0",
      fontStyle: "italic"
    }
  }, lang === "ja" ? "※ サンプルデータです。実際のデータパイプライン接続後に自動更新されます。" : "※ Sample data shown. Will auto-update once the data pipeline is connected.")),
  // Overview Cards
  E(Section, {
    title: "📈 " + (lang === "ja" ? "概要 (Epoch " + latestEpoch.epoch + ")" : "Overview (Epoch " + latestEpoch.epoch + ")")
  }, E("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
      gap: 8,
      marginBottom: 8
    }
  }, ...[{
    label: T.txa_total,
    value: latestEpoch.total.toLocaleString(),
    color: "#3b82f6"
  }, {
    label: T.txa_simple,
    value: latestEpoch.simple.toLocaleString(),
    sub: simplePct + "%",
    color: "#34d399"
  }, {
    label: T.txa_smart,
    value: latestEpoch.smart.toLocaleString(),
    sub: smartPct + "%",
    color: "#8b5cf6"
  }, {
    label: T.txa_daily_avg,
    value: latestEpoch.daily_avg.toLocaleString(),
    color: "#f59e0b"
  }].map(({
    label,
    value,
    sub,
    color
  }, i) => E("div", {
    key: i,
    style: {
      background: "var(--bg3)",
      borderRadius: 8,
      padding: "10px 12px",
      borderLeft: `3px solid ${color}`
    }
  }, E("div", {
    style: {
      fontSize: 9,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: ".05em",
      marginBottom: 2
    }
  }, label), E("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color
    }
  }, value), sub && E("div", {
    style: {
      fontSize: 10,
      color: "var(--text2)",
      marginTop: 1
    }
  }, sub)))),
  // Simple vs Smart contract bar
  E("div", {
    style: {
      display: "flex",
      height: 10,
      borderRadius: 5,
      overflow: "hidden",
      background: "var(--border)",
      marginTop: 4
    }
  }, E("div", {
    style: {
      width: simplePct + "%",
      background: "#34d399",
      transition: "width .3s"
    }
  }), E("div", {
    style: {
      width: smartPct + "%",
      background: "#8b5cf6",
      transition: "width .3s"
    }
  })), E("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 9,
      color: "var(--text2)",
      marginTop: 4
    }
  }, E("span", null, "🟩 " + (lang === "ja" ? "単純送金" : "Simple") + ": " + simplePct + "%"), E("span", null, "🟪 " + (lang === "ja" ? "スマートコントラクト" : "Smart Contract") + ": " + smartPct + "%"))),
  // Epoch History Table
  E(Section, {
    title: "📅 " + (lang === "ja" ? "エポック別推移" : "Epoch History")
  }, E("div", {
    style: {
      overflowX: "auto"
    }
  }, E("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 11
    }
  }, E("thead", null, E("tr", null, E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "left",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_epoch), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_total), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "#34d399",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_simple), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "#8b5cf6",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_smart), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_daily_avg), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "center",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_trend))), E("tbody", null, epochData.map((ep, i) => {
    const prev = epochData[i + 1];
    const change = prev ? ((ep.total - prev.total) / prev.total * 100).toFixed(1) : null;
    return E("tr", {
      key: ep.epoch,
      style: {
        borderBottom: "1px solid var(--border)"
      }
    }, E("td", {
      style: {
        padding: "6px 8px",
        fontWeight: 600,
        color: "var(--accent2)"
      }
    }, ep.epoch), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "var(--text)"
      }
    }, ep.total.toLocaleString()), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "#34d399"
      }
    }, ep.simple.toLocaleString()), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "#8b5cf6"
      }
    }, ep.smart.toLocaleString()), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "var(--text2)"
      }
    }, ep.daily_avg.toLocaleString()), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 600,
        color: change === null ? "var(--text2)" : Number(change) >= 0 ? "var(--yes)" : "var(--no)"
      }
    }, change === null ? "—" : (Number(change) >= 0 ? "+" : "") + change + "%"));
  }))))),
  // Project Breakdown
  E(Section, {
    title: "🏗 " + T.txa_by_project + " (Epoch " + latestEpoch.epoch + ")"
  }, E("div", {
    style: {
      overflowX: "auto"
    }
  }, E("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 11
    }
  }, E("thead", null, E("tr", null, E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "left",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_project), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_tx_count), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "right",
      borderBottom: "1px solid var(--border)"
    }
  }, T.txa_share), E("th", {
    style: {
      padding: "5px 8px",
      fontSize: 10,
      color: "var(--text2)",
      fontWeight: 600,
      textAlign: "left",
      borderBottom: "1px solid var(--border)",
      minWidth: 120
    }
  }, ""))), E("tbody", null, projectData.sort((a, b) => b.txCount - a.txCount).map((p, i) => {
    const pct = totalProjectTx > 0 ? p.txCount / totalProjectTx * 100 : 0;
    return E("tr", {
      key: i,
      style: {
        borderBottom: "1px solid var(--border)"
      }
    }, E("td", {
      style: {
        padding: "6px 8px",
        fontWeight: 600,
        color: p.color
      }
    }, p.name), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "var(--text)"
      }
    }, p.txCount.toLocaleString()), E("td", {
      style: {
        padding: "6px 8px",
        textAlign: "right",
        color: "var(--text2)"
      }
    }, pct.toFixed(1) + "%"), E("td", {
      style: {
        padding: "6px 8px"
      }
    }, E("div", {
      style: {
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
        background: "var(--border)",
        width: "100%"
      }
    }, E("div", {
      style: {
        height: "100%",
        width: pct + "%",
        background: p.color,
        borderRadius: 4,
        transition: "width .3s"
      }
    }))));
  })))), E("div", {
    style: {
      marginTop: 8,
      fontSize: 10,
      color: "var(--text2)",
      textAlign: "right"
    }
  }, (lang === "ja" ? "スマートコントラクトTx合計: " : "Smart Contract Txs total: ") + totalProjectTx.toLocaleString())));
}

// ════════════════════════════════════════════════════════════════
// Main App (Tab Controller + Shared Data)
// ════════════════════════════════════════════════════════════════
function App() {
  const [lang, setLang] = useHashState("lang", "en");
  const T = LANG[lang];
  const [theme, setTheme] = useHashState("theme", "dark");
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const [tab, setTab] = useHashState("tab", "dashboard");
  // Backward compat: #tab=govhub → adahub
  React.useEffect(() => { if (tab === "govhub") setTab("adahub"); }, [tab]);
  const [apiKey, setApiKey] = React.useState(getBfKey());
  const [apiKeyInput, setApiKeyInput] = React.useState(getBfKey());

  // Shared state
  const [dreps, setDreps] = React.useState([]);
  const [allDreps, setAllDreps] = React.useState([]);
  const [proposals, setProposals] = React.useState([]);
  const [votes, setVotes] = React.useState({});
  const [ccMembers, setCCMembers] = React.useState([]);
  const [ccVotes, setCCVotes] = React.useState({});
  const [ccRationales, setCCRationales] = React.useState({});
  const [drepRationales, setDrepRationales] = React.useState({});
  const [stakeHistory, setStakeHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [pageLoading, setPageLoading] = React.useState(false);
  const [stage, setStage] = React.useState("");
  const [error, setError] = React.useState(null);
  const [isDemo, setIsDemo] = React.useState(false);
  const [warnings, setWarnings] = React.useState([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [voteData, setVoteData] = React.useState({});
  const [totalActions, setTotalActions] = React.useState(0);
  const [periodVoteData, setPeriodVoteData] = React.useState({});
  const [loadingVotes, setLoadingVotes] = React.useState(false);
  const [simProgress, setSimProgress] = React.useState("");
  const [apiStats, setApiStats] = React.useState({
    calls: 0,
    cached: 0
  });

  // SPO state
  const [spoVotes, setSpoVotes] = React.useState({}); // {poolId__propKey: "Yes"/"No"/"Abstain"}
  const [spoPoolInfo, setSpoPoolInfo] = React.useState({}); // {poolId: {ticker, name, pledge_drep}}
  // Governance data state
  const [govInfo, setGovInfo] = React.useState(null); // {network, protocolParams, proposalSummaries}
  const [aiDrepTendencies, setAiDrepTendencies] = React.useState(null);
  const [aiProposalReasons, setAiProposalReasons] = React.useState(null);
  const [aiActionTypeSummary, setAiActionTypeSummary] = React.useState(null);
  const [aiMeta, setAiMeta] = React.useState(null);
  const [xDailyDigest, setXDailyDigest] = React.useState(null);
  const [xDigestMeta, setXDigestMeta] = React.useState(null);
  const spoLoadedRef = React.useRef(false);
  const loadedPageRef = React.useRef(1);
  const gaMapRef = React.useRef({});
  const allDrepsLoadedRef = React.useRef(false);
  const voteDataLoadedRef = React.useRef(false);
  const [dataSource, setDataSource] = React.useState(""); // "static" | "api" | "demo"

  const addLog = React.useCallback((level, msg) => {
    console.log(`[${level}] ${msg}`);
  }, []);

  // Load directly from DBSync API (no more static JSON dependency)
  React.useEffect(() => {
    loadFromDBSync();
  }, []);

  // ── SPO data: loaded from static JSON in loadStatic() ──
  // spoLoadedRef is set to true when static data is loaded; no live Koios fallback needed

  React.useEffect(() => {
    const interval = setInterval(() => setApiStats(getApiStats()), 2000);
    return () => clearInterval(interval);
  }, []);
  function saveApiKey() {
    // No-op: DBSync doesn't need API keys
    _cache.clear();
    loadFromDBSync();
  }
  function loadDemo() {
    const d = demoData();
    setDreps(d.dreps);
    setAllDreps(d.dreps);
    setProposals(d.proposals);
    setVotes(d.votes);
    setIsDemo(true);
    setLoading(false);
    setError(null);
    setWarnings([]);
    setHasMore(false);
  }

  // ── Load all data from DBSync API via single bundle endpoint ──
  async function loadFromDBSync() {
    const dbg = (label, data) => { console.log(`[DBSync] ${label}:`, typeof data === 'object' ? (Array.isArray(data) ? `${data.length} items` : `${Object.keys(data).length} keys`) : data); return data; };
    try {
      setLoading(true);
      setError(null);
      setIsDemo(false);
      resetApiStats();
      setStage("Loading from DBSync…");
      const t0 = Date.now();
      console.log("[DBSync] Fetching dashboard-bundle…");

      const res = await fetch("/api/bf/dashboard-bundle");
      if (!res.ok) throw new Error(`Bundle fetch failed: ${res.status}`);
      const bundle = await res.json();
      console.log(`[DBSync] Bundle received in ${Date.now() - t0}ms`);

      // DReps
      const allDrepsArr = dbg("DReps", bundle.dreps || []);

      // Votes
      const vm = dbg("Votes", bundle.votes || {});

      // Proposals — merge and normalize
      const gaMap = {};
      for (const [k, p] of Object.entries(bundle.proposals || {})) {
        gaMap[k] = p;
        if (!p.proposal_type) p.proposal_type = normalizeType(p.governance_type || p.action_type || "");
        if (!p.proposal_id) p.proposal_id = k;
        if (!p.epoch_no && p.epoch) p.epoch_no = p.epoch;
      }
      const allProposals = Object.values(gaMap);
      allProposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
      dbg("Proposals", allProposals);

      // Governance info
      if (bundle.govInfo) setGovInfo(dbg("GovInfo", bundle.govInfo));

      // CC data
      if (bundle.ccMembers) setCCMembers(dbg("CC members", bundle.ccMembers));
      if (bundle.ccVotes) setCCVotes(dbg("CC votes", bundle.ccVotes));

      // Set core state
      gaMapRef.current = gaMap;
      setDreps(allDrepsArr);
      setAllDreps(allDrepsArr);
      setProposals(allProposals);
      setVotes(vm);
      setHasMore(false);
      allDrepsLoadedRef.current = true;
      setDataSource("dbsync");
      setLoading(false);
      setWarnings([]);
      setError(null);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setSimProgress(`DBSync live: ${allDrepsArr.length} DReps, ${allProposals.length} proposals (${elapsed}s)`);
      console.log(`[DBSync] Core data set in ${elapsed}s`);

      // Phase 2: Set deferred data from bundle (already included)
      if (bundle.spoVotes) { setSpoVotes(dbg("SPO votes", bundle.spoVotes)); spoLoadedRef.current = true; }
      if (bundle.spoPools) setSpoPoolInfo(dbg("SPO pools", bundle.spoPools));
      if (bundle.drepRationales) setDrepRationales(dbg("DRep rationales", bundle.drepRationales));
      if (bundle.ccRationales) setCCRationales(dbg("CC rationales", bundle.ccRationales));
      if (bundle.stakeHistory) setStakeHistory(dbg("Stake history", bundle.stakeHistory));
      if (bundle.simulator) {
        const sim = bundle.simulator;
        const vd = sim.drepVoteCounts || {};
        const maxVotes = sim.maxVotes || 0;
        const flatExpirations = sim.proposalExpirations || {};
        const drepVotedProposals = {};
        if (sim.drepVotedProposals) {
          Object.entries(sim.drepVotedProposals).forEach(([id, arr]) => { drepVotedProposals[id] = new Set(arr); });
        }
        window.__simVoteRaw = { proposalExpirations: flatExpirations, drepVotedProposals };
        setVoteData(vd);
        setTotalActions(maxVotes);
        voteDataLoadedRef.current = true;
        dbg("Simulator", sim);
      }
      console.log("[DBSync] All bundle data applied");

      // Phase 2b: Fetch DRep names from anchor_url ONLY for those missing names (skip IPFS to reduce load)
      const drepsNeedNames = allDrepsArr.filter(d => !d.name && d.anchor_url && !d.anchor_url.startsWith("ipfs://"));
      if (drepsNeedNames.length > 0) {
        console.log(`[DBSync] Fetching names for ${drepsNeedNames.length} DReps from anchor URLs (skipping IPFS)...`);
        const BATCH = 50;
        const fetchName = async (d) => {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3000);
            const res = await fetch(d.anchor_url, { signal: ctrl.signal });
            clearTimeout(timer);
            if (!res.ok) return null;
            const json = await res.json();
            const body = json.body || json;
            const rawName = body?.givenName || body?.name || null;
            const name = typeof rawName === "string" ? rawName : rawName && typeof rawName === "object" ? rawName["@value"] || rawName.givenName || null : null;
            return { drep_id: d.drep_id, name, image_url: body?.image?.contentUrl || null };
          } catch { return null; }
        };
        (async () => {
          for (let i = 0; i < drepsNeedNames.length; i += BATCH) {
            const batch = drepsNeedNames.slice(i, i + BATCH);
            const results = await Promise.all(batch.map(fetchName));
            const nameMap = {};
            results.forEach(r => { if (r && r.name) nameMap[r.drep_id] = r; });
            if (Object.keys(nameMap).length > 0) {
              setDreps(prev => prev.map(d => nameMap[d.drep_id] ? { ...d, name: nameMap[d.drep_id].name, image_url: nameMap[d.drep_id].image_url || d.image_url } : d));
              setAllDreps(prev => prev.map(d => nameMap[d.drep_id] ? { ...d, name: nameMap[d.drep_id].name, image_url: nameMap[d.drep_id].image_url || d.image_url } : d));
            }
          }
          console.log("[DBSync] DRep name enrichment complete");
        })();
      }

      // Phase 3: AI analysis + X digest (still from adatool.net)
      const aiBase = "https://adatool.net/data/";
      const aiV = "?v=" + Date.now();
      Promise.all([
        fetch(aiBase + "ai-drep-tendencies.json" + aiV).catch(() => null),
        fetch(aiBase + "ai-proposal-reasons.json" + aiV).catch(() => null),
        fetch(aiBase + "ai-action-type-summary.json" + aiV).catch(() => null),
        fetch(aiBase + "ai-meta.json" + aiV).catch(() => null),
        fetch(aiBase + "x-daily-digest.json" + aiV).catch(() => null),
        fetch(aiBase + "x-digest-meta.json" + aiV).catch(() => null),
      ]).then(async ([dtRes, prRes, atsRes, metaRes, xDailyRes, xMetaRes]) => {
        try { if (dtRes && dtRes.ok) setAiDrepTendencies(await dtRes.json()); } catch (e) {}
        try { if (prRes && prRes.ok) setAiProposalReasons(await prRes.json()); } catch (e) {}
        try { if (atsRes && atsRes.ok) setAiActionTypeSummary(await atsRes.json()); } catch (e) {}
        try { if (metaRes && metaRes.ok) setAiMeta(await metaRes.json()); } catch (e) {}
        try { if (xDailyRes && xDailyRes.ok) setXDailyDigest(await xDailyRes.json()); } catch (e) {}
        try { if (xMetaRes && xMetaRes.ok) setXDigestMeta(await xMetaRes.json()); } catch (e) {}
        console.log("[DBSync] Phase 3 (AI/X digest) complete");
      });

    } catch (e) {
      console.error("[DBSync] loadFromDBSync failed:", e);
      setError(e.message);
      setLoading(false);
      console.log("[DBSync] Falling back to loadLive()…");
      loadLive();
    }
  }
  async function loadLive() {
    try {
      resetApiStats();
      setLoading(true);
      setError(null);
      setIsDemo(false);
      loadedPageRef.current = 1;
      gaMapRef.current = {};
      allDrepsLoadedRef.current = false;
      voteDataLoadedRef.current = false;
      setStage(T.loading_dreps);
      const {
        dreps: chunk,
        nextPage,
        reachedEnd
      } = await fetchDrepRange(1, 1, addLog, setStage);
      if (chunk.length === 0) {
        loadDemo();
        return;
      }
      const seen = new Set();
      const uniqueDreps = chunk.filter(d => {
        if (seen.has(d.drep_id)) return false;
        seen.add(d.drep_id);
        return true;
      });
      uniqueDreps.sort((a, b) => Number(b.amount) - Number(a.amount));
      loadedPageRef.current = nextPage;
      setHasMore(!reachedEnd);
      setStage(T.loading_votes);
      const {
        vm,
        gaMap,
        totalVotes
      } = await fetchVotesForDreps(uniqueDreps, addLog, setStage, T.loading_votes);
      gaMapRef.current = {
        ...gaMap
      };

      // Enrich proposals with type + title from Blockfrost
      setStage(T.loading_proposals);
      await enrichProposals(gaMapRef.current, addLog, setStage);
      const allProposals = Object.values(gaMapRef.current);
      allProposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
      setDreps(uniqueDreps);
      setAllDreps(uniqueDreps);
      setProposals(allProposals);
      setVotes(vm);
      setWarnings([]);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }
  async function loadMoreDreps() {
    if (pageLoading || !hasMore || loadedPageRef.current < 0) return;
    setPageLoading(true);
    const page = loadedPageRef.current;
    setStage(`${T.loading_dreps} (page ${page})`);
    try {
      const {
        dreps: chunk,
        nextPage,
        reachedEnd
      } = await fetchDrepRange(page, 1, addLog, setStage);
      if (chunk.length === 0) {
        setHasMore(false);
        setPageLoading(false);
        return;
      }
      if (reachedEnd) setHasMore(false);
      loadedPageRef.current = nextPage;
      const existingIds = new Set(dreps.map(d => d.drep_id));
      const newDreps = chunk.filter(d => !existingIds.has(d.drep_id));
      setStage(T.loading_votes);
      const {
        vm: newVm,
        gaMap: newGaMap
      } = await fetchVotesForDreps(newDreps, addLog, setStage, T.loading_votes);
      Object.assign(gaMapRef.current, newGaMap);

      // Enrich new proposals
      await enrichProposals(gaMapRef.current, addLog, setStage);
      const allProposals = Object.values(gaMapRef.current);
      allProposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
      const merged = [...dreps, ...newDreps];
      merged.sort((a, b) => Number(b.amount) - Number(a.amount));
      setDreps(merged);
      setAllDreps(prev => {
        const ids = new Set(prev.map(d => d.drep_id));
        const extra = newDreps.filter(d => !ids.has(d.drep_id));
        const all = [...prev, ...extra];
        all.sort((a, b) => Number(b.amount) - Number(a.amount));
        return all;
      });
      setProposals(allProposals);
      setVotes(prev => ({
        ...prev,
        ...newVm
      }));
    } catch (e) {
      addLog("ERROR", e.message);
    }
    setPageLoading(false);
  }

  // Load ALL DReps for simulator (lazy, once)
  async function ensureAllDrepsLoaded() {
    if (allDrepsLoadedRef.current || isDemo) return;
    allDrepsLoadedRef.current = true;
    setSimProgress("Loading all DReps for simulator...");
    const all = await fetchAllDreps((count, total) => {
      setSimProgress(`${count}/${total} DReps...`);
    });
    setAllDreps(all);
    if (all.length > dreps.length) {
      setDreps(all);
      setHasMore(false);
    }
    setSimProgress(`${all.length} DReps loaded`);
  }

  // Load vote data for simulator — uses proposal expiration epochs for vote period
  async function ensureVoteDataLoaded() {
    if (voteDataLoadedRef.current || isDemo) return;
    voteDataLoadedRef.current = true;
    const cached = loadSimCache();
    if (cached && cached.vd && cached.proposalExpirations && cached.drepVotedProposals) {
      setSimProgress("Restoring cached vote data…");
      setLoadingVotes(true);
      const drepVotedProposals = {};
      Object.entries(cached.drepVotedProposals).forEach(([id, arr]) => {
        drepVotedProposals[id] = new Set(arr);
      });
      window.__simVoteRaw = {
        proposalExpirations: cached.proposalExpirations,
        drepVotedProposals
      };
      setVoteData(cached.vd);
      setTotalActions(cached.maxVotes);
      setLoadingVotes(false);
      setSimProgress(`Cached: ${Object.keys(cached.vd).length} DReps (${Math.round((Date.now() - cached.ts) / 60000)}min ago)`);
      return;
    }
    setLoadingVotes(true);
    const toFetch = allDreps.slice(0, 200);
    setSimProgress(`Vote data: 0/${toFetch.length}`);
    const vd = {};
    let maxVotes = 0;
    const proposalExpirations = {}; // propKey → expiration epoch
    const drepVotedProposals = {}; // drepId → Set<propKey>

    for (let i = 0; i < toFetch.length; i += VOTE_BATCH) {
      const batch = toFetch.slice(i, i + VOTE_BATCH);
      const results = await Promise.allSettled(batch.map(async d => {
        const votes = await fetchAllVotesForDrep(d.drep_id);
        const votedProposals = new Set();
        votes.forEach(v => {
          const propTxHash = v.proposal_tx_hash || "";
          const propCertIdx = v.proposal_cert_index != null ? v.proposal_cert_index : -1;
          if (propTxHash) {
            const propKey = `${propTxHash}#${propCertIdx}`;
            votedProposals.add(propKey);
            if (!proposalExpirations[propKey]) {
              proposalExpirations[propKey] = {
                tx_hash: propTxHash,
                cert_index: propCertIdx,
                expiration: 0
              };
            }
          }
        });
        return {
          id: d.drep_id,
          count: votes.length,
          votedProposals
        };
      }));
      results.forEach(r => {
        if (r.status === "fulfilled") {
          const {
            id,
            count,
            votedProposals
          } = r.value;
          vd[id] = count;
          if (count > maxVotes) maxVotes = count;
          drepVotedProposals[id] = votedProposals;
        }
      });
      setSimProgress(`Vote data: ${Math.min(i + VOTE_BATCH, toFetch.length)}/${toFetch.length}`);
    }

    // Fetch proposal expirations from Blockfrost
    setSimProgress("Fetching proposal expirations...");
    const propEntries = Object.entries(proposalExpirations);
    for (let i = 0; i < propEntries.length; i += VOTE_BATCH) {
      const batch = propEntries.slice(i, i + VOTE_BATCH);
      await Promise.allSettled(batch.map(async ([propKey, info]) => {
        try {
          const detail = await bfFetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}`);
          if (detail && detail.expiration) {
            proposalExpirations[propKey].expiration = detail.expiration;
          }
        } catch (e) {}
      }));
      setSimProgress(`Proposal expirations: ${Math.min(i + VOTE_BATCH, propEntries.length)}/${propEntries.length}`);
    }

    // Flatten expirations for storage
    const flatExpirations = {};
    Object.entries(proposalExpirations).forEach(([k, v]) => {
      flatExpirations[k] = v.expiration || 0;
    });
    window.__simVoteRaw = {
      proposalExpirations: flatExpirations,
      drepVotedProposals
    };

    // Save to cache
    const serialDrepProps = {};
    Object.entries(drepVotedProposals).forEach(([id, s]) => {
      serialDrepProps[id] = [...s];
    });
    saveSimCache({
      vd,
      maxVotes,
      proposalExpirations: flatExpirations,
      drepVotedProposals: serialDrepProps
    });
    setVoteData(vd);
    setTotalActions(maxVotes);
    setLoadingVotes(false);
    setSimProgress(`${Object.keys(vd).length} DReps loaded & cached`);
  }

  // Compute period vote data using proposal expiration epochs
  function computePeriodVoteData(startDate, endDate) {
    const raw = window.__simVoteRaw;
    if (!raw || !startDate || !endDate) return {};
    const {
      proposalExpirations,
      drepVotedProposals
    } = raw;
    const startTs = new Date(startDate + "T00:00:00Z").getTime() / 1000;
    const endTs = new Date(endDate + "T23:59:59Z").getTime() / 1000;

    // Find proposals whose expiration epoch falls in the date range
    const proposalsInRange = new Set();
    Object.entries(proposalExpirations).forEach(([propKey, exp]) => {
      const expEpoch = typeof exp === "number" ? exp : exp?.expiration || 0;
      if (!expEpoch) return;
      const expTs = epochToTimestamp(expEpoch);
      if (expTs >= startTs && expTs <= endTs) proposalsInRange.add(propKey);
    });
    console.log(`[VotePeriod] Range: ${startDate}~${endDate}, ${proposalsInRange.size}/${Object.keys(proposalExpirations).length} proposals in range`);
    const actionsInPeriod = proposalsInRange.size;
    const result = {};
    Object.entries(drepVotedProposals).forEach(([drepId, votedSet]) => {
      let votesInPeriod = 0,
        rationalesInPeriod = 0;
      proposalsInRange.forEach(propKey => {
        if (votedSet.has(propKey)) {
          votesInPeriod++;
          if (drepRationales[`${drepId}__${propKey}`]) rationalesInPeriod++;
        }
      });
      result[drepId] = {
        votesInPeriod,
        actionsInPeriod,
        rationalesInPeriod
      };
    });
    return result;
  }

  // When switching to simulator tab, load all DReps + vote data
  React.useEffect(() => {
    if (tab === "simulator" && !loading && !isDemo && (getBfKey() || dataSource === "static")) {
      if (dataSource === "static") {
        // Static data already has all DReps + simulator data pre-loaded
        return;
      }
      ensureAllDrepsLoaded().then(() => ensureVoteDataLoaded());
    }
  }, [tab, loading, allDreps.length, dataSource]);

  // No API key needed — DBSync is always available
  // If not loading and no data, show retry/demo option
  if (!loading && !isDemo && dataSource !== "static" && dreps.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fade-in",
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: "-.02em"
      }
    }, "Adatool"), error && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
        maxWidth: 440,
        width: "100%",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: { fontSize: 14, color: "var(--text2)", marginBottom: 16 }
    }, error), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-primary",
      onClick: () => loadFromDBSync(),
      style: { marginRight: 8 }
    }, T.retry), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: loadDemo
    }, T.demo_btn)));
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-.02em"
    }
  }, "Adatool"), /*#__PURE__*/React.createElement("div", {
    className: "loader"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text2)",
      fontSize: 13
    }
  }, stage));
  if (error) return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: "#ef4444"
    }
  }, T.error_title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text2)",
      maxWidth: 460,
      textAlign: "center",
      fontSize: 13
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: loadFromDBSync
  }, T.retry), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: loadDemo
  }, T.demo_btn)));
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      minHeight: "100vh",
      padding: "14px 18px",
      maxWidth: 1900,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 0,
      marginBottom: 6,
      flexWrap: "wrap"
    }
  }, isDemo && /*#__PURE__*/React.createElement("span", {
    style: { color: "#f59e0b", fontWeight: 600, fontSize: 11, marginRight: 10 }
  }, "\u26A0 ", T.demo_mode),
  /*#__PURE__*/React.createElement("div", {
    className: "tab-bar",
    style: { display: "flex", alignItems: "center", gap: 0 }
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "dashboard" ? "active" : ""}`,
    onClick: () => setTab("dashboard")
  }, T.tab_dashboard), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "history" ? "active" : ""}`,
    onClick: () => setTab("history")
  }, T.tab_history), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "simulator" ? "active" : ""}`,
    onClick: () => setTab("simulator")
  }, T.tab_simulator), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "govdata" ? "active" : ""}`,
    onClick: () => setTab("govdata")
  }, T.tab_govdata || "Protocol Info"), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "ai" ? "active" : ""}`,
    onClick: () => setTab("ai")
  }, "\uD83E\uDD16 AI Analysis"), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${tab === "adahub" ? "active" : ""}`,
    onClick: () => setTab("adahub")
  }, "\uD83D\uDCE1 ADA Hub")),
  /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    style: { padding: "4px 8px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", background: "var(--bg3)", color: "var(--text2)" },
    title: T.theme_toggle
  }, theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }
  }, ["en", "ja"].map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setLang(l),
    style: { padding: "4px 10px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: lang === l ? "var(--accent)" : "var(--bg3)", color: lang === l ? "#fff" : "var(--text2)" }
  }, l === "en" ? "EN" : "\u65E5\u672C\u8A9E"))), isDemo && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary", onClick: loadFromDBSync, style: { fontSize: 11 }
  }, T.switch_live), /*#__PURE__*/React.createElement("button", {
    className: "btn", onClick: isDemo ? loadDemo : loadFromDBSync, style: { fontSize: 11, padding: "4px 10px" }
  }, "\u21BB ", T.refresh))), tab === "adahub" ? /*#__PURE__*/React.createElement(GovHubTab, {
    xDailyDigest: xDailyDigest,
    xDigestMeta: xDigestMeta,
    T: T,
    lang: lang
  }) : tab === "ai" ? /*#__PURE__*/React.createElement(AIAnalysisTab, {
    aiDrepTendencies: aiDrepTendencies,
    aiProposalReasons: aiProposalReasons,
    aiActionTypeSummary: aiActionTypeSummary,
    aiMeta: aiMeta,
    proposals: proposals,
    T: T,
    lang: lang
  }) : tab === "govdata" ? /*#__PURE__*/React.createElement(GovernanceDataTab, {
    govInfo: govInfo,
    T: T,
    lang: lang,
    dreps: allDreps.length ? allDreps : dreps,
    votes: votes,
    proposals: proposals,
    ccMembers: ccMembers,
    ccVotes: ccVotes,
    spoVotes: spoVotes,
    spoPoolInfo: spoPoolInfo
  }) : tab === "dashboard" ? /*#__PURE__*/React.createElement(DashboardTab, {
    dreps: dreps,
    proposals: proposals,
    votes: votes,
    drepRationales: drepRationales,
    ccMembers: ccMembers,
    ccVotes: ccVotes,
    ccRationales: ccRationales,
    spoVotes: spoVotes,
    spoPoolInfo: spoPoolInfo,
    govInfo: govInfo,
    warnings: warnings,
    hasMore: hasMore,
    pageLoading: pageLoading,
    stage: stage,
    loadMoreDreps: loadMoreDreps,
    T: T,
    isDemo: isDemo
  }) : tab === "history" ? /*#__PURE__*/React.createElement(StakeHistoryTab, {
    history: stakeHistory,
    liveDreps: allDreps,
    T: T,
    lang: lang,
    govInfo: govInfo
  }) : /*#__PURE__*/React.createElement(SimulatorTab, {
    dreps: allDreps,
    voteData: voteData,
    totalActions: totalActions,
    periodVoteData: periodVoteData,
    computePeriodVoteData: computePeriodVoteData,
    setPeriodVoteData: setPeriodVoteData,
    loadingVotes: loadingVotes,
    progress: simProgress,
    ccMembers: ccMembers,
    ccVotes: ccVotes,
    proposals: proposals,
    T: T
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      textAlign: "center",
      color: "var(--text2)",
      fontSize: 10,
      lineHeight: 1.8,
      opacity: 0.7
    }
  }, T.footer_author, " ", /*#__PURE__*/React.createElement("a", {
    href: "https://x.com/yutazzz",
    target: "_blank",
    style: {
      color: "var(--accent2)"
    }
  }, "Yuta"), " \xB7 ", /*#__PURE__*/React.createElement("a", {
    href: "https://x.com/yutazzz",
    target: "_blank",
    style: {
      color: "var(--accent2)"
    }
  }, T.footer_contact), /*#__PURE__*/React.createElement("br", null), T.footer_disclaimer));
}


// ─── Wrapper component for Next.js ───
export default function GovernanceDashboard() {
  const containerRef = React.useRef(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Load Chart.js dynamically
    if (!window.Chart) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
    // Load Inter font
    if (!document.querySelector('link[href*="Inter"]')) {
      const link = document.createElement("link");
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  if (!mounted) return React.createElement("div", { className: "p-8 text-center" }, "Loading Governance Dashboard...");

  return React.createElement("div", { ref: containerRef, className: "gov-root" },
    React.createElement(GovStyles),
    React.createElement(App)
  );
}
