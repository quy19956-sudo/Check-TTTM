'use strict';
importScripts('app.js?v=50');
App.onExcelProgress=message=>self.postMessage({type:'progress',message});
self.onmessage=async function(event){
  try{
    const data=event.data||{};
    App.onExcelProgress('Đang tải bộ đọc Excel trong luồng nền…');
    if(!self.XLSX)importScripts('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');
    if(!self.XLSX)throw new Error('Không tải được bộ đọc Excel. Kiểm tra kết nối Internet.');
    let result;
    if(data.task==='staff')result=await App.loadStaffExcel(data.file);
    else if(data.task==='rules')result=await App.loadRulesExcel(data.file);
    else if(data.task==='check'){
      App.validateReference(data.staffData,'staff');App.validateReference(data.rulesData,'rules');
      const parsed=await App.loadWorkingExcel(data.file,data.fixDayMonthSwap);
      if(!parsed.records.length)throw new Error('Không tìm thấy dữ liệu thủ thuật phù hợp trong Excel.');
      App.onExcelProgress(`Đang lọc phạm vi và kiểm tra ${parsed.records.length.toLocaleString('vi')} dòng…`);
      result=App.runChecks(parsed.records,data.staffData,data.rulesData,data.options);
      result.source_note=`Excel sheet: ${parsed.sheet}; đọc ${parsed.records.length.toLocaleString('vi')} dòng; kiểm tra ${result.summary.scoped_records.toLocaleString('vi')} dòng trong phạm vi.`;
      result.ignored_sheets=parsed.ignored_sheets;
    }else throw new Error('Thao tác Excel không hợp lệ.');
    self.postMessage({type:'result',result});
  }catch(error){
    self.postMessage({type:'error',message:error&&error.message?error.message:String(error)});
  }
};
