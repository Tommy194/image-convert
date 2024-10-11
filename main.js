const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs-extra');

let Store;
let store;

import('electron-store').then(module => {
    Store = module.default;
    store = new Store();

    ipcMain.on('load-settings', (event) => {
        const settings = store.get('settings', {});
        event.reply('settings-loaded', settings);
    });

    ipcMain.on('save-settings', (event, settings) => {
        store.set('settings', settings);
    });
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('select-folder', (event, type) => {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled) {
            event.reply('folder-selected', type, result.filePaths[0]);
        }
    });
});

ipcMain.on('select-file', (event, type) => {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
    }).then(result => {
        if (!result.canceled) {
            event.reply('file-selected', type, result.filePaths[0]);
        }
    });
});

ipcMain.on('exit', () => {
    app.quit();
});

ipcMain.on('open-folder', (event, folderPath) => {
    if (folderPath) {
        require('electron').shell.openPath(folderPath);
    }
});

ipcMain.on('execute', async (event, data) => {
  try {
    const { inputFolder, outputFolder, watermarkPath, filename, startNumber, watermarkPosition } = data;
    const files = await fs.readdir(inputFolder);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    let watermark;
    if (watermarkPath) {
      watermark = await sharp(watermarkPath)
        .resize({ width: 400 })
        .toBuffer();
    }

    for (let i = 0; i < imageFiles.length; i++) {
      const inputPath = path.join(inputFolder, imageFiles[i]);
      const outputFileName = `${filename}_${String(parseInt(startNumber) + i).padStart(6, '0')}.jpg`;
      const outputPath = path.join(outputFolder, outputFileName);

      // ファイルの存在確認
      if (await fs.pathExists(outputPath)) {
        const response = await dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['上書き', 'スキップ', '中止'],
          defaultId: 2,
          title: '確認',
          message: `ファイル "${outputFileName}" は既に存在します。どうしますか？`,
        });

        if (response.response === 1) { // スキップ
          event.reply('progress', { current: i + 1, total: imageFiles.length });
          continue;
        } else if (response.response === 2) { // 中止
          event.reply('cancelled');
          return;
        }
        // 上書きの場合は処理を続行
      }

      let image = sharp(inputPath);
      const metadata = await image.metadata();

      let processedImage = image.resize({ width: 1920, height: 1080, fit: 'inside' });

      if (watermark) {
        const compositeOptions = {
          input: watermark,
          gravity: watermarkPosition
        };

        switch (watermarkPosition) {
          case 'southeast':
            compositeOptions.top = metadata.height - 420;
            compositeOptions.left = metadata.width - 420;
            break;
          case 'northeast':
            compositeOptions.top = 20;
            compositeOptions.left = metadata.width - 420;
            break;
          case 'southwest':
            compositeOptions.top = metadata.height - 420;
            compositeOptions.left = 20;
            break;
          case 'northwest':
            compositeOptions.top = 20;
            compositeOptions.left = 20;
            break;
        }

        processedImage = processedImage.composite([compositeOptions]);
      }

      await processedImage
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      event.reply('progress', { current: i + 1, total: imageFiles.length });
    }

    event.reply('complete');
  } catch (error) {
    console.error('Error in execute:', error);
    event.reply('error', error.message);
  }
});