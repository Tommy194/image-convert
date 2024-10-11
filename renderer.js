const { ipcRenderer } = require('electron');

// 設定を読み込む
ipcRenderer.send('load-settings');

ipcRenderer.on('settings-loaded', (event, settings) => {
  if (settings.inputFolder) document.getElementById('input-folder').value = settings.inputFolder;
  if (settings.outputFolder) document.getElementById('output-folder').value = settings.outputFolder;
  if (settings.watermarkPath) document.getElementById('watermark').value = settings.watermarkPath;
  if (settings.filename) document.getElementById('filename').value = settings.filename;
  if (settings.startNumber) document.getElementById('start-number').value = settings.startNumber;
  if (settings.watermarkPosition) document.getElementById('watermark-position').value = settings.watermarkPosition;
  updateSampleFilename();
});

// 設定を保存する関数
function saveSettings() {
  const settings = {
    inputFolder: document.getElementById('input-folder').value,
    outputFolder: document.getElementById('output-folder').value,
    watermarkPath: document.getElementById('watermark').value,
    filename: document.getElementById('filename').value,
    startNumber: document.getElementById('start-number').value,
    watermarkPosition: document.getElementById('watermark-position').value
  };
  ipcRenderer.send('save-settings', settings);
}

document.getElementById('select-input').addEventListener('click', () => {
    ipcRenderer.send('select-folder', 'input');
});

document.getElementById('select-watermark').addEventListener('click', () => {
    ipcRenderer.send('select-file', 'watermark');
});

document.getElementById('select-output').addEventListener('click', () => {
    ipcRenderer.send('select-folder', 'output');
});

document.getElementById('execute').addEventListener('click', () => {
  const data = {
    inputFolder: document.getElementById('input-folder').value,
    outputFolder: document.getElementById('output-folder').value,
    watermarkPath: document.getElementById('watermark').value,
    filename: document.getElementById('filename').value,
    startNumber: parseInt(document.getElementById('start-number').value, 10),
    watermarkPosition: document.getElementById('watermark-position').value
  };

  if (!data.inputFolder || !data.outputFolder || !data.filename) {
    alert('入力フォルダ、出力フォルダ、ファイル名は必須です。');
    return;
  }

  saveSettings();
  ipcRenderer.send('execute', data);
  document.getElementById('execute').disabled = true;
  document.getElementById('progress-bar').style.display = 'block';
});

document.getElementById('exit').addEventListener('click', () => {
    ipcRenderer.send('exit');
});

document.getElementById('open-folder').addEventListener('click', () => {
    const outputFolder = document.getElementById('output-folder').value;
    ipcRenderer.send('open-folder', outputFolder);
});

ipcRenderer.on('folder-selected', (event, type, path) => {
    document.getElementById(`${type}-folder`).value = path;
    saveSettings();
});

ipcRenderer.on('file-selected', (event, type, path) => {
    document.getElementById(type).value = path;
    saveSettings();
});

ipcRenderer.on('progress', (event, { current, total }) => {
  const percent = Math.round((current / total) * 100);
  document.getElementById('progress').style.width = `${percent}%`;
  document.getElementById('progress').textContent = `${percent}%`;
});

ipcRenderer.on('complete', () => {
  document.getElementById('execute').textContent = '実行';
  document.getElementById('execute').disabled = false;
  document.getElementById('open-folder').style.display = 'inline-block';
  document.getElementById('progress-bar').style.display = 'none';
  alert('処理が完了しました。');
});

ipcRenderer.on('error', (event, message) => {
  document.getElementById('execute').textContent = '実行';
  document.getElementById('execute').disabled = false;
  document.getElementById('progress-bar').style.display = 'none';
  alert(`エラーが発生しました: ${message}`);
});

// ファイル名サンプルの更新
function updateSampleFilename() {
    const filename = document.getElementById('filename').value;
    const startNumber = document.getElementById('start-number').value;
    const sample = `${filename}_${String(startNumber).padStart(6, '0')}.jpg`;
    document.getElementById('sample-filename').value = sample;
}

document.getElementById('filename').addEventListener('input', updateSampleFilename);
document.getElementById('start-number').addEventListener('input', updateSampleFilename);

// 新しい要素のイベントリスナー
document.getElementById('watermark-position').addEventListener('change', saveSettings);