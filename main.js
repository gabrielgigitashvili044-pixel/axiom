const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

let mainWindow;
let tgClient = null;

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-report-to');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('process-per-site');
app.commandLine.appendSwitch('js-flags', '--expose-gc');

const apiId = process.env.TG_API_ID || 0; // Insert your Telegram API ID here
const apiHash = process.env.TG_API_HASH || ""; // Insert your Telegram API Hash here
const stringSession = new StringSession(""); 

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1250,
        height: 800,
        minWidth: 1000,
        minHeight: 650,
        title: "Axiom Workspace Engine",
        backgroundColor: '#000000',
        frame: true,
        show: false,
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            devTools: true
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.telegram.org https://telegram.org https://chatgpt.com https://*.chatgpt.com https://discord.com https://*.discord.com https://instagram.com https://*.instagram.com https://duckduckgo.com https://*.duckduckgo.com; " +
                    "img-src 'self' data: https:; " +
                    "media-src 'self' blob: https:; " +
                    "connect-src 'self' wss: https:;"
                ]
            }
        });
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        mainWindow.webContents.executeJavaScript(`
            const activeWv = document.querySelector('webview.active');
            if (activeWv) { activeWv.src = "${details.url}"; }
        `);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    setInterval(() => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.session.clearCache().then(() => {
                console.log("Axiom Performance Core: Garbage RAM collection cleared.");
            });
        }
    }, 60000); 
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('tg-request-code', async (event, phoneNumber) => {
    try {
        tgClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await tgClient.connect();
        await tgClient.sendCode({ apiId: apiId, apiHash: apiHash }, phoneNumber);
        event.reply('tg-code-sent', { phoneNumber: phoneNumber });
    } catch (err) {
        console.error("MTProto Error:", err);
        event.reply('tg-error', err.message || err.toString());
    }
});
