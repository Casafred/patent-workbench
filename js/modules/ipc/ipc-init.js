/**
 * IPC Init Module
 * IPC功能初始化
 */

const IPCInit = (function() {
    let isInitialized = false;

    function initialize() {
        if (isInitialized) return;

        console.log('[IPC] 初始化IPC查询模块...');

        bindEvents();

        isInitialized = true;
        console.log('[IPC] IPC查询模块初始化完成');
    }

    function bindEvents() {
        const predictBtn = document.getElementById('ipc_predict_btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', IPCPredict.performPredict);
        }

        const searchBtn = document.getElementById('ipc_search_btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', IPCSearch.performSearch);
        }

        const searchInput = document.getElementById('ipc_search_input');
        if (searchInput) {
            searchInput.addEventListener('keypress', IPCSearch.handleKeyPress);
        }

        const predictInput = document.getElementById('ipc_predict_input');
        if (predictInput) {
            predictInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    IPCPredict.performPredict();
                }
            });
        }
    }

    return {
        initialize
    };
})();

window.IPCInit = IPCInit;

function switchIpcSubTab(tabName) {
    const tabs = document.querySelectorAll('#ipc_lookup-tab .ipc-sub-tab');
    const buttons = document.querySelectorAll('#ipc_lookup-tab .sub-tab-button');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    const targetTab = document.getElementById(`ipc-${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
    }

    event.target.classList.add('active');

    if (tabName === 'browse') {
        IPCTree.initialize();
    }
}

function closeIpcDetailModal() {
    const modal = document.getElementById('ipc_detail_modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('ipc_detail_modal');
    if (e.target === modal) {
        closeIpcDetailModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeIpcDetailModal();
    }
});
