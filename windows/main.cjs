const {app,BrowserWindow,ipcMain,shell} = require('electron');
const fs = require('node:fs');
const {fileURLToPath}=require('node:url');
const path = require('node:path');
function createWindow(){
  const win = new BrowserWindow({
    width:1320,height:860,minWidth:840,minHeight:560,
    backgroundColor:'#f3f6fb',title:'ScholarFlow · 科研工作台',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.cjs')}
  });
  const localIndex=path.join(__dirname,'..','index.html');
  win.webContents.on('will-navigate',(event,url)=>{
    // Never let remote links replace the privileged local app document.
    try{if(new URL(url).protocol!=='file:'||path.normalize(fileURLToPath(url))!==path.normalize(localIndex))event.preventDefault()}
    catch{event.preventDefault()}
  });
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.loadFile(localIndex);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
}
app.whenReady().then(()=>{
  ipcMain.handle('scholarflow:reveal-path',async (event,target)=>{
    try{
      // Only our app's own main frame can ask the shell to reveal a file.
      if(!event.senderFrame||event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('file://')||path.normalize(fileURLToPath(event.senderFrame.url))!==path.normalize(path.join(__dirname,'..','index.html')))throw Error('权限不足');
      if(typeof target!=='string'||!path.isAbsolute(target)||target.length>2048||target.includes('\0')||!fs.existsSync(target))throw Error('文件路径无效或目标不存在');
      shell.showItemInFolder(target);return {ok:true};
    }catch(e){return {ok:false,error:e.message}}
  });
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
