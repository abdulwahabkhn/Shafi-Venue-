const {app, BrowserWindow, Menu, dialog, shell, session} = require('electron');
const {PORTAL, trusted} = require('./policy.cjs');

// Remote content has browser privileges only: no preload, IPC bridge or Node API.
app.enableSandbox();
app.setAppUserModelId('com.shafimarquee.management');
let win;
let loading = false;
const smoke = process.argv.includes('--smoke-test');
if (!app.requestSingleInstanceLock()) { if(smoke) app.exit(2); else app.quit(); }
else {
  app.on('second-instance', () => {if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(async () => {
    const portalSession = session.fromPartition('shafi-online'); // Memory-only login storage.
    portalSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    portalSession.setPermissionCheckHandler(()=>false);
    // Never allow the remote portal to download and launch executable content.
    portalSession.on('will-download', (_event,item)=>{
      if (!/\.(pdf|csv|xlsx|png|jpe?g|webp)$/i.test(item.getFilename())) item.cancel();
    });
    win = new BrowserWindow({
      width:1440,height:950,minWidth:800,minHeight:600,show:!smoke,
      title:'Shafi Complex & Marquee',backgroundColor:'#10382e',
      webPreferences:{session:portalSession,nodeIntegration:false,nodeIntegrationInWorker:false,
        nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,
        allowRunningInsecureContent:false,webviewTag:false,devTools:!app.isPackaged}
    });
    win.webContents.on('will-attach-webview', event=>event.preventDefault());
    for(const name of ['will-navigate','will-redirect']) {
      win.webContents.on(name,(event,url)=>{if(!trusted(url))event.preventDefault();});
    }
    win.webContents.setWindowOpenHandler(({url})=>{
      // Same-origin links remain in the secured window; unknown schemes/hosts are denied.
      if(trusted(url)) void win.loadURL(url).catch(()=>{});
      return {action:'deny'};
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'Portal',submenu:[
        {label:'Open management',click:()=>void loadPortal()},
        {label:'Open web portal in browser',click:()=>void shell.openExternal(PORTAL)},
        {type:'separator'}, {label:'Print / Save as PDF',accelerator:'CmdOrCtrl+P',click:()=>win.webContents.print({printBackground:true})},
        {type:'separator'}, {role:'quit'}]},
      {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
      {label:'View',submenu:[{label:'Reload',accelerator:'CmdOrCtrl+R',click:()=>void loadPortal()},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}
    ]));
    if(smoke) setTimeout(()=>app.exit(1),45000).unref();
    await loadPortal();
  });
}
async function loadPortal() {
  if(loading || !win || win.isDestroyed()) return;
  loading = true;
  let retry = false;
  try {
    await win.loadURL(PORTAL);
    if(smoke) {console.log('Desktop HTTPS portal loaded with sandbox and isolated session.');app.exit(0);}
  } catch {
    if(smoke) {app.exit(1);return;}
    if(win.isDestroyed()) return;
    const result=await dialog.showMessageBox(win,{type:'warning',title:'Connection unavailable',
      message:'The online portal could not be loaded.',detail:'Check your internet connection. No offline changes are saved. Choose Retry when connected.',
      buttons:['Retry','Close'],defaultId:0,cancelId:1});
    if(!win.isDestroyed()) { if(result.response===0) retry = true; else win.close(); }
  } finally {
    loading = false;
  }
  if(retry) void loadPortal();
}
app.on('window-all-closed',()=>app.quit());
