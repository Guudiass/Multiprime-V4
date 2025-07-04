// preload-secure.js – V8.4 – Versão com Usabilidade Melhorada

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

// --- Injeção de Sessão (Inalterado) ---
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

// --- Funções de IndexedDB (Inalterado) ---
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

console.log('%c[PRELOAD SCRIPT V8.4] Olá! O script foi EXECUTADO com sucesso!', 'color: #00FF00; font-size: 16px;');

// --- Constantes da UI ---
const TITLE_BAR_HEIGHT = 40;
const STYLE_ID = 'sb-style-sheet';
const MAX_Z_INDEX = 2147483647;
let isInitialized = false;
const downloads = new Map();

// --- LÓGICA DE LAYOUT OTIMIZADA ---
function applyLayoutFix() {
    const root = document.documentElement;
    const body = document.body;

    // Garante que o scroll considere a altura da barra de título
    if (root.style.scrollPaddingTop !== `${TITLE_BAR_HEIGHT}px`) {
        root.style.setProperty('scroll-padding-top', `${TITLE_BAR_HEIGHT}px`, 'important');
    }
    
    // Evita que barras de notificação de alguns sites (como cookies)
    // fiquem por cima da nossa barra de título.
    if (body.style.position === 'relative') {
        body.style.setProperty('position', 'static', 'important');
    }
}

const domObserver = new MutationObserver(applyLayoutFix);

function initializeLayoutEngine() {
    applyLayoutFix();
    // Observa mudanças no <html> e <body> que podem interferir no layout
    domObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    domObserver.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    
    window.addEventListener('resize', applyLayoutFix);
    window.addEventListener('load', applyLayoutFix);
}

