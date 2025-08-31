// js/dom.js (最终修正版)

// --- DOM 元素缓存 ---
const getEl = id => document.getElementById(id);

// API Key Config
const globalApiKeyInput = getEl('global_api_key_input');
const apiKeyToggleVisibilityBtn = getEl('api_key_toggle_visibility_btn');
const apiKeyCopyBtn = getEl('api_key_copy_btn');
const apiKeyDeleteBtn = getEl('api_key_delete_btn');
const apiKeySaveBtn = getEl('api_key_save_btn');
const apiKeySaveStatus = getEl('api_key_save_status');
const apiConfigToggleBtn = getEl('api_config_toggle_btn');
const apiConfigContainer = getEl('api_config_container');

// Chat (功能一)
const chatModelSelect = getEl('chat_model_select');
const chatContextCount = getEl('chat_context_count');
const chatPersonaSelect = getEl('chat_persona_select');
const chatTempInput = getEl('chat_temperature');
const chatNewBtn = getEl('chat_new_btn');
const chatInputNewBtn = getEl('chat_input_new_btn');
const chatManageBtn = getEl('chat_manage_btn');
const chatAddPersonaBtn = getEl('chat_add_persona_btn');
const chatDeletePersonaBtn = getEl('chat_delete_persona_btn');
const chatWindow = getEl('chat_window');
const chatInput = getEl('chat_input');
const chatCharCount = getEl('chat_char_count');
const chatSendBtn = getEl('chat_send_btn');
const chatHistoryList = getEl('chat_history_list');
const chatManagementBar = getEl('chat_management_bar');
const chatSelectAllBtn = getEl('chat_select_all_btn');
const chatDeselectAllBtn = getEl('chat_deselect_all_btn');
const chatDeleteSelectedBtn = getEl('chat_delete_selected_btn');
// ▼▼▼ 新增：即时对话文件上传相关元素 ▼▼▼
const chatFileStatusArea = getEl('chat_file_status_area');
const chatUploadFileBtn = getEl('chat_upload_file_btn');
const chatFileInput = getEl('chat_file_input');
// ▲▲▲ 新增结束 ▲▲▲

// Async Batch (功能二)
const asyncInputsCount = getEl('async_inputs_count');
const asyncInputsManagement = getEl('async_inputs_management');
const asyncInputsSelectAllBtn = getEl('async_inputs_select_all_btn');
const asyncInputsDeleteSelectedBtn = getEl('async_inputs_delete_selected_btn');
const asyncExportExcelBtn = getEl('async_export_excel_btn');
const asyncRecoverBtn = getEl('async_recover_btn');
const asyncExcelColumnCount = getEl('async_excel_column_count');
const asyncColumnConfigContainer = getEl('async_column_config_container');
const asyncExcelColumnConfigArea = getEl('async_excel_column_config_area');
const asyncPreviewRequestBtn = getEl('async_preview_request_btn');
const asyncRequestBodyPreview = getEl('async_request_body_preview');
const asyncRequestsCount = getEl('async_requests_count');

// Large Batch (功能三)
const genFileInput = getEl('gen_file-input');
const genSheetSelector = getEl('gen_sheet-selector');
const columnConfigContainer = getEl('column-config-container');
const columnCountInput = getEl('column-count');
const columnConfigArea = getEl('column-config-area');
const genGenerateBtn = getEl('gen_generate-btn');
const genPreviewOutput = getEl('gen_preview_output');
const genDownloadBtn = getEl('gen_download-btn');
const genReadyInfo = getEl('gen_ready_info');
const apiModelSelect = getEl('api-model');
const apiTempInput = getEl('api-temperature');
const apiSystemInput = getEl('api-system-prompt');
const templateSelector = getEl('template_selector');
const templateFileInput = getEl('template_file_input');
const promptRules = getEl('prompt-rules');
const contentInsertionPreview = getEl('content-insertion-preview');
const outputFieldsContainer = getEl('output-fields-container');
const batchLog = getEl('batch_log');
const batchIdReminder = getEl('batch_id_reminder');
const btnUpload = getEl('batch_step1_upload');
const btnCreate = getEl('batch_step2_create');
const btnCheck = getEl('batch_step3_check');
const btnDownload = getEl('batch_step3_download');
const autoCheckContainer = getEl('auto-check-container');
const autoCheckStatusEl = getEl('auto_check_status');
const btnStopCheck = getEl('batch_stop_check_btn');
const recoverIdInput = getEl('recover_batch_id_input');
const btnRecover = getEl('recover_state_btn');
const repExcelInput = getEl('rep_excel-input');
const repSheetSelector = getEl('rep_sheet-selector');
const repJsonlInput = getEl('rep_jsonl-input');
const repGenerateBtn = getEl('rep_generate-report-btn');
const repPreview = getEl('rep_output_preview');
const repDownloadBtn = getEl('rep_download-report-btn');
const repInfoBox = getEl('reporter-info-box');

