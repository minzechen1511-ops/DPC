const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProc = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Digital Product Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const port = process.env.PORT || '3847';
  const serverEntry = path.join(__dirname, '..', 'server.ts');

  serverProc = spawn(
    process.execPath,
    ['--import', 'tsx', serverEntry],
    {
      env: { ...process.env, NODE_ENV: 'production', PORT: port },
      stdio: 'ignore',
    }
  );

  setTimeout(() => createWindow(port), 1200);
});

app.on('window-all-closed', () => {
  if (serverProc) {
    serverProc.kill();
    serverProc = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
