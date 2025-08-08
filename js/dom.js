// --- DOM 元素缓存 ---
const getEl = id => document.getElementById(id);
const globalApiKeyInput = getEl('global_api_key_input');
const apiKeyToggleVisibilityBtn = getEl('api_key_toggle_visibility_btn');
const apiKeyCopyBtn = getEl('api_key_copy_btn');
const apiKeyDeleteBtn = getEl('api_key_delete_btn');
const apiKeySaveBtn = getEl('api_key_save_btn');
const apiKeySaveStatus = getEl('api_key_save_status');
const apiConfigToggleBtn = getEl('api_config_toggle_btn');
const apiConfigContainer = getEl('api_config_container');
// Chat
const chatModelSelect = getEl('chat_model_select'), chatContextCount = getEl('chat_context_count');
const chatPersonaSelect = getEl('chat_persona_select'), chatTempInput = getEl('chat_temperature');
const chatNewBtn = getEl('chat_new_btn');
const chatInputNewBtn = getEl('chat_input_new_btn');
const chatManageBtn = getEl('chat_manage_btn');
const chatAddPersonaBtn = getEl('chat_add_persona_btn'), chatEditPersonaBtn = getEl('chat_edit_persona_btn'), chatDeletePersonaBtn = getEl('chat_delete_persona_btn');
const chatWindow = getEl('chat_window'), chatInput = getEl('chat_input'), chatCharCount = getEl('chat_char_count'), chatSendBtn = getEl('chat_send_btn');
const chatHistoryList = getEl('chat_history_list');
// ▼▼▼ 最终修正：确保管理栏容器和所有按钮都被正确声明 ▼▼▼
const chatManagementBar = getEl('chat_management_bar'); // 补上这一行关键代码！
const chatSelectAllBtn = getEl('chat_select_all_btn');
const chatDeselectAllBtn = getEl('chat_deselect_all_btn');
const chatDeleteSelectedBtn = getEl('chat_delete_selected_btn');

// ▼▼▼ 新增：文件上传和管理相关 DOM 元素 ▼▼▼
const chatUploadFileBtn = getEl('chat_upload_file_btn');
const chatFileInput = getEl('chat_file_input');
const chatFileStatusArea = getEl('chat_file_status_area');
const chatFileManageBtn = getEl('chat_file_manage_btn');
const fileManagerModal = getEl('file_manager_modal');
const closeFileManagerBtn = getEl('close_file_manager_btn');
const fileManagerList = getEl('file_manager_list');
const fileManagerStatus = getEl('file_manager_status');
// ▲▲▲ 新增结束 ▲▲▲

// Async Batch (v2) - 新增和修改的元素
const asyncInputsCount = getEl('async_inputs_count');
const asyncInputsManagement = getEl('async_inputs_management');
const asyncInputsSelectAllBtn = getEl('async_inputs_select_all_btn');
const asyncInputsDeleteSelectedBtn = getEl('async_inputs_delete_selected_btn');
const asyncExportExcelBtn = getEl('async_export_excel_btn');
const asyncRecoverBtn = getEl('async_recover_btn');
// 新增的UI元素
const asyncExcelColumnCount = getEl('async_excel_column_count');
const asyncColumnConfigContainer = getEl('async_column_config_container');
const asyncExcelColumnConfigArea = getEl('async_excel_column_config_area');
const asyncPreviewRequestBtn = getEl('async_preview_request_btn');
const asyncRequestBodyPreview = getEl('async_request_body_preview');
const asyncRequestsCount = getEl('async_requests_count');


// Large Batch (Generator)
const genFileInput = getEl('gen_file-input'), genSheetSelector = getEl('gen_sheet-selector');
const columnConfigContainer = getEl('column-config-container'), columnCountInput = getEl('column-count'), columnConfigArea = getEl('column-config-area');
const genGenerateBtn = getEl('gen_generate-btn'), genPreviewOutput = getEl('gen_preview_output'), genDownloadBtn = getEl('gen_download-btn'), genReadyInfo = getEl('gen_ready_info');
const apiModelSelect = getEl('api-model'), apiTempInput = getEl('api-temperature'), apiSystemInput = getEl('api-system-prompt');
const templateSelector = getEl('template_selector'), templateFileInput = getEl('template_file_input');
const promptRules = getEl('prompt-rules'), contentInsertionPreview = getEl('content-insertion-preview'), outputFieldsContainer = getEl('output-fields-container');
// Large Batch (Workflow)
const batchLog = getEl('batch_log'), batchIdReminder = getEl('batch_id_reminder');
const btnUpload = getEl('batch_step1_upload'), btnCreate = getEl('batch_step2_create'), btnCheck = getEl('batch_step3_check'), btnDownload = getEl('batch_step4_download');
const autoCheckContainer = getEl('auto-check-container'), autoCheckStatusEl = getEl('auto_check_status'), btnStopCheck = getEl('batch_stop_check_btn');
const recoverIdInput = getEl('recover_batch_id_input'), btnRecover = getEl('recover_state_btn');
// Large Batch (Reporter)
const repExcelInput = getEl('rep_excel-input'), repSheetSelector = getEl('rep_sheet-selector'), repJsonlInput = getEl('rep_jsonl-input');
const repGenerateBtn = getEl('rep_generate-report-btn'), repPreview = getEl('rep_output_preview'), repDownloadBtn = getEl('rep_download-report-btn'), repInfoBox = getEl('reporter-info-box');

// ▼▼▼ 添加功能四的DOM元素声明 ▼▼▼
const lplOriginalFileInput = getEl('lpl_original_file_input');
const lplOriginalSheetSelect = getEl('lpl_original_sheet_select'); // 新增
const lplOriginalIgnoreHeader = getEl('lpl_original_ignore_header'); // 新增
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
const lplOriginalReuploadInput = getEl('lpl_original_reupload_input'); // 新增
const lplOriginalMergeSheetSelect = getEl('lpl_original_merge_sheet_select'); // 新增
const lplOriginalMergeIgnoreHeader = getEl('lpl_original_merge_ignore_header'); // 新增
const lplNewFileInput = getEl('lpl_new_file_input');
const lplNewSheetSelect = getEl('lpl_new_sheet_select'); // 新增
const lplNewIgnoreHeader = getEl('lpl_new_ignore_header'); // 新增
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
