// mermaid-converter-app
// ファイル構成:
// - package.json
// - main.js
// - preload.js
// - index.html
// - renderer.js
// - styles.css

// package.json
{
  "name": "mermaid-converter",
  "version": "1.0.0",
  "description": "Convert Mermaid diagrams to SVG/PNG/PDF via drag and drop",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --mac --win",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win"
  },
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^24.9.1"
  },
  "dependencies": {
    "@mermaid-js/mermaid-cli": "^10.6.1",
    "electron-store": "^8.1.0"
  },
  "build": {
    "appId": "com.mermaid.converter",
    "productName": "Mermaid Converter",
    "mac": {
      "category": "public.app-category.developer-tools"
    },
    "win": {
      "target": "nsis"
    },
    "files": [
      "**/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/*.d.ts",
      "!**/node_modules/.bin",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
    ]
  }
}

// main.js
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

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  convertMermaid: (options) => ipcRenderer.invoke('convert-mermaid', options),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getOutputDirectory: () => ipcRenderer.invoke('get-output-directory')
});

// index.html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mermaid Converter</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Mermaid Converter</h1>
    
    <div class="settings-section">
      <div class="setting">
        <label for="output-format">出力形式:</label>
        <select id="output-format">
          <option value="svg">SVG</option>
          <option value="png">PNG</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      
      <div class="setting">
        <label for="theme-select">テーマ:</label>
        <select id="theme-select">
          <option value="default">Default</option>
          <option value="forest">Forest</option>
          <option value="dark">Dark</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>
      
      <div class="setting">
        <label>出力先:</label>
        <span id="output-directory-display">読み込み中...</span>
        <button id="select-output-btn">フォルダ選択</button>
      </div>
    </div>

    <div id="drop-area">
      <p>Mermaidファイルをここにドラッグ＆ドロップ</p>
      <p>または</p>
      <label for="file-select" class="file-select-label">ファイルを選択</label>
      <input type="file" id="file-select" accept=".mmd,.md" hidden>
    </div>

    <div id="conversion-status" class="hidden">
      <div class="status-content">
        <div id="status-message"></div>
        <div class="spinner hidden"></div>
      </div>
    </div>
    
    <div id="results" class="hidden">
      <h2>変換結果</h2>
      <div id="result-list"></div>
    </div>
  </div>

  <script src="renderer.js"></script>
</body>
</html>

