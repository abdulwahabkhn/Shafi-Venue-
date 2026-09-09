const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const source=readFileSync(require.resolve('./main.cjs'),'utf8');
async function launch({smoke=false,lock=true,fail=false,closedDuringLoad=false}={}) {
  const state={exits:[],loads:[],dialogs:0};
  const app=new EventEmitter();
  Object.assign(app,{enableSandbox(){state.sandbox=true;},setAppUserModelId(){},requestSingleInstanceLock:()=>lock,
    quit(){state.quit=true;},exit(code){state.exits.push(code);},whenReady:()=>Promise.resolve(),isPackaged:true});
  const ses=new EventEmitter();
  ses.setPermissionRequestHandler=fn=>state.permission=fn;
  ses.setPermissionCheckHandler=fn=>state.check=fn;
  class Window extends EventEmitter {
    constructor(options){super();state.options=options;state.win=this;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=fn=>state.popup=fn;}
    isDestroyed(){return !!state.destroyed;}
    close(){state.destroyed=true;}
    async loadURL(url){state.loads.push(url);if(closedDuringLoad)state.destroyed=true;if(fail)throw new Error('offline');}
  }
  const electron={app,BrowserWindow:Window,session:{fromPartition(name){state.partition=name;return ses;}},
    Menu:{buildFromTemplate:items=>items,setApplicationMenu:items=>state.menu=items},
    dialog:{async showMessageBox(){state.dialogs++;return {response:1};}},shell:{openExternal(){}}};
  vm.runInNewContext(source,{require:name=>name==='electron'?electron:require(name),process:{argv:smoke?['--smoke-test']:[]},console:{log(){}},setTimeout:()=>({unref(){}})});
  await new Promise(resolve=>setImmediate(resolve));
  state.session=ses;
  return state;
}
test('Desktop keeps sandbox, isolation and permissions locked down',async()=>{
  const s=await launch();assert.equal(s.sandbox,true);assert.equal(s.partition.startsWith('persist:'),false);
  const p=s.options.webPreferences;
  for(const key of ['sandbox','contextIsolation','webSecurity'])assert.equal(p[key],true,key);
  for(const key of ['nodeIntegration','nodeIntegrationInWorker','nodeIntegrationInSubFrames','webviewTag','allowRunningInsecureContent','devTools'])assert.equal(p[key],false,key);
  assert.equal(p.preload,undefined);assert.equal(s.check(),false);
  s.permission(null,'camera',allowed=>assert.equal(allowed,false));
  let prevented=false;s.win.webContents.emit('will-attach-webview',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
});
test('Untrusted navigation, redirects and popups are blocked',async()=>{
  const s=await launch();
  for(const event of ['will-navigate','will-redirect']){
    let blocked=false;s.win.webContents.emit(event,{preventDefault(){blocked=true;}},'https://evil.example');assert.equal(blocked,true);
  }
  assert.equal(s.popup({url:'file:///C:/Windows'}).action,'deny');assert.equal(s.loads.length,1);
});
test('Executable downloads blocked and reports permitted',async()=>{
  const s=await launch();
  for(const [name,expected] of [['report.pdf',false],['report.csv',false],['report.pdf.exe',true],['script.ps1',true],['page.html',true]]){
    let cancelled=false;s.session.emit('will-download',null,{getFilename:()=>name,cancel(){cancelled=true;}});assert.equal(cancelled,expected,name);
  }
});
test('Offline startup offers recovery and closes cleanly',async()=>{const s=await launch({fail:true});assert.equal(s.dialogs,1);assert.equal(s.destroyed,true);});
test('Closing during failed load does not open a stale dialog',async()=>{const s=await launch({fail:true,closedDuringLoad:true});assert.equal(s.dialogs,0);});
test('Smoke test distinguishes success, network failure and another running instance',async()=>{
  assert.deepEqual((await launch({smoke:true})).exits,[0]);
  assert.deepEqual((await launch({smoke:true,fail:true})).exits,[1]);
  assert.deepEqual((await launch({smoke:true,lock:false})).exits,[2]);
});
