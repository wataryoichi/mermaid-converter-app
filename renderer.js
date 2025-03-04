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
        window.electronAPI.openFile(outputPath);
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