// --- Funções da UI de Downloads (Inalterado) ---
function showDownloadNotification(filename) {
    const notification = document.createElement('div');
    notification.className = 'download-toast';
    notification.innerHTML = `Download iniciado<br><strong></strong>`;
    notification.querySelector('strong').textContent = filename;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

function updateDownloadsUI() {
    const panel = document.getElementById('downloads-panel');
    const button = document.getElementById('downloads-button');
    if (!panel || !button) return;
    panel.innerHTML = '';
    if (downloads.size === 0) { panel.classList.remove('has-downloads'); button.style.color = '#ecf0f1'; return; }
    panel.classList.add('has-downloads');
    let activeDownloads = 0;
    Array.from(downloads.values()).reverse().forEach((dl) => {
        if (dl.state === 'active') activeDownloads++;
        const itemEl = document.createElement('div');
        itemEl.className = 'download-item';
        let stateClass = '', progressText = `${dl.progress}%`;
        switch (dl.state) {
            case 'completed': stateClass = 'completed'; progressText = 'Concluído'; break;
            case 'cancelled': stateClass = 'failed'; progressText = 'Cancelado'; break;
            case 'interrupted': stateClass = 'failed'; progressText = 'Falha'; break;
        }
        itemEl.innerHTML = `<div class="download-info"><span class="download-filename" title="${dl.filename}">${dl.filename}</span><span>${progressText}</span></div><div class="download-progress-bar"><div class="download-progress-inner ${stateClass}" style="width: ${dl.progress}%;"></div></div>`;
        if (dl.state === 'completed') {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'download-actions';
            actionsEl.innerHTML = `<span class="download-action-btn" data-path="${dl.path}" data-action="open">Abrir</span><span class="download-action-btn" data-path="${dl.path}" data-action="show">Mostrar na pasta</span>`;
            itemEl.appendChild(actionsEl);
        }
        panel.appendChild(itemEl);
    });
    button.style.color = activeDownloads > 0 ? '#3498db' : '#2ecc71';
}

// --- Listeners do IPC (Inalterado) ---
function setupIpcListeners() {
    ipcRenderer.on('url-updated', (event, url) => {
        const display = document.getElementById('url-display');
        if (display) display.value = url;
    });
    ipcRenderer.on('download-started', (event, { id, filename }) => {
        downloads.set(id, { filename, progress: 0, state: 'active' });
        updateDownloadsUI();
        showDownloadNotification(filename);
    });
    ipcRenderer.on('download-progress', (event, { id, progress }) => {
        const download = downloads.get(id);
        if (download?.state === 'active') { download.progress = progress; updateDownloadsUI(); }
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

// --- Criação da Barra de Título e CSS (Com Alterações) ---
function createCustomTitleBar() {
    if (document.getElementById(STYLE_ID)) return;
    const uiStyles = document.createElement('style');
    uiStyles.id = STYLE_ID;
    uiStyles.innerHTML = `
        :root { 
            --secure-titlebar-height: ${TITLE_BAR_HEIGHT}px;
        }
        /* OTIMIZAÇÃO: Usa scroll-padding para evitar que o conteúdo fique sob a barra, sem quebrar o layout */
        html {
            scroll-padding-top: var(--secure-titlebar-height) !important;
        }
        /* OTIMIZAÇÃO: Remove o padding-top do body, que quebra muitos sites. */
        body { 
            /* A barra é 'sticky', então não precisamos mais de padding. */
        }
        /* OTIMIZAÇÃO: Barra de título agora usa 'sticky' para flutuar sem alterar o layout da página. */
        [data-secure-titlebar] { 
            position: sticky !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            height: var(--secure-titlebar-height) !important; 
            background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%) !important; 
            display: flex !important; 
            align-items: center !important; 
            justify-content: space-between !important; 
            padding: 0 10px !important; 
            box-sizing: border-box !important; 
            border-bottom: 1px solid #1a252f !important; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important; 
            z-index: ${MAX_Z_INDEX} !important; 
            -webkit-app-region: drag; 
            pointer-events: auto !important;
        }
        [data-secure-titlebar] * { -webkit-app-region: no-drag; pointer-events: auto !important; }
        .titlebar-controls { display: flex; align-items: center; gap: 8px; }
        .titlebar-url-container { flex-grow: 1; padding: 0 20px; display: flex; align-items: center; gap: 10px; }
        #url-status-indicator { width: 8px; height: 8px; border-radius: 50%; background-color: ${navigator.onLine ? '#2ecc71' : '#e74c3c'}; flex-shrink: 0; transition: background-color 0.3s ease; }
        #url-display { width: 100%; height: 26px; background-color: rgba(0,0,0,0.2); border: 1px solid #2c3e50; border-radius: 13px; color: #ecf0f1; padding: 0 12px; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; text-align: center; outline: none; }
        .titlebar-button { width: 30px; height: 30px; background: transparent; color: #ecf0f1; border: none; border-radius: 6px; font-size: 18px; cursor: pointer; display: flex; justify-content: center; align-items: center; line-height: 1; user-select: none; padding: 0; transition: background-color 0.2s ease; }
        .titlebar-button:hover { background-color: rgba(255, 255, 255, 0.1); }
        .titlebar-button.close-btn:hover { background-color: #e74c3c; }
        .titlebar-button.nav-btn { font-size: 22px; }
        .titlebar-button.close-btn { font-size: 24px; }
        .downloads-panel { display: none; position: fixed; top: var(--secure-titlebar-height); right: 10px; width: 330px; max-height: 450px; overflow-y: auto; background-color: #34495e; border: 1px solid #2c3e50; border-radius: 0 0 8px 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.35); z-index: ${MAX_Z_INDEX -1}; color: #ecf0f1; }
        .downloads-panel.has-downloads { padding: 8px; box-sizing: border-box; }
        .downloads-panel:not(.has-downloads)::before { content: 'Nenhum download iniciado'; text-align: center; padding: 25px 15px; font-size: 13px; color: #bdc3c7; display: block; }
        .download-item { padding: 10px; border-bottom: 1px solid #2c3e50; font-family: 'Segoe UI', sans-serif; font-size: 13px; display: flex; flex-direction: column; gap: 6px; }
        .download-item:last-child { border-bottom: none; }
        .download-info { display: flex; justify-content: space-between; align-items: center; }
        .download-filename { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
        .download-progress-bar { width: 100%; height: 5px; background-color: rgba(0,0,0,0.3); border-radius: 2.5px; overflow: hidden; }
        .download-progress-inner { height: 100%; background-color: #3498db; width: 0%; transition: width 0.4s ease-out; }
        .download-progress-inner.completed { background-color: #2ecc71; }
        .download-progress-inner.failed { background-color: #e74c3c; }
        .download-actions { margin-top: 8px; display: flex; gap: 15px; font-size: 12px; }
        .download-action-btn { color: #3498db; cursor: pointer; font-weight: 500; }
        .download-action-btn:hover { color: #5dade2; text-decoration: underline; }
        .download-toast { position: fixed; bottom: 20px; right: -400px; background-color: #2c3e50; color: #ecf0f1; padding: 12px 20px; border-radius: 6px; border-left: 4px solid #3498db; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: ${MAX_Z_INDEX - 2}; font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.4; transition: right 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); }
        .download-toast.show { right: 20px; }
        :fullscreen [data-secure-titlebar], :-webkit-full-screen [data-secure-titlebar] { display: none !important; }
    `;
    // OTIMIZAÇÃO: Injeta os estilos no <head> para serem aplicados antes da renderização do body.
    (document.head || document.documentElement).appendChild(uiStyles);

    const titleBar = document.createElement('div');
    titleBar.setAttribute('data-secure-titlebar', '');
    
    // O restante da criação dos botões e painéis permanece o mesmo
    const leftControls = document.createElement('div');
    leftControls.className = 'titlebar-controls';
    const urlContainer = document.createElement('div');
    urlContainer.className = 'titlebar-url-container';
    const rightControls = document.createElement('div');
    rightControls.className = 'titlebar-controls';
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'url-status-indicator';
    statusIndicator.title = navigator.onLine ? 'Conectado' : 'Desconectado';
    const urlDisplay = document.createElement('input');
    urlDisplay.type = 'text';
    urlDisplay.readOnly = true; // Mantido como readOnly para evitar confusão. A navegação por URL pode ser melhorada no futuro.
    urlDisplay.id = 'url-display';
    urlDisplay.placeholder = 'Navegando em...';

    const getStorageAsObject = (storage) => {
        const obj = {};
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key) obj[key] = storage.getItem(key);
        }
        return obj;
    };

    const createButton = (innerHTML, onClick, title, extraClass = '') => {
        const button = document.createElement('button');
        button.innerHTML = innerHTML;
        button.title = title;
        button.className = `titlebar-button ${extraClass}`;
        if (onClick) button.addEventListener('click', onClick);
        return button;
    };

    const handleExportSession = async () => {
        console.log('[EXPORTAÇÃO] Coletando dados de sessão para exportação...');
        const localStorageData = getStorageAsObject(window.localStorage);
        const sessionStorageData = getStorageAsObject(window.sessionStorage);
        const indexedDBData = await exportIndexedDB();
        ipcRenderer.send('initiate-full-session-export', { localStorageData, sessionStorageData, indexedDBData });
    };

    // A lógica de navegação por Enter na URL foi removida para simplificar.
    // É mais robusto usar os botões de navegação.
    
    const backButton = createButton('←', () => ipcRenderer.send('navigate-back'), 'Voltar', 'nav-btn');
    const forwardButton = createButton('→', () => ipcRenderer.send('navigate-forward'), 'Avançar', 'nav-btn');
    const reloadButton = createButton('↻', () => ipcRenderer.send('navigate-reload'), 'Recarregar');
    const downloadsButton = createButton('📥', null, 'Downloads');
    downloadsButton.id = 'downloads-button';
    const exportSessionButton = createButton('💾', handleExportSession, 'Salvar Sessão (FTP/Local)');
    const minimizeButton = createButton('−', () => ipcRenderer.send('minimize-secure-window'), 'Minimizar');
    const maximizeButton = createButton('☐', () => ipcRenderer.send('maximize-secure-window'), 'Maximizar');
    const closeButton = createButton('×', () => ipcRenderer.send('close-secure-window'), 'Fechar', 'close-btn');
    const downloadsPanel = document.createElement('div');
    downloadsPanel.className = 'downloads-panel';
    downloadsPanel.id = 'downloads-panel';
    downloadsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadsPanel.style.display = downloadsPanel.style.display === 'block' ? 'none' : 'block';
    });

    leftControls.append(backButton, forwardButton, reloadButton);
    urlContainer.append(statusIndicator, urlDisplay);
    // Adiciona o botão de exportar junto aos botões de janela
    rightControls.append(downloadsButton, minimizeButton, maximizeButton, closeButton);
    titleBar.append(leftControls, urlContainer, rightControls);
    
    // OTIMIZAÇÃO: A barra é inserida como o primeiro elemento do body para funcionar com `position: sticky`.
    document.body.prepend(titleBar);
    document.body.append(downloadsPanel);

    const updateConnectionStatus = () => {
        const indicator = document.getElementById('url-status-indicator');
        if (!indicator) return;
        const isOnline = navigator.onLine;
        indicator.style.backgroundColor = isOnline ? '#2ecc71' : '#e74c3c';
        indicator.title = isOnline ? 'Conectado' : 'Desconectado';
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

// --- Lógica de Inicialização (Com Alterações) ---
function initializeApp() {
    if (isInitialized) return;
    isInitialized = true;
    try {
        console.log('Inicializando UI do navegador seguro (V8.4)...');
        createCustomTitleBar();
        setupIpcListeners();
        ipcRenderer.send('request-initial-url');
        initializeLayoutEngine(); // Inicia o motor de layout otimizado
        
        // Listener para fechar o painel de downloads ao clicar fora
        document.addEventListener('click', (event) => {
            const panel = document.getElementById('downloads-panel');
            const button = document.getElementById('downloads-button');
            if (panel?.style.display === 'block' && !panel.contains(event.target) && button && !button.contains(event.target)) {
                panel.style.display = 'none';
            }
        });

        // Listener para ações de download
        document.body.addEventListener('click', (event) => {
            const target = event.target.closest('.download-action-btn');
            if (target?.dataset.action && target?.dataset.path) {
                const action = target.dataset.action === 'open' ? 'open-download' : 'show-download-in-folder';
                ipcRenderer.send(action, target.dataset.path);
            }
        });
        
        console.log('Navegador seguro inicializado com sucesso.');
    } catch (error) {
        console.error('Erro na inicialização do preload:', error);
    }
}

// Garante a execução assim que o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}