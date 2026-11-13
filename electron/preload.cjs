const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktopApp: true,
  platform: process.platform,
  runtime: 'electron',
});
