const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('scholarflowNative',Object.freeze({revealPath:(path)=>ipcRenderer.invoke('scholarflow:reveal-path',path)}));
