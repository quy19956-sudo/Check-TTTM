(function(g){
  const App=g.App=g.App||{};
  App.excelReady=new Promise((resolve,reject)=>{
    if(g.XLSX)return resolve(g.XLSX);
    const script=document.createElement('script');
    const timer=setTimeout(()=>{script.remove();reject(new Error('Tải thư viện Excel quá 12 giây.'));},12000);
    script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload=()=>{clearTimeout(timer);g.XLSX?resolve(g.XLSX):reject(new Error('Thư viện Excel không hợp lệ.'));};
    script.onerror=()=>{clearTimeout(timer);reject(new Error('Không tải được thư viện Excel.'));};
    document.head.appendChild(script);
  });
  App.excelReady.catch(()=>{});
})(globalThis);
