const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('abilityApp',{
 startInternetHost:()=>ipcRenderer.invoke('internet:start'),
 getUpdate:()=>ipcRenderer.invoke('update:status'),
 installUpdate:()=>ipcRenderer.invoke('update:install'),
 onUpdate:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('update:status',listener);return ()=>ipcRenderer.removeListener('update:status',listener);}
});
