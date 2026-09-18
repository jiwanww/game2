const config=require('./release-config.json');
const feed=config.updateUrl?{provider:'generic',url:config.updateUrl,channel:'beta'}:null;
module.exports={
 appId:config.appId,productName:'Ability Front',asar:true,directories:{output:'dist/windows'},
 files:['apps/desktop/**','apps/release-config.json','package.json'],
 extraResources:[{from:'apps/desktop-game',to:'game'}],
 win:{target:['nsis'],...(config.publisherName?{publisherName:config.publisherName}:{signAndEditExecutable:false})},
 nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,deleteAppDataOnUninstall:false},
 artifactName:'AbilityFront-Setup-${version}-${arch}.${ext}',
 ...(feed?{publish:[feed]}:{}),
 afterPack:async context=>{if(config.updateUrl&&!config.updateUrl.startsWith('https://'))throw Error('updateUrl must use HTTPS');}
};
