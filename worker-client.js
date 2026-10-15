(function(g){
  'use strict';
  const App=g.App=g.App||{};
  const base=document.currentScript?document.currentScript.src:g.location.href;
  let activeJob=null;
  App.runExcelTask=function(task,payload,onProgress){
    if(activeJob)return Promise.reject(new Error('Đang xử lý một tệp Excel. Hãy chờ hoàn tất trước khi chọn thao tác khác.'));
    if(typeof Worker==='undefined')return Promise.reject(new Error('Trình duyệt chưa hỗ trợ xử lý Excel trong luồng nền. Hãy dùng Chrome hoặc Edge mới.'));
    return new Promise((resolve,reject)=>{
      let worker,timer,settled=false;
      const finish=(error,result)=>{
        if(settled)return;settled=true;
        clearTimeout(timer);if(worker)worker.terminate();activeJob=null;
        error?reject(error):resolve(result);
      };
      try{worker=new Worker(new URL('excel-worker.js?v=50',base));}
      catch(_e){finish(new Error('Không mở được luồng xử lý Excel. Mở trang bằng địa chỉ GitHub Pages (HTTPS), rồi tải lại.'));return;}
      activeJob={cancel:()=>finish(new Error('Đã dừng xử lý theo yêu cầu. Danh sách và danh mục hiện tại được giữ nguyên.'))};
      timer=setTimeout(()=>finish(new Error('Xử lý Excel quá 3 phút. Hãy kiểm tra tệp nguồn rồi thử lại.')),180000);
      worker.onmessage=e=>{
        if(settled)return;
        const msg=e.data||{};
        if(msg.type==='progress'){if(onProgress)onProgress(msg.message);return;}
        if(msg.type==='result')finish(null,msg.result);
        else if(msg.type==='error')finish(new Error(msg.message||'Không đọc được Excel.'));
      };
      worker.onerror=e=>{e.preventDefault();finish(new Error('Luồng xử lý Excel gặp lỗi. Kiểm tra tệp excel-worker.js đã được tải lên cùng app.js và kết nối Internet.'));};
      worker.onmessageerror=()=>finish(new Error('Không nhận được kết quả từ luồng xử lý Excel.'));
      try{worker.postMessage({task,...payload});}catch(_e){finish(new Error('Không gửi được tệp sang luồng xử lý. Hãy chọn lại tệp Excel.'));}
    });
  };
  App.cancelExcelTask=function(){if(activeJob)activeJob.cancel();};
})(globalThis);
