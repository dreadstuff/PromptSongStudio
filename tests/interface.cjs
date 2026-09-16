// Real-browser regression checks for the public build. CI supplies pinned Playwright.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve('dist-pages');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(4185,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4185/');
  await page.getByRole('button',{name:/^Play track 1:/}).waitFor();
  assert.equal(await page.locator('#track-editor').count(),0);
  assert.equal(await page.locator('#generation-settings').count(),0);
  await page.getByRole('button',{name:'Create 3 tracks',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.take-card').length===3);
  const cards=page.locator('.take-card');
  assert.equal(await page.locator('.score-section').count(),5);
  assert.ok((await page.locator('.score-progress').innerText()).includes('Release'));
  await cards.nth(0).getByRole('button',{name:/^Play track/}).click();
  await cards.nth(0).getByRole('button',{name:/^Stop track/}).waitFor();
  await cards.nth(1).getByRole('button',{name:/^Play track/}).click();
  await cards.nth(1).getByRole('button',{name:/^Stop track/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/^Stop track/}).count(),1);
  assert.ok((await cards.nth(1).getAttribute('class')).includes('selected'));
  await page.getByRole('button',{name:'Stop playback',exact:true}).click();
  await cards.nth(1).getByRole('button',{name:/^Play track/}).waitFor();
  await cards.nth(0).getByRole('button',{name:'Customize track 1',exact:true}).click();
  await page.getByRole('textbox',{name:'Song title',exact:true}).fill('Saved edit while comparing');
  await page.getByRole('combobox',{name:'Pattern bar',exact:true}).click();
  await page.getByRole('option',{name:'Bar 12 · Peak',exact:true}).click();
  assert.ok((await page.locator('.phrase-controls').innerText()).includes('bar 12 · Peak'));
  const note=page.getByRole('button',{name:/^Melody step 1:/}),before=await note.getAttribute('aria-label');
  await note.click();assert.notEqual(await note.getAttribute('aria-label'),before);
  await cards.nth(1).getByRole('button',{name:/^Play track/}).click();
  await cards.nth(0).getByRole('button',{name:/^Play track/}).click();
  assert.equal(await page.getByRole('textbox',{name:'Song title',exact:true}).inputValue(),'Saved edit while comparing');
  await page.getByRole('button',{name:'Stop playback',exact:true}).click();
  await page.getByRole('switch',{name:'Studio mode',exact:true}).click();
  assert.equal(await page.locator('#generation-settings').count(),1);
  assert.equal(await page.locator('#track-editor').count(),1);
  await page.getByRole('switch',{name:'Studio mode',exact:true}).click();
  await page.getByRole('button',{name:/Customize this track/}).click();
  assert.equal(await page.locator('#track-editor').count(),0);
  assert.equal(await page.locator('#generation-settings').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page must not overflow horizontally');
  await cards.nth(2).getByRole('button',{name:/^Play track/}).click();
  await cards.nth(2).getByRole('button',{name:/^Stop track/}).waitFor();
  await cards.nth(2).getByRole('button',{name:/^Stop track/}).click();
  // Related generations retain the favorite alongside new takes.
  await cards.nth(0).getByRole('button',{name:'More like track 1',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.take-card').length===4);
  assert.ok((await cards.nth(0).innerText()).includes('Saved edit while comparing'));
  await page.waitForFunction(()=>{
    const data=JSON.parse(localStorage.getItem('pss:recent:v1')||'null');
    return data?.batches.find(b=>b.id===data.activeId)?.takes.length===4;
  });
  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('.take-card').length===4);
  await page.getByRole('button',{name:'Create 3 tracks',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.take-card').length===3);
  await page.getByRole('button',{name:/^Recent \(/}).click();
  await page.getByRole('dialog').getByRole('button').filter({hasText:'More like:'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.take-card').length===4);
  assert.ok((await cards.nth(0).innerText()).includes('Saved edit while comparing'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Customize track 1',exact:true}).click();
  await page.getByRole('combobox',{name:'Song length',exact:true}).click();
  await page.getByRole('option',{name:'32 bars',exact:true}).click();
  assert.equal(await page.locator('.score-section small').allTextContents().then(a=>a.reduce((n,x)=>n+parseInt(x),0)),32);
  // Render native Web Audio to a WAV file, not just a mock audio graph.
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download WAV',exact:true}).click();
  const download=await downloadPromise;const wav=fs.readFileSync(await download.path());
  assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.readUInt16LE(22),2);assert.ok(wav.length>1000000);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: default simplicity, direct playback, switching, bottom-player sync, edit retention, Studio mode, desktop/mobile fit.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
