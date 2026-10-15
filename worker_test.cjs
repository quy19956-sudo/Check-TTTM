// Integration test of the actual worker and client scripts using a Node VM.
// Run: node worker_test.cjs SOURCE.xlsx /path/to/xlsx.full.min.js
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
require('./app.js');
const [source,xlsxPath]=process.argv.slice(2);
if(!source||!xlsxPath)throw new Error('Cần SOURCE.xlsx và đường dẫn thư viện SheetJS.');
const bytes=fs.readFileSync(source);
const file={name:path.basename(source),size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
let terminated=0,progress=0;
class LocalWorker{
  constructor(url){
    assert.equal(url.pathname,'/excel-worker.js');assert.equal(url.search,'?v=54');
    const host=this;
    const context=vm.createContext({setTimeout,clearTimeout,console});
    context.self=context;
    context.importScripts=(...urls)=>{for(const url of urls){const script=url.startsWith('https://cdn.sheetjs.com/')?xlsxPath:path.join(__dirname,url.split('?')[0]);vm.runInContext(fs.readFileSync(script,'utf8'),context,{filename:url});}};
    context.postMessage=data=>{if(!host.stopped&&host.onmessage)host.onmessage({data:structuredClone(data)});};
    vm.runInContext(fs.readFileSync(path.join(__dirname,'excel-worker.js'),'utf8'),context,{filename:'excel-worker.js'});
    this.context=context;
  }
  postMessage(data){
    // A browser's structured clone creates buffers in the worker's realm.
    Promise.resolve().then(async()=>{
      this.context.transferBytes=new Uint8Array(await data.file.arrayBuffer());
      const buffer=vm.runInContext('Uint8Array.from(transferBytes).buffer',this.context);
      delete this.context.transferBytes;
      const payload={...data,file:{name:data.file.name,size:data.file.size,arrayBuffer:async()=>buffer}};
      await this.context.onmessage({data:payload});
    }).catch(error=>{if(this.onerror)this.onerror({preventDefault(){},message:error.message});});
  }
  terminate(){this.stopped=true;terminated++;}
}
const client=vm.createContext({URL,Worker:LocalWorker,App:{},document:{currentScript:{src:'https://test.local/worker-client.js'}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'worker-client.js'),'utf8'),client,{filename:'worker-client.js'});
(async()=>{
  const pending=client.App.runExcelTask('check',{file,staffData:App.DEFAULT_STAFF,rulesData:App.DEFAULT_RULES},()=>progress++);
  await assert.rejects(client.App.runExcelTask('rules',{file}),/Đang xử lý/);
  const result=await pending;
  assert.equal(result.summary.total_records,46400);
  assert.equal(result.summary.error_count,25);
  assert.equal(result.summary.warning_count,10);
  assert.equal(result.summary.overlap_group_count,5);
  assert.equal(result.summary.overlap_complete,true);
  for(const row of [17466,17467,17469])assert(result.issues.some(i=>i.source_row==='rptDspttt!'+row));
  assert(!result.issues.some(i=>i.source_row==='rptDspttt!17468'));
  assert(!result.issues.some(i=>i.type==='Khoa không thống nhất'));
  assert.equal(terminated,1);assert(progress>1);
  console.log('Worker/client integration passed: actual Excel reader, 46,400 records, 35 issues, overlaps, staff mismatch and no warning for ordering-department differences, progress messages, single-job guard, result and termination.');
})().catch(error=>{console.error(error);process.exitCode=1;});
