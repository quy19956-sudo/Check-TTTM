// Optional browser integration test. Requires Playwright in the primary runtime.
// Run: node ui_test.cjs SOURCE.xlsx /path/to/xlsx.full.min.js
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||__dirname]}));
const source=process.argv[2],xlsxPath=process.argv[3];
if(!source||!xlsxPath)throw new Error('Cần SOURCE.xlsx và đường dẫn thư viện SheetJS dùng cho kiểm thử.');
const root=__dirname,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  const name=route==='/'?'index.html':route.slice(1);
  if(name.includes('..')){res.writeHead(404);return res.end();}
  try{const data=fs.readFileSync(path.join(root,name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.TTTM_CHROME_PATH?{executablePath:process.env.TTTM_CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({acceptDownloads:true});
    // Read-only fixtures isolate UI verification from the live repository.
    await context.route('https://api.github.com/**',async route=>{
      const name=new URL(route.request().url()).pathname.split('/').pop();
      assert(['staff.json','rules.json'].includes(name));
      assert.equal(route.request().method(),'GET');
      const content=fs.readFileSync(path.join(root,name)).toString('base64');
      await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({type:'file',content})});
    });
    await context.route('https://cdn.sheetjs.com/**',route=>route.fulfill({status:200,contentType:'text/javascript',path:xlsxPath}));
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>document.getElementById('rulesCountHome').textContent==='44');
    await page.setInputFiles('#workFile',path.resolve(source));
    await page.click('#runButton');
    await page.waitForSelector('#page-result.active',{timeout:180000});
    assert.equal(await page.locator('#sumRecords').textContent(),'46400');
    assert.equal(await page.locator('#sumErrors').textContent(),'25');
    assert.equal(await page.locator('#sumWarnings').textContent(),'10');
    await page.locator('input[aria-label="Lọc dòng nguồn"]').fill('17469');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#issueTableBody tr').count(),2);
    assert((await page.locator('#issueTableBody').innerText()).includes('0811 Trần Đức cửng'));
    await page.click('#clearFilters');
    await page.locator('input[aria-label="Lọc dòng nguồn"]').fill('17468');
    await page.waitForTimeout(150);
    assert(!(await page.locator('#issueTableBody').innerText()).includes('Khoa không thống nhất'));
    assert(!(await page.locator('#issueTableBody').innerText()).includes('rptDspttt!17468'));
    await page.click('#clearFilters');
    await page.locator('input[aria-label="Lọc loại"]').fill('Trùng thời gian nhân viên');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#issueTableBody tr').count(),10);
    const downloadPromise=page.waitForEvent('download');
    await page.click('#downloadReport');
    const download=await downloadPromise;
    assert((await download.suggestedFilename()).endsWith('.xlsx'));
    assert.equal(await download.failure(),null);
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(100);
    assert(await page.locator('#downloadReport').isVisible());
    assert.deepEqual(errors,[]);
    console.log('UI: worker read 46,400 rows; 25 errors, 10 warnings; overlap, name-error and no-false-department-warning filters and Excel download passed. Mobile controls visible.');
    await context.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{server.close();console.error(e);process.exitCode=1;});
