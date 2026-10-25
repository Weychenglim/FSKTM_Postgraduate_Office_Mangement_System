import {build} from '../../frontend/node_modules/esbuild/lib/main.js';
import {createServer} from 'node:http';
import {readFile,readdir,mkdtemp,rm,realpath,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const output=fileURLToPath(new URL('.',import.meta.url));
const frontend=fileURLToPath(new URL('../../frontend/',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'appointment-polish-'));
const bundle=join(directory,'preview.js');
await build({entryPoints:[join(output,process.env.POLISH_TOOLS==='1'?'officeToolsPreview.tsx':'preview.tsx')],outfile:bundle,bundle:true,format:'iife',platform:'browser',nodePaths:[join(frontend,'node_modules')],define:{'process.env.NODE_ENV':'"production"'},logLevel:'error'});
const css=(await readdir(join(frontend,'dist/assets'))).find(name=>name.startsWith('index-')&&name.endsWith('.css'));
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 if(path==='/preview.js'){res.setHeader('Content-Type','text/javascript');return res.end(await readFile(bundle));}
 if(path==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile(join(frontend,'dist/assets',css)));}
 res.setHeader('Content-Type','text/html');if(path!=='/frame')return res.end(`<!doctype html><html><body style="margin:0;background:#f8fafc;display:flex;justify-content:center"><iframe style="border:0;width:${Number(url.searchParams.get('width'))}px;height:1250px" src="/frame?role=${url.searchParams.get('role')}"></iframe><pre id="checks" hidden></pre><script>addEventListener('message',event=>{if(event.origin===location.origin&&event.data.type==='appointment-polish-checks')document.getElementById('checks').textContent=JSON.stringify(event.data)});</script></body></html>`);res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-slate-50"><div id="root"></div><pre id="checks" hidden></pre><script src="/preview.js"></script></body></html>');
});
let browser;
for(const path of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'])try{await access(path);browser=path;break;}catch{}
assert.ok(browser);
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const scenarios = process.env.POLISH_TOOLS==='1'
  ? ['tools-home','tools-semesters','tools-calendar','tools-calendar-entries','tools-calendar-history','tools-periods','tools-capacity','tools-reconciliation'].map(role=>[role,[1440,390,320]])
  : process.env.POLISH_PROFILE==='1'
  ? [['profile-office',[1440,390,320]],['profile-office-history',[1440,768,390,320]],['profile-student',[1440,320]]]
  : process.env.POLISH_RESEARCH==='1'
  ? [['research-approved',[1440,768,390,320]],['research-pending',[1440,390,320]],['research-historical',[1440,320]]]
  : process.env.POLISH_REVIEW==='1'
  ? [['office',[1440,768,390,320]],['office-panel',[1440,768,390,320]],['workload',[1440,768,390,320]],['student-supervisor',[1440,390,320]],['lecturer-unavailable',[1024,768,390,320]]]
  : ['office','lecturer','coordinator','student'].map(role=>[role,[1440,390,320]]);
 for(const [role,widths] of scenarios.filter(([role])=>!process.env.POLISH_ROLE||role===process.env.POLISH_ROLE))for(const width of widths){
  const {stdout}=await promisify(execFile)(browser,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check',`--user-data-dir=${join(directory,`${role}-${width}`)}`,`--window-size=${Math.max(550,width+50)},1300`,'--force-device-scale-factor=1','--dump-dom','--virtual-time-budget=4500',`--screenshot=${join(output,`${role}-${width}.png`)}`,`http://127.0.0.1:${server.address().port}/?role=${role}&width=${width}`],{windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
  const value=stdout.match(/<pre id="checks"[^>]*>(.*?)<\/pre>/)?.[1];assert.ok(value,stdout.slice(-2000));
  const result=JSON.parse(value.replaceAll('&quot;','"'));assert.equal(result.width,width);assert.equal(result.overflow,false,JSON.stringify(result));assert.deepEqual(result.clipped,[],JSON.stringify(result));assert.equal(result.unhiddenIcons,0);assert.ok(result.attentionIconTops.length===0||Math.max(...result.attentionIconTops)-Math.min(...result.attentionIconTops)<=1,`Misaligned attention icons: ${JSON.stringify(result)}`);if(role.startsWith('profile-'))assert.equal(result.profileHistoryOpen,role.endsWith('-history'));console.log(JSON.stringify(result));
 }
}finally{
 server.close();const resolved=await realpath(directory),within=relative(await realpath(tmpdir()),resolved);assert.ok(!isAbsolute(within)&&!within.startsWith('..')&&basename(resolved).startsWith('appointment-polish-'));await rm(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
