(function(global){
  'use strict';
  const App=global.App=global.App||{};
  const STAFF_KEY='kt_ttm_staff_v44_web';
  const RULES_KEY='kt_ttm_rules_v44_web';
  let staffData=null,rulesData=null,currentResult=null;

  const $=id=>document.getElementById(id);
  function clone(obj){return JSON.parse(JSON.stringify(obj));}
  function getStored(key,fallback){
    try{const raw=localStorage.getItem(key);if(raw){const data=JSON.parse(raw);if(data&&Array.isArray(data.items))return data;}}catch(_e){}
    return clone(fallback);
  }
  function saveStored(key,data){
    try{localStorage.setItem(key,JSON.stringify(data));}
    catch(e){throw new Error('Không lưu được dữ liệu vào trình duyệt. Có thể bộ nhớ website đã đầy: '+e.message);}
  }
  function showMessage(text,type){
    const box=$('messageArea'); if(!box)return; box.innerHTML=''; const div=document.createElement('div');div.className='msg '+(type||'info');div.textContent=text;box.appendChild(div);window.scrollTo({top:0,behavior:'smooth'});
  }
  function clearMessage(){const box=$('messageArea');if(box)box.innerHTML='';}
  function setLoading(form,on){if(!form)return;form.classList.toggle('loading',!!on);for(const el of form.querySelectorAll('button,input'))el.disabled=!!on;}
  function validExcelName(name){return /\.(xlsx|xls)$/i.test(name||'');}
  function onlineEnabled(){return !!(App.OnlineStore&&App.OnlineStore.enabled&&App.OnlineStore.enabled());}
  function askGithubToken(action){
    let token=App.OnlineStore&&App.OnlineStore.getToken?App.OnlineStore.getToken():'';
    if(token)return token;
    token=global.prompt(
      `Để ${action} và commit vào GitHub, hãy dán Fine-grained Personal Access Token có quyền Contents: Read and write cho repo ${App.OnlineStore.repo}.\n\nToken chỉ được giữ trong PHIÊN trình duyệt này, không ghi vào GitHub.`
    );
    if(token===null)throw new Error('Đã hủy thao tác.');
    token=String(token).trim();
    if(!token)throw new Error('GitHub token không được để trống.');
    App.OnlineStore.setToken(token);
    return token;
  }
  async function loadOnlineData(showNotice=true){
    if(!onlineEnabled())return false;
    const remote=await App.OnlineStore.loadAll();
    if(remote.staff&&Array.isArray(remote.staff.items)){staffData=remote.staff;saveStored(STAFF_KEY,staffData);}
    if(remote.rules&&Array.isArray(remote.rules.items)){rulesData=remote.rules;saveStored(RULES_KEY,rulesData);}
    refreshAll();
    if(showNotice){
      const a=remote.staff&&Array.isArray(remote.staff.items)?`${remote.staff.items.length} nhân viên`:'chưa có danh sách online';
      const b=remote.rules&&Array.isArray(remote.rules.items)?`${remote.rules.items.length} thủ thuật`:'chưa có danh mục online';
      showMessage(`Đã tải dữ liệu từ GitHub (${App.OnlineStore.repo}): ${a}; ${b}.`,'success');
    }
    return true;
  }

  function showPage(name){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); const page=$('page-'+name);if(page)page.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===name)); clearMessage(); window.scrollTo({top:0,behavior:'smooth'});
  }

  function refreshHome(){
    $('staffCountHome').textContent=staffData.items.length;$('staffSourceHome').textContent=staffData.source_file||'mặc định';$('staffUpdatedHome').textContent=staffData.updated_at||'chưa có';
    $('rulesCountHome').textContent=rulesData.items.length;$('rulesSourceHome').textContent=rulesData.source_file||'mặc định';$('rulesUpdatedHome').textContent=rulesData.updated_at||'chưa có';
  }
  function refreshStaff(){
    $('staffSource').textContent=staffData.source_file||'mặc định';$('staffUpdated').textContent=staffData.updated_at||'chưa có';$('staffCount').textContent=staffData.items.length;
    const body=$('staffTableBody');body.innerHTML='';staffData.items.slice(0,200).forEach((item,i)=>{const tr=document.createElement('tr');[i+1,item.name||'',item.title||'',item.code||''].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  }
  function refreshRules(){
    $('rulesSource').textContent=rulesData.source_file||'mặc định';$('rulesUpdated').textContent=rulesData.updated_at||'chưa có';$('rulesCount').textContent=rulesData.items.length;
    const body=$('rulesTableBody');body.innerHTML='';rulesData.items.slice(0,200).forEach((item,i)=>{const tr=document.createElement('tr');const vals=[i+1,item.mapt||'',item.tenpt||'',item.min_people??0,item.time_rule||'',(item.required_roles||[]).map(x=>x.label||x.field).join(', ')];vals.forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});body.appendChild(tr);});
  }
  function refreshAll(){refreshHome();refreshStaff();refreshRules();}

  function renderResult(result){
    currentResult=result; const s=result.summary||{};
    $('sumRecords').textContent=s.total_records||0;$('sumErrors').textContent=s.error_count||0;$('sumWarnings').textContent=s.warning_count||0;$('sumIssues').textContent=s.total_issues||0;
    $('resultMeta').textContent=`File: ${result.uploaded_name} · ${result.source_note} · Thời điểm: ${result.checked_at}`;
    $('reportMeta').innerHTML=`<b>File:</b> ${App.escapeHtml(result.uploaded_name)}<br><b>Nguồn đọc:</b> ${App.escapeHtml(result.source_note)}<br>${result.date_fix_note?`<b>Ngày tháng Excel:</b> ${App.escapeHtml(result.date_fix_note)}<br>`:''}<b>Thời điểm kiểm tra:</b> ${App.escapeHtml(result.checked_at)}`;
    const chips=$('issueChips');chips.innerHTML='';const counts=s.issue_counts||{};const entries=Object.entries(counts);$('issueSummaryTitle').style.display=entries.length?'':'none';chips.style.display=entries.length?'flex':'none';entries.forEach(([k,v])=>{const span=document.createElement('span');span.className='chip';span.textContent=`${k}: ${v}`;chips.appendChild(span);});
    const body=$('issueTableBody');body.innerHTML='';
    if(!(result.issues||[]).length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=12;td.className='ok';td.textContent='Không phát hiện lỗi/cảnh báo theo danh sách và danh mục hiện tại.';tr.appendChild(td);body.appendChild(tr);}else{
      result.issues.forEach((item,i)=>{const tr=document.createElement('tr');tr.className=item.level==='Lỗi'?'tr-error':'tr-warn';if(item.overlap_group){tr.classList.add('overlap-group');tr.dataset.overlapGroup=item.overlap_group;tr.style.setProperty('--overlap-bg',item.overlap_color||'#e0f2fe');}
        const vals=[i+1,item.level,item.type,item.source_row,item.mabn,item.patient_name,item.tenpt,item.primary_surgeon,item.start,item.end,item.detail,item.suggestion];vals.forEach(v=>{const td=document.createElement('td');td.textContent=v??'';tr.appendChild(td);});body.appendChild(tr);});
    }
    clearFilters(); setTimeout(updateScrollLimit,0); showPage('result');
  }

  function normalizeFilter(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');}
  function issueRows(){return Array.from($('issueTable').querySelectorAll('tbody tr')).filter(r=>!r.querySelector('.ok'));}
  function applyFilters(){
    const controls=$('issueTable').querySelectorAll('.filter-row input,.filter-row select');const rows=issueRows();let shown=0;
    rows.forEach(row=>{let ok=true;for(const ctl of controls){const val=normalizeFilter(ctl.value);if(!val)continue;const col=Number(ctl.dataset.col),cell=normalizeFilter((row.cells[col]||{}).textContent);if(!cell.includes(val)){ok=false;break;}}row.style.display=ok?'':'none';if(ok)shown++;});
    $('filterCount').textContent=rows.length?`Hiển thị ${shown}/${rows.length} dòng`:'';updateScrollLimit();
  }
  function clearFilters(){const table=$('issueTable');if(!table)return;table.querySelectorAll('.filter-row input,.filter-row select').forEach(el=>el.value='');issueRows().forEach(r=>r.style.display='');$('filterCount').textContent='';updateScrollLimit();}
  function updateScrollLimit(){
    const table=$('issueTable'),wrap=table&&table.closest('.issue-scroll-wrap');if(!table||!wrap)return;const rows=issueRows().filter(r=>r.style.display!=='none'),limit=parseInt(wrap.dataset.visibleRows||'8',10);if(rows.length<=limit){wrap.style.maxHeight='none';return;}const header=table.tHead?Array.from(table.tHead.rows).reduce((n,r)=>n+r.getBoundingClientRect().height,0):0;const body=rows.slice(0,limit).reduce((n,r)=>n+r.getBoundingClientRect().height,0);wrap.style.maxHeight=Math.ceil(header+body+4)+'px';wrap.style.overflowY='auto';
  }

  function reportFilename(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `BaoCao_KiemTraThuThuat_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.xlsx`;}
  function downloadReport(){
    if(!currentResult)return;if(!global.XLSX){showMessage('Không tải được thư viện Excel nên chưa thể xuất báo cáo.','error');return;}
    const r=currentResult,s=r.summary||{};const wb=global.XLSX.utils.book_new();
    const overview=[['Chỉ số','Giá trị'],['Tổng số dòng đọc được',s.total_records||0],['Tổng số vấn đề',s.total_issues||0],['Số lỗi',s.error_count||0],['Số cảnh báo',s.warning_count||0],['Số nhân viên Nội Tim Mạch/DSA',s.staff_count||0],['Số thủ thuật trong danh mục',s.rules_count||0],['Ghi chú ngày tháng Excel',r.date_fix_note||''],['Phạm vi kiểm tra',r.scope_note||''],[],['Loại vấn đề','Số lượng']];Object.entries(s.issue_counts||{}).sort((a,b)=>a[0].localeCompare(b[0],'vi')).forEach(x=>overview.push(x));
    const ws1=global.XLSX.utils.aoa_to_sheet(overview);ws1['!cols']=[{wch:42},{wch:80}];global.XLSX.utils.book_append_sheet(wb,ws1,'Tong_quan');
    const headers=['Mức','Loại','Nhóm trùng giờ','Dòng nguồn','STT','Mã BN','Họ tên BN','Tên thủ thuật','PT-TT chính','Bắt đầu','Kết thúc','Chi tiết','Gợi ý'];const rows=[headers];(r.issues||[]).forEach(i=>rows.push([i.level,i.type,i.overlap_group||'',i.source_row,i.stt,i.mabn,i.patient_name,i.tenpt,i.primary_surgeon||'',i.start,i.end,i.detail,i.suggestion]));const ws2=global.XLSX.utils.aoa_to_sheet(rows);ws2['!cols']=[10,25,12,18,8,13,22,42,25,18,18,70,55].map(w=>({wch:w}));if(r.issues&&r.issues.length)ws2['!autofilter']={ref:`A1:M${r.issues.length+1}`};global.XLSX.utils.book_append_sheet(wb,ws2,'Loi_CanhBao');
    const h3=['Dòng nguồn','Mã BN','Họ tên BN','Năm sinh','Mã PT','Tên thủ thuật','Khoa chỉ định','TENPMO','Loại','Bắt đầu','Kết thúc','Phút','Mã PT-TT chính','PT-TT chính','Mã Phụ 1','Phụ 1','Mã Phụ 2','Phụ 2','Mã Phụ 3','Phụ 3','Mã GM chính','GM chính','Mã GM phụ','GM phụ','Mã Dụng cụ phụ','Dụng cụ phụ','Mã Giúp việc','Giúp việc'];const data=[h3];
    const rolePair=(rec,field)=>{const v=(rec.roles||{})[field]||{};return [v&&typeof v==='object'?(v.code||''):'',v&&typeof v==='object'?(v.name||''):v||''];};
    (r.records||[]).forEach(rec=>{const row=[rec.source_row,rec.mabn,rec.patient_name,rec.birth_year,rec.mapt,rec.tenpt,rec.khoa,rec.tenpmo||'',rec.loai,rec.start,rec.end,rec.duration_minutes];['HOTEN1','HOTEN2','HOTEN22','HOTEN3','HOTEN4','HT6','HOTEN5','HOTEN6'].forEach(f=>row.push(...rolePair(rec,f)));data.push(row);});
    const ws3=global.XLSX.utils.aoa_to_sheet(data);ws3['!cols']=[18,13,22,10,13,45,25,25,12,18,18,10,...Array(8).fill(0).flatMap(()=>[14,24])].map(w=>({wch:w}));if(r.records&&r.records.length)ws3['!autofilter']={ref:`A1:AB${r.records.length+1}`};global.XLSX.utils.book_append_sheet(wb,ws3,'Du_lieu_doc_duoc');
    global.XLSX.writeFile(wb,reportFilename(),{compression:true});
  }

  async function onWorkSubmit(e){
    e.preventDefault();const form=e.currentTarget,file=$('workFile').files[0];if(!file)return showMessage('Bạn chưa chọn file làm việc.','error');if(!validExcelName(file.name))return showMessage('Bản web này hỗ trợ file .xlsx hoặc .xls.','error');setLoading(form,true);showMessage('Đang đọc và kiểm tra file Excel trên thiết bị…','info');
    try{await new Promise(r=>setTimeout(r,30));const fix=$('fixDayMonthSwap').checked;const parsed=await App.loadWorkingExcel(file,fix);if(!parsed.records.length)throw new Error('Không tìm thấy dữ liệu thủ thuật phù hợp trong file Excel.');const result=App.runChecks(parsed.records,staffData,rulesData);const dateNote=fix?'đã sửa ngày-tháng 01-12':'không sửa ngày-tháng';result.uploaded_name=file.name;result.source_note=`Excel sheet: ${parsed.sheet}, đọc ${parsed.records.length} dòng, ${dateNote}`;result.date_fix_note=dateNote;result.checked_at=App.nowText();result.scope_note='Excel: kiểm tra Mã NV + Họ tên, TENPMO, danh mục, số người/vị trí, thời gian, trùng thủ thuật và trùng giờ.';renderResult(result);}catch(err){showMessage('Không xử lý được file: '+(err&&err.message?err.message:String(err)),'error');}finally{setLoading(form,false);}
  }

  async function onStaffSubmit(e){
    e.preventDefault();const form=e.currentTarget,file=$('staffFile').files[0];if(!file)return showMessage('Bạn chưa chọn file danh sách.','error');if(!validExcelName(file.name))return showMessage('Danh sách phải là file .xlsx hoặc .xls.','error');setLoading(form,true);showMessage('Đang đọc danh sách nhân viên…','info');
    try{
      const parsed=await App.loadStaffExcel(file);if(!parsed.items.length)throw new Error('File không giống danh sách nhân viên. Nên dùng 3 cột STT, Mã NV, Họ và tên; không chọn file thủ thuật HIS.');
      const candidate={source_file:file.name,updated_at:App.nowText(),items:parsed.items};
      if(onlineEnabled()){
        const pin=askGithubToken('lưu danh sách nhân viên');
        showMessage('Đang commit danh sách lên GitHub…','info');
        const result=await App.OnlineStore.saveStaff(candidate,pin);
        staffData=result.data&&Array.isArray(result.data.items)?result.data:candidate;
        saveStored(STAFF_KEY,staffData);refreshAll();
        showMessage(`Đã commit ${parsed.items.length} nhân viên lên GitHub từ sheet ${parsed.sheet}. Thiết bị khác chỉ cần tải lại trang để dùng danh sách mới.`,'success');
      }else{
        staffData=candidate;saveStored(STAFF_KEY,staffData);refreshAll();
        showMessage(`Đã cập nhật ${parsed.items.length} nhân viên nhưng CHỈ LƯU TRÊN THIẾT BỊ NÀY vì chưa cấu hình GitHub trong config.js.`,'error');
      }
      form.reset();
    }catch(err){showMessage('Không cập nhật được danh sách: '+(err.message||err),'error');}finally{setLoading(form,false);}
  }

  async function onRulesSubmit(e){
    e.preventDefault();const form=e.currentTarget,file=$('rulesFile').files[0];if(!file)return showMessage('Bạn chưa chọn file danh mục.','error');if(!validExcelName(file.name))return showMessage('Danh mục phải là file .xlsx hoặc .xls.','error');setLoading(form,true);showMessage('Đang đọc danh mục thủ thuật…','info');
    try{
      const parsed=await App.loadRulesExcel(file);if(!parsed.items.length)throw new Error('Không tìm thấy cột TENPT/danh mục phù hợp trong file.');
      const candidate={source_file:file.name,updated_at:App.nowText(),items:parsed.items};
      if(onlineEnabled()){
        const pin=askGithubToken('lưu danh mục thủ thuật');
        showMessage('Đang commit danh mục lên GitHub…','info');
        const result=await App.OnlineStore.saveRules(candidate,pin);
        rulesData=result.data&&Array.isArray(result.data.items)?result.data:candidate;
        saveStored(RULES_KEY,rulesData);refreshAll();
        showMessage(`Đã commit ${parsed.items.length} thủ thuật lên GitHub từ sheet ${parsed.sheet}. Thiết bị khác chỉ cần tải lại trang để dùng danh mục mới.`,'success');
      }else{
        rulesData=candidate;saveStored(RULES_KEY,rulesData);refreshAll();
        showMessage(`Đã cập nhật ${parsed.items.length} thủ thuật nhưng CHỈ LƯU TRÊN THIẾT BỊ NÀY vì chưa cấu hình GitHub trong config.js.`,'error');
      }
      form.reset();
    }catch(err){showMessage('Không cập nhật được danh mục: '+(err.message||err),'error');}finally{setLoading(form,false);}
  }

  async function resetStaffData(){
    try{
      if(!global.confirm('Khôi phục danh sách nhân viên mặc định?'))return;
      const data=clone(App.DEFAULT_STAFF);data.updated_at=App.nowText();data.source_file='Danh sách mặc định';
      if(onlineEnabled()){const pin=askGithubToken('khôi phục danh sách mặc định');const r=await App.OnlineStore.saveStaff(data,pin);staffData=r.data||data;saveStored(STAFF_KEY,staffData);refreshAll();showMessage('Đã khôi phục và commit danh sách mặc định lên GitHub.','success');}
      else{localStorage.removeItem(STAFF_KEY);staffData=data;saveStored(STAFF_KEY,staffData);refreshAll();showMessage('Đã khôi phục mặc định nhưng chỉ lưu trên thiết bị này vì chưa cấu hình online.','error');}
    }catch(err){showMessage('Không khôi phục được danh sách: '+(err.message||err),'error');}
  }
  async function resetRulesData(){
    try{
      if(!global.confirm('Khôi phục danh mục thủ thuật mặc định?'))return;
      const data=clone(App.DEFAULT_RULES);data.updated_at=App.nowText();data.source_file='Danh mục mặc định';
      if(onlineEnabled()){const pin=askGithubToken('khôi phục danh mục mặc định');const r=await App.OnlineStore.saveRules(data,pin);rulesData=r.data||data;saveStored(RULES_KEY,rulesData);refreshAll();showMessage('Đã khôi phục và commit danh mục mặc định lên GitHub.','success');}
      else{localStorage.removeItem(RULES_KEY);rulesData=data;saveStored(RULES_KEY,rulesData);refreshAll();showMessage('Đã khôi phục mặc định nhưng chỉ lưu trên thiết bị này vì chưa cấu hình online.','error');}
    }catch(err){showMessage('Không khôi phục được danh mục: '+(err.message||err),'error');}
  }

  async function init(){
    staffData=getStored(STAFF_KEY,App.DEFAULT_STAFF);rulesData=getStored(RULES_KEY,App.DEFAULT_RULES);refreshAll();
    document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.goto)));
    $('workForm').addEventListener('submit',onWorkSubmit);$('staffForm').addEventListener('submit',onStaffSubmit);$('rulesForm').addEventListener('submit',onRulesSubmit);
    $('resetStaff').addEventListener('click',resetStaffData);$('resetRules').addEventListener('click',resetRulesData);
    if($('reloadOnline'))$('reloadOnline').addEventListener('click',async()=>{try{showMessage('Đang tải lại dữ liệu từ GitHub…','info');await loadOnlineData(true);}catch(err){showMessage('Không tải được dữ liệu từ GitHub: '+(err.message||err),'error');}});
    $('printResult').addEventListener('click',()=>window.print());$('downloadReport').addEventListener('click',downloadReport);$('clearFilters').addEventListener('click',clearFilters);$('issueTable').querySelectorAll('.filter-row input,.filter-row select').forEach(el=>el.addEventListener('input',applyFilters));window.addEventListener('resize',updateScrollLimit);
    if(!global.XLSX){showMessage('Không tải được thư viện Excel từ CDN. Hãy kiểm tra kết nối Internet và tải lại trang.','error');return;}
    if($('forgetGithubToken'))$('forgetGithubToken').addEventListener('click',()=>{if(App.OnlineStore&&App.OnlineStore.clearToken)App.OnlineStore.clearToken();showMessage('Đã xóa GitHub token khỏi phiên trình duyệt này.','success');});
    if($('testGithubToken'))$('testGithubToken').addEventListener('click',async()=>{try{const token=askGithubToken('kiểm tra quyền ghi');showMessage('Đang kiểm tra quyền GitHub…','info');const r=await App.OnlineStore.checkWriteAccess(token);showMessage(`Token truy cập được repo ${r.repo}. Khi cập nhật danh sách/danh mục, dữ liệu sẽ được commit lên nhánh ${App.OnlineStore.branch}.`,'success');}catch(err){showMessage('Không kiểm tra được quyền GitHub: '+(err.message||err),'error');}});
    if(onlineEnabled()){
      try{showMessage('Đang tải danh sách và danh mục từ GitHub…','info');await loadOnlineData(false);showMessage(`Đã kết nối dữ liệu GitHub ${App.OnlineStore.repo}. Danh sách/danh mục sẽ dùng chung giữa các thiết bị.`,'success');}
      catch(err){showMessage('Không tải được dữ liệu GitHub; tạm dùng dữ liệu lưu trên thiết bị/mặc định. Lỗi: '+(err.message||err),'error');}
    }else{
      showMessage('Chưa cấu hình repository GitHub trong config.js. Hiện dữ liệu cập nhật chỉ lưu trên thiết bị này.','error');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();});else init();
})(globalThis);