// renderer.js
document.addEventListener('DOMContentLoaded', async () => {
  const dropArea = document.getElementById('drop-area');
  const fileSelect = document.getElementById('file-select');
  const outputFormat = document.getElementById('output-format');
  const themeSelect = document.getElementById('theme-select');
  const conversionStatus = document.getElementById('conversion-status');
  const statusMessage = document.getElementById('status-message');
  const spinner = document.querySelector('.spinner');
  const results = document.getElementById('results');
  const resultList = document.getElementById('result-list');
  const selectOutputBtn = document.getElementById('select-output-btn');
  const outputDirectoryDisplay = document.getElementById('output-directory-display');
  
  // 出力ディレクトリの表示を更新
  async function updateOutputDirectoryDisplay() {
    const outputDir = await window.electronAPI.getOutputDirectory();
    outputDirectoryDisplay.textContent = outputDir;
  }
  
  // 初期表示
  updateOutputDirectoryDisplay();
  
  // 出力ディレクトリ選択ボタン
  selectOutputBtn.addEventListener('click', async () => {
    await window.electronAPI.selectOutputDirectory();
    updateOutputDirectoryDisplay();
  });

  // ドラッグオーバーイベント
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // ドラッグ&ドロップの視覚的フィードバック
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('highlight');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('highlight');
    });
  });
  
  // ファイルドロップ処理
  dropArea.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });
  
  // ファイル選択ダイアログ
  fileSelect.addEventListener('change', (e) => {
    const files = e.target.files;
    handleFiles(files);
  });
  
  // ファイル処理
  async function handleFiles(files) {
    if (files.length === 0) return;
    
    // UIをリセット
    resultList.innerHTML = '';
    results.classList.add('hidden');
    
    // 変換処理の開始を表示
    conversionStatus.classList.remove('hidden');
    spinner.classList.remove('hidden');
    statusMessage.textContent = '変換中...';
    
    const format = outputFormat.value;
    const theme = themeSelect.value;
    
    for (const file of files) {
      try {
        statusMessage.textContent = `${file.name} を変換中...`;
        
        // ファイル拡張子チェック
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'mmd' && ext !== 'md') {
          showError(`${file.name} は対応していない形式です。.mmd または .md ファイルを使用してください。`);
          continue;
        }
        
        // 変換処理の実行
        const result = await window.electronAPI.convertMermaid({
          filePath: file.path,
          outputFormat: format,
          theme: theme
        });
        
        if (result.success) {
          addResultItem(file.name, result.outputPath, format);
        } else {
          showError(`${file.name} の変換に失敗しました: ${result.error}`);
        }
      } catch (error) {
        showError(`エラーが発生しました: ${error.message || error}`);
      }
    }
    
    // 処理完了
    spinner.classList.add('hidden');
    statusMessage.textContent = '変換完了';
    
    // 結果があれば表示
    if (resultList.children.length > 0) {
      results.classList.remove('hidden');
    }
    
    // 5秒後にステータス表示を消す
    setTimeout(() => {
      conversionStatus.classList.add('hidden');
    }, 5000);
  }
  
  // 結果アイテムを追加
  function addResultItem(fileName, outputPath, format) {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    const icon = document.createElement('span');
    icon.className = 'format-icon';
    icon.textContent = format.toUpperCase();
    
    const details = document.createElement('div');
    details.className = 'result-details';
    
    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = fileName;
    
    const path = document.createElement('div');
    path.className = 'result-path';
    path.textContent = outputPath;
    
    const openButton = document.createElement('button');
    openButton.className = 'open-button';
    openButton.textContent = '開く';
    openButton.onclick = () => {
      // ファイルを開く処理（OS標準のアプリで）
      const { shell } = require('electron');
      shell.openPath(outputPath);
    };
    
    details.appendChild(name);
    details.appendChild(path);
    
    item.appendChild(icon);
    item.appendChild(details);
    item.appendChild(openButton);
    
    resultList.appendChild(item);
  }
  
  // エラー表示
  function showError(message) {
    spinner.classList.add('hidden');
    statusMessage.textContent = message;
    statusMessage.classList.add('error');
    
    setTimeout(() => {
      statusMessage.classList.remove('error');
    }, 5000);
  }
});

// styles.css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.settings-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.setting {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.setting label {
  width: 80px;
  font-weight: 500;
}

.setting select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  flex-grow: 1;
  margin-right: 10px;
}

#output-directory-display {
  flex-grow: 1;
  padding: 8px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#select-output-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

#select-output-btn:hover {
  background-color: #45a049;
}

#drop-area {
  border: 2px dashed #3498db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  background-color: #ecf0f1;
  cursor: pointer;
  transition: all 0.3s;
}

#drop-area.highlight {
  background-color: #d6eaf8;
  border-color: #2980b9;
}

#drop-area p {
  margin: 10px 0;
  color: #7f8c8d;
}

.file-select-label {
  display: inline-block;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.file-select-label:hover {
  background-color: #2980b9;
}

#conversion-status {
  margin-top: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

#status-message {
  flex-grow: 1;
}

#status-message.error {
  color: #e74c3c;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

#results {
  margin-top: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

#results h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.result-item:last-child {
  border-bottom: none;
}

.format-icon {
  background-color: #3498db;
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 12px;
  min-width: 30px;
  text-align: center;
}

.result-details {
  flex-grow: 1;
  overflow: hidden;
}

.result-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.result-path {
  color: #7f8c8d;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.open-button {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.open-button:hover {
  background-color: #27ae60;
}

.hidden {
  display: none;
}
