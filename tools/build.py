from pathlib import Path
import json,re,zipfile,os
root=Path(__file__).resolve().parents[1]
out=root.parent/'game';out.mkdir(exist_ok=True)
sources={}
def visit(name):
    if name in sources:return
    source=(root/'src'/name).read_text()
    for dep in re.findall(r"from ['\"]\./([^'\"]+)['\"]",source):visit(dep)
    sources[name]=source
visit('app.js')
css='\n'.join((root/'src'/n).read_text() for n in ['base.css','lan.css','mobile.css'])
data=json.dumps(sources,ensure_ascii=False).replace('<','\\u003c')
loader='const sources='+data+r''';const urls={};for(const [name,source] of Object.entries(sources)){const code=source.replace(/(['"])\.\/([^'"]+)\1/g,(all,q,dep)=>urls[dep]?q+urls[dep]+q:all);urls[name]=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));}import(urls['app.js']).catch(e=>{document.querySelector('#ui').textContent='게임 실행 오류: '+e.message;});'''
html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>능력전선 0.7.1 베타 · 사운드와 앱 업데이트</title><style>'+css+'</style><body><canvas id="game"></canvas><div id="ui"></div><script type="module">'+loader+'</script></body></html>'
(root/'AbilityFront.html').write_text(html);(out/'AbilityFront.html').write_text(html)
with zipfile.ZipFile(out/'AbilityFront-LAN.zip','w',zipfile.ZIP_DEFLATED) as z:
    for folder,dirs,names in os.walk(root):
        # Keep GitHub Actions workflow files in the distributable source archive.
        # Other hidden runtime/tooling directories remain excluded.
        dirs[:]=sorted(d for d in dirs if (d == '.github' or not d.startswith('.')) and d not in ['node_modules','dist','runtime','__pycache__','build','DerivedData','desktop-game','mobile-web'])
        for name in sorted(names):
            p=Path(folder)/name;rel=p.relative_to(root)
            if name=='local.properties' or p.suffix in ['.jks','.keystore','.p12','.pem','.mobileprovision'] or name.startswith('.') and name!='.gitignore':continue
            z.write(p,'AbilityFront-LAN/'+str(rel))
print('Built',len(sources),'modules;', (out/'AbilityFront-LAN.zip').stat().st_size,'bytes')
