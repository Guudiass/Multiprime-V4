// preload-secure.js – V8.7 – Versão Final Otimizada

// Camuflagem Anti-Detecção de Bots
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ],
});

const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

const { ipcRenderer } = require('electron');

ipcRenderer.on('inject-session-data', (event, sessionData) => {
    (async () => {
        try {
            if (sessionData && typeof sessionData === 'object') {
                console.log('[PRELOAD] Recebendo dados da sessão para injeção...');
                if (sessionData.localStorage) {
                    for (const [key, value] of Object.entries(sessionData.localStorage)) {
                        window.localStorage.setItem(key, value);
                    }
                }
                if (sessionData.sessionStorage) {
                    for (const [key, value] of Object.entries(sessionData.sessionStorage)) {
                        window.sessionStorage.setItem(key, value);
                    }
                }
                if (sessionData.indexedDB) {
                    await importIndexedDB(sessionData.indexedDB);
                }
            }
        } catch (err) {
            console.error('[PRELOAD] Erro ao injetar dados da sessão:', err);
        }
    })();
});

ipcRenderer.send('request-session-data');

async function exportIndexedDB() {
    try {
        const allData = {};
        const databases = await window.indexedDB.databases();
        if (!databases || databases.length === 0) return {};
        for (const dbInfo of databases) {
            if (!dbInfo.name) continue;
            try {
                const dbData = {};
                const db = await new Promise((resolve, reject) => {
                    const request = window.indexedDB.open(dbInfo.name);
                    request.onerror = (e) => reject(`Erro ao abrir DB: ${dbInfo.name} - ${e.target.error}`);
                    request.onsuccess = (e) => resolve(e.target.result);
                });
                const storeNames = Array.from(db.objectStoreNames);
                if (storeNames.length === 0) { db.close(); continue; }
                const tx = db.transaction(storeNames, 'readonly');
                for (const storeName of storeNames) {
                    const storeData = await new Promise((resolve, reject) => {
                        const request = tx.objectStore(storeName).getAll();
                        request.onerror = (e) => reject(`Erro ao ler store: ${storeName} - ${e.target.error}`);
                        request.onsuccess = (e) => resolve(e.target.result);
                    });
                    dbData[storeName] = storeData;
                }
                allData[dbInfo.name] = dbData;
                db.close();
            } catch (dbError) {
                console.error(`[INDEXEDDB EXPORT] Falha ao exportar DB "${dbInfo.name}":`, dbError);
            }
        }
        return allData;
    } catch (error) {
        console.error('[INDEXEDDB EXPORT] Falha crítica na exportação:', error);
        return {};
    }
}

