import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';
import tailwindcss from '@tailwindcss/vite';
import {access,mkdtemp,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

// Actual Office/Coordinator hosts, real CSS, isolated profiles and mocked read APIs only.
test('staff Panel assignment browsing and return context',{timeout:180000},async()=>{
  let executable;
  for(const browser of [process.env.CHROME_PATH,join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),
    join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe'),'/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean)) {
    try {await access(browser);executable=browser;break;}catch{}
  }
  assert.ok(executable,'Install Chrome/Edge or set CHROME_PATH');
  const directory=await mkdtemp(join(tmpdir(),'panel-assignments-browser-'));
  const server=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),logLevel:'error',
    server:{host:'127.0.0.1',port:0,hmr:false,watch:null},plugins:[{name:'panel-assignment-fixture',configureServer(vite){
      vite.middlewares.use((req,res,next)=>{
        const url=new URL(req.url,'http://localhost');if(url.pathname!=='/panel-assignment-test')return next();
        res.setHeader('Content-Type','text/html');
        if(url.searchParams.has('frame'))res.end('<!doctype html><html><head><link rel="stylesheet" href="/src/index.css"></head><body style="padding:16px"><div id="root"></div><script type="module" src="/tests/panelAssignments.fixture.tsx"></script></body></html>');
        else res.end(`<!doctype html><html><body style="margin:0;background:#e2e8f0;display:flex;justify-content:center"><iframe title="Panel assignment fixture" style="border:0;width:${Number(url.searchParams.get('width'))}px;height:1000px" src="/panel-assignment-test?frame"></iframe><pre id="test-results" style="display:none">RUNNING</pre><script>addEventListener('message',event=>{if(event.origin===location.origin&&event.data.type==='panel-assignment-results')document.getElementById('test-results').textContent=JSON.stringify(event.data)});</script></body></html>`);
      });
    }},tailwindcss()]});
  try {
    await server.listen();
    for(const width of [1280,390]) {
      const {stdout}=await promisify(execFile)(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
        `--user-data-dir=${join(directory,`profile-${width}`)}`,'--window-size=1400,1050','--dump-dom','--virtual-time-budget=60000',
        `--screenshot=${join(tmpdir(),`panel-assignments-${width}.png`)}`,`${server.resolvedUrls.local[0]}panel-assignment-test?width=${width}`],
        {timeout:75000,maxBuffer:2*1024*1024,windowsHide:true});
      const result=stdout.match(/<pre id="test-results"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
      assert.ok(result&&result!=='RUNNING',`Browser checks did not finish: ${stdout.slice(-1500)}`);
      const output=JSON.parse(result.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
      assert.equal(output.width,width);assert.equal(output.results.length,16);
      console.log(output.results.map(row=>`${row.error?'FAIL':'PASS'} ${width}px ${row.name}${row.error?`: ${row.error}`:''}`).join('\n'));
      assert.deepEqual(output.results.filter(row=>row.error),[]);
    }
  } finally {
    await server.close();const target=await realpath(directory),within=relative(await realpath(tmpdir()),target);
    assert.ok(!isAbsolute(within)&&!within.startsWith('..')&&basename(target).startsWith('panel-assignments-browser-'));
    await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
});