// Local Patent Lib (功能四)
const lplOriginalFileInput = getEl('lpl_original_file_input');
const lplOriginalSheetSelect = getEl('lpl_original_sheet_select');
const lplOriginalIgnoreHeader = getEl('lpl_original_ignore_header');
const lplFamilyColNameInput = getEl('lpl_family_col_name');
const lplDelimiterInput = getEl('lpl_delimiter');
const lplExpandBtn = getEl('lpl_expand_btn');
const lplExpandStatus = getEl('lpl_expand_status');
const lplExpandResultArea = getEl('lpl_expand_result_area');
const lplUniqueCountSpan = getEl('lpl_unique_count');
const lplExpandedListOutput = getEl('lpl_expanded_list_output');
const lplCopyBtn = getEl('lpl_copy_btn');
const lplDownloadTxtBtn = getEl('lpl_download_txt_btn');
const lplOriginalFileConfirm = getEl('lpl_original_file_confirm');
const lplOriginalReuploadInput = getEl('lpl_original_reupload_input');
const lplOriginalMergeSheetSelect = getEl('lpl_original_merge_sheet_select');
const lplOriginalMergeIgnoreHeader = getEl('lpl_original_merge_ignore_header');
const lplNewFileInput = getEl('lpl_new_file_input');
const lplNewSheetSelect = getEl('lpl_new_sheet_select');
const lplNewIgnoreHeader = getEl('lpl_new_ignore_header');
const lplOriginalKeySelect = getEl('lpl_original_key_select');
const lplNewKeySelect = getEl('lpl_new_key_select');
const lplMergeBtn = getEl('lpl_merge_btn');
const lplMergeStatus = getEl('lpl_merge_status');
const lplResultSummary = getEl('lpl_result_summary');
const lplResultPreviewArea = getEl('lpl_result_preview_area');
const lplResultPreviewTable = getEl('lpl_result_preview_table');
const lplDownloadFinalBtn = getEl('lpl_download_final_btn');
const lplOldColsSelectionArea = getEl('lpl_old_cols_selection_area');
const lplSelectAllColsBtn = getEl('lpl_select_all_cols_btn');
const lplDeselectAllColsBtn = getEl('lpl_deselect_all_cols_btn');
const lplOldColsCheckboxes = getEl('lpl_old_cols_checkboxes');
// ▼▼▼ 新增：权利要求对比功能 (功能五) ▼▼▼
const claimTextA = getEl('claim_text_a');
const claimTextB = getEl('claim_text_b');
const claimsCompareBtn = getEl('claims_compare_btn');
const comparisonResultContainer = getEl('comparison_result_container');
// 新增独立权利要求相关元素
const baseIndependentClaimsInput = getEl('base_independent_claims');
const comparisonIndependentClaimsInput = getEl('comparison_independent_claims');
// 新增语言检测与翻译相关元素
const detectBaseLanguageBtn = getEl('detect_base_language_btn');
const detectComparisonLanguageBtn = getEl('detect_comparison_language_btn');
const baseLanguageDisplay = getEl('base_language_display');
const comparisonLanguageDisplay = getEl('comparison_language_display');
// 新增原文/翻译切换按钮
const displayModeToggle = getEl('display_mode_toggle');
// ▲▲▲ 新增结束 ▲▲▲
// Files Manager (新增)
const chatManageFilesBtn = getEl('chat_manage_files_btn');
const fileManagerModal = getEl('file_manager_modal');
const fileManagerCloseBtn = getEl('file_manager_close_btn');
const fmFileInput = getEl('fm_file_input');
const fmPurposeSelect = getEl('fm_purpose_select');
const fmUploadBtn = getEl('fm_upload_btn');
const fmFilterPurpose = getEl('fm_filter_purpose');
const fmRefreshBtn = getEl('fm_refresh_btn');
const fmList = getEl('fm_list');