async function importIndexedDB(dataToImport) {
    if (!dataToImport || Object.keys(dataToImport).length === 0) return;
    for (const dbName in dataToImport) {
        try {
            const dbStoresToImport = Object.keys(dataToImport[dbName]);
            if (dbStoresToImport.length === 0) continue;

            // Especial handling para captions.ai
            if (dbName.includes('captions')) {
                console.log(`[INDEXEDDB] Pulando importação para DB do captions: ${dbName}`);
                continue;
            }

            const db = await new Promise((resolve, reject) => {
                const request = window.indexedDB.open(dbName, Date.now());
                request.onerror = (e) => reject(`Erro ao abrir/criar DB: ${dbName} - ${e.target.error}`);
                request.onsuccess = (e) => resolve(e.target.result);
                request.onupgradeneeded = (e) => {
                    const dbInstance = e.target.result;
                    const existingStores = Array.from(dbInstance.objectStoreNames);
                    dbStoresToImport.forEach(storeName => {
                        if (!existingStores.includes(storeName)) {
                            dbInstance.createObjectStore(storeName);
                        }
                    });
                };
            });

            await new Promise((resolve, reject) => {
                const tx = db.transaction(dbStoresToImport, 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(`Falha na transação de escrita: ${e.target.error}`);
                for (const storeName of dbStoresToImport) {
                    const store = tx.objectStore(storeName);
                    store.clear();
                    const records = dataToImport[dbName][storeName];
                    records.forEach(record => store.put(record));
                }
            });
            db.close();
        } catch (error) {
            console.error(`[INDEXEDDB IMPORT] Falha crítica na importação de "${dbName}":`, error);
        }
    }
}

console.log('%c[PRELOAD SCRIPT V8.7] Olá! O script foi EXECUTADO com sucesso!', 'color: #00FF00; font-size: 16px;');

// ===== BARRA OTIMIZADA COM CARREGAMENTO RÁPIDO =====

(() => {
    const TITLE_BAR_HEIGHT = 40;
    const CONTAINER_ID = 'secure-browser-titlebar-2025';
    let isInitialized = false;
    const downloads = new Map();
    let container = null;
    let shadowRoot = null;

    // Criar barra imediatamente
    function createTitleBar() {
        if (isInitialized || document.getElementById(CONTAINER_ID)) return;
        isInitialized = true;

        try {
            // Criar container
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.setAttribute('data-secure-browser', 'true');
            
            // Estilo inline crítico
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: ${TITLE_BAR_HEIGHT}px;
                z-index: 2147483647;
                pointer-events: none;
                isolation: isolate;
                display: block !important;
                visibility: visible !important;
            `;

            // Shadow DOM
            shadowRoot = container.attachShadow({ mode: 'closed' });

            // CSS interno
            const style = document.createElement('style');
            style.textContent = `
                :host {
                    all: initial;
                    display: block !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: ${TITLE_BAR_HEIGHT}px !important;
                }
                
                .bar {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    box-sizing: border-box;
                    border-bottom: 1px solid #1a252f;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    -webkit-app-region: drag;
                    pointer-events: auto;
                    font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    color: #ecf0f1;
                    user-select: none;
                }
                
                .bar * {
                    -webkit-app-region: no-drag;
                    pointer-events: auto;
                }
                
                .group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .url-box {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 20px;
                }
                
                .status {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${navigator.onLine ? '#2ecc71' : '#e74c3c'};
                }
                
                .url {
                    flex: 1;
                    height: 26px;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid #2c3e50;
                    border-radius: 13px;
                    color: #ecf0f1;
                    padding: 0 12px;
                    font-size: 12px;
                    text-align: center;
                    outline: none;
                }
                
                button {
                    width: 30px;
                    height: 30px;
                    background: transparent;
                    color: #ecf0f1;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    transition: background 0.2s;
                    padding: 0;
                    margin: 0;
                    outline: none;
                }
                
                button:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                button.close:hover {
                    background: #e74c3c;
                }
                
                .nav {
                    font-size: 22px;
                }
                
                .downloads-menu {
                    display: none;
                    position: absolute;
                    top: 100%;
                    right: 10px;
                    width: 330px;
                    max-height: 450px;
                    background: #34495e;
                    border: 1px solid #2c3e50;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.35);
                    overflow-y: auto;
                    color: #ecf0f1;
                    font-size: 13px;
                    padding: 8px;
                    box-sizing: border-box;
                }
                
                .downloads-menu.open {
                    display: block;
                }
                
                .downloads-menu:empty::before {
                    content: 'Nenhum download iniciado';
                    display: block;
                    text-align: center;
                    padding: 20px;
                    color: #bdc3c7;
                }
                
                .dl-item {
                    padding: 10px;
                    border-bottom: 1px solid #2c3e50;
                }
                
                .dl-item:last-child {
                    border-bottom: none;
                }
                
                .dl-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }
                
                .dl-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 220px;
                }
                
                .dl-progress {
                    height: 5px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .dl-bar {
                    height: 100%;
                    background: #3498db;
                    transition: width 0.3s;
                }
                
                .dl-bar.done {
                    background: #2ecc71;
                }
                
                .dl-actions {
                    margin-top: 8px;
                    display: flex;
                    gap: 15px;
                    font-size: 12px;
                }
                
                .dl-action {
                    color: #3498db;
                    cursor: pointer;
                    text-decoration: none;
                }
                
                .dl-action:hover {
                    color: #5dade2;
                    text-decoration: underline;
                }
            `;

            shadowRoot.appendChild(style);

            // HTML da barra
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.innerHTML = `
                <div class="group">
                    <button class="nav" data-action="back">←</button>
                    <button class="nav" data-action="forward">→</button>
                    <button data-action="reload">↻</button>
                </div>
                <div class="url-box">
                    <div class="status"></div>
                    <input type="text" class="url" readonly>
                </div>
                <div class="group">
                    <button data-action="downloads">📥</button>
                    <button data-action="minimize">−</button>
                    <button data-action="maximize">☐</button>
                    <button class="close" data-action="close">×</button>
                </div>
                <div class="downloads-menu"></div>
            `;

            shadowRoot.appendChild(bar);

            // Adicionar ao documento
            if (document.body) {
                document.body.appendChild(container);
            } else {
                document.documentElement.appendChild(container);
            }

            // Ajuste do layout
            applyLayoutAdjustment();

            // Configurar eventos
            setupEvents();
            setupIpcListeners();

            // Solicitar URL inicial
            ipcRenderer.send('request-initial-url');

            // Monitorar mudanças no DOM
            setupDomMonitoring();

            console.log('[SECURE BROWSER] Barra inicializada com sucesso');

        } catch (error) {
            console.error('[SECURE BROWSER] Erro ao criar barra:', error);
        }
    }

    // Aplicar ajuste de layout
    function applyLayoutAdjustment() {
        // Criar ou atualizar estilo
        let styleEl = document.getElementById('secure-browser-layout-adjust');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'secure-browser-layout-adjust';
            document.head.appendChild(styleEl);
        }
        
        styleEl.textContent = `
            html {
                margin-top: ${TITLE_BAR_HEIGHT}px !important;
            }
            body {
                position: relative !important;
                min-height: calc(100vh - ${TITLE_BAR_HEIGHT}px) !important;
            }
        `;
    }

    // Monitorar DOM para manter a barra sempre visível
    function setupDomMonitoring() {
        // Observer para detectar remoção da barra
        const observer = new MutationObserver((mutations) => {
            // Verificar se a barra foi removida
            if (!document.getElementById(CONTAINER_ID)) {
                console.log('[SECURE BROWSER] Barra removida, recriando...');
                isInitialized = false;
                createTitleBar();
            }
            
            // Verificar se o estilo foi removido
            if (!document.getElementById('secure-browser-layout-adjust')) {
                applyLayoutAdjustment();
            }
        });

        // Observar mudanças no documento
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // Listener para mudanças de rota (SPA)
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                // Verificar integridade após mudança de rota
                setTimeout(() => {
                    if (!document.getElementById(CONTAINER_ID)) {
                        isInitialized = false;
                        createTitleBar();
                    }
                }, 100);
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // Configurar eventos
    function setupEvents() {
        if (!shadowRoot) return;

        const bar = shadowRoot.querySelector('.bar');
        const urlInput = shadowRoot.querySelector('.url');
        const downloadsMenu = shadowRoot.querySelector('.downloads-menu');

        // Delegação de eventos
        bar.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            if (!action) return;

            switch (action) {
                case 'back':
                    ipcRenderer.send('navigate-back');
                    break;
                case 'forward':
                    ipcRenderer.send('navigate-forward');
                    break;
                case 'reload':
                    ipcRenderer.send('navigate-reload');
                    break;
                case 'downloads':
                    downloadsMenu.classList.toggle('open');
                    break;
                case 'export':
                    exportSession();
                    break;
                case 'minimize':
                    ipcRenderer.send('minimize-secure-window');
                    break;
                case 'maximize':
                    ipcRenderer.send('maximize-secure-window');
                    break;
                case 'close':
                    ipcRenderer.send('close-secure-window');
                    break;
            }
        });

        // Fechar menu ao clicar fora
        shadowRoot.addEventListener('click', (e) => {
            if (!e.target.closest('.downloads-menu') && !e.target.closest('[data-action="downloads"]')) {
                downloadsMenu.classList.remove('open');
            }
        });

        // URL navigation
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                let url = e.target.value.trim();
                if (url && !url.startsWith('http')) {
                    url = 'https://' + url;
                }
                if (url) {
                    ipcRenderer.send('navigate-to-url', url);
                }
            }
        });

        // Atualizar status de conexão
        const updateStatus = () => {
            const status = shadowRoot.querySelector('.status');
            if (status) {
                status.style.background = navigator.onLine ? '#2ecc71' : '#e74c3c';
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
    }

    // Exportar sessão
    async function exportSession() {
        const getStorageAsObject = (storage) => {
            const obj = {};
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key) obj[key] = storage.getItem(key);
            }
            return obj;
        };

        const localStorageData = getStorageAsObject(window.localStorage);
        const sessionStorageData = getStorageAsObject(window.sessionStorage);
        const indexedDBData = await exportIndexedDB();

        ipcRenderer.send('initiate-full-session-export', {
            localStorageData,
            sessionStorageData,
            indexedDBData
        });
    }

    // Configurar listeners IPC
    function setupIpcListeners() {
        ipcRenderer.on('url-updated', (event, url) => {
            if (shadowRoot) {
                const urlInput = shadowRoot.querySelector('.url');
                if (urlInput) urlInput.value = url;
            }
        });

        ipcRenderer.on('download-started', (event, { id, filename }) => {
            downloads.set(id, { filename, progress: 0, state: 'active' });
            updateDownloadsUI();
            showNotification(`Download iniciado: ${filename}`);
        });

        ipcRenderer.on('download-progress', (event, { id, progress }) => {
            const download = downloads.get(id);
            if (download?.state === 'active') {
                download.progress = progress;
                updateDownloadsUI();
            }
        });

        ipcRenderer.on('download-complete', (event, { id, state, path }) => {
            const download = downloads.get(id);
            if (download) {
                download.state = state;
                download.path = path;
                download.progress = (state === 'completed') ? 100 : download.progress;
                updateDownloadsUI();
            }
        });
    }

    // Atualizar UI de downloads
    function updateDownloadsUI() {
        if (!shadowRoot) return;

        const menu = shadowRoot.querySelector('.downloads-menu');
        if (!menu) return;

        menu.innerHTML = '';

        downloads.forEach((dl) => {
            const item = document.createElement('div');
            item.className = 'dl-item';
            
            let status = `${dl.progress}%`;
            if (dl.state === 'completed') status = 'Concluído';
            else if (dl.state === 'cancelled') status = 'Cancelado';
            else if (dl.state === 'interrupted') status = 'Falha';

            const barClass = dl.state === 'completed' ? 'done' : '';

            item.innerHTML = `
                <div class="dl-info">
                    <span class="dl-name" title="${dl.filename}">${dl.filename}</span>
                    <span>${status}</span>
                </div>
                <div class="dl-progress">
                    <div class="dl-bar ${barClass}" style="width: ${dl.progress}%"></div>
                </div>
            `;

            if (dl.state === 'completed' && dl.path) {
                const actions = document.createElement('div');
                actions.className = 'dl-actions';
                actions.innerHTML = `
                    <a class="dl-action" data-path="${dl.path}" data-action="open">Abrir</a>
                    <a class="dl-action" data-path="${dl.path}" data-action="show">Mostrar na pasta</a>
                `;
                
                actions.addEventListener('click', (e) => {
                    const target = e.target;
                    if (target.classList.contains('dl-action')) {
                        const path = target.dataset.path;
                        const action = target.dataset.action;
                        if (action === 'open') {
                            ipcRenderer.send('open-download', path);
                        } else if (action === 'show') {
                            ipcRenderer.send('show-download-in-folder', path);
                        }
                    }
                });
                
                item.appendChild(actions);
            }

            menu.appendChild(item);
        });
    }

    // Notificação
    function showNotification(text) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: -400px;
            background: #2c3e50;
            color: #ecf0f1;
            padding: 12px 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2147483646;
            font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: right 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        `;
        notif.textContent = text;
        document.body.appendChild(notif);

        requestAnimationFrame(() => {
            notif.style.right = '20px';
        });

        setTimeout(() => {
            notif.style.right = '-400px';
            setTimeout(() => notif.remove(), 500);
        }, 4000);
    }

    // Inicializar imediatamente
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        createTitleBar();
    } else {
        document.addEventListener('DOMContentLoaded', createTitleBar);
    }

    // Verificação periódica de integridade
    setInterval(() => {
        if (!document.getElementById(CONTAINER_ID)) {
            isInitialized = false;
            createTitleBar();
        }
    }, 1000);
})();