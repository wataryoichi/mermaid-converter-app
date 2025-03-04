const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const Store = require('electron-store');

const store = new Store();

// mmdc CLI パスの取得方法
function getMmdcPath() {
  return path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // 開発ツールを開く（開発時のみ）
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Mermaidファイルを変換
ipcMain.handle('convert-mermaid', async (event, { filePath, outputFormat, theme }) => {
  try {
    // 一時ファイルを作成
    const tempDir = app.getPath('temp');
    const tempMermaidFile = path.join(tempDir, `temp-${Date.now()}.mmd`);
    const outputFileName = path.parse(filePath).name;
    
    // 設定からの出力ディレクトリ取得（デフォルトはユーザーのダウンロードフォルダ）
    const outputDir = store.get('outputDirectory', app.getPath('downloads'));
    const outputPath = path.join(outputDir, `${outputFileName}.${outputFormat}`);
    
    // Mermaidファイルの内容を読み込み
    const mermaidContent = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(tempMermaidFile, mermaidContent);

    // mmdc コマンドを実行
    const mmdc = getMmdcPath();
    const args = [
      '-i', tempMermaidFile,
      '-o', outputPath,
      '-t', theme || 'default'
    ];

    return new Promise((resolve, reject) => {
      execFile(mmdc, args, (error, stdout, stderr) => {
        // 一時ファイルを削除
        try { fs.unlinkSync(tempMermaidFile); } catch (e) { /* 無視 */ }
        
        if (error) {
          console.error('Error:', error);
          console.error('Stderr:', stderr);
          reject({
            success: false,
            error: stderr || error.message
          });
          return;
        }
        
        resolve({
          success: true,
          outputPath
        });
      });
    });
  } catch (error) {
    console.error('Error in convert-mermaid:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 出力ディレクトリを選択
ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const outputDir = result.filePaths[0];
    store.set('outputDirectory', outputDir);
    return outputDir;
  }
  
  return null;
});

// 現在の出力ディレクトリを取得
ipcMain.handle('get-output-directory', () => {
  return store.get('outputDirectory', app.getPath('downloads'));
});