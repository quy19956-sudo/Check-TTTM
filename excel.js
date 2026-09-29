(function(global){
  'use strict';
  const App=global.App=global.App||{};

  function requireXlsx(){
    if (!global.XLSX) throw new Error('Không tải được thư viện đọc Excel. Hãy kiểm tra kết nối Internet rồi tải lại trang.');
  }

  function cellDisplay(cell){
    if (!cell || cell.v===undefined || cell.v===null) return '';
    const v=cell.v;
    if (v instanceof Date) return v;
    if (typeof v==='number' && Number.isInteger(v)){
      const fmt=String(cell.z||'').trim();
      if (/^0{2,12}$/.test(fmt)) return String(v).padStart(fmt.length,'0');
    }
    return v;
  }

  function sheetRows(ws,maxRows,maxCols){
    if (!ws || !ws['!ref']) return [];
    const range=global.XLSX.utils.decode_range(ws['!ref']);
    const endR=maxRows ? Math.min(range.e.r,range.s.r+maxRows-1) : range.e.r;
    const endC=maxCols ? Math.min(range.e.c,range.s.c+maxCols-1) : range.e.c;
    const rows=[];
    for (let r=range.s.r;r<=endR;r++){
      const row=[];
      for (let c=range.s.c;c<=endC;c++) row.push(cellDisplay(ws[global.XLSX.utils.encode_cell({r,c})]));
      rows.push(row);
    }
    return rows;
  }

  App.readWorkbook = async function(file){
    requireXlsx();
    const buf=await file.arrayBuffer();
    return global.XLSX.read(buf,{type:'array',cellDates:true,cellNF:true,cellText:false,dense:false});
  };

  function headerIndex(row){
    const out={};
    (row||[]).forEach((v,j)=>{ if(App.cleanCell(v)) out[App.normText(v)]=j; });
    return out;
  }

  function findHeader(rows,requiredAny){
    let bestIdx=-1,bestScore=0,bestMap={};
    (rows||[]).slice(0,100).forEach((row,i)=>{
      const headers=headerIndex(row); const joined=Object.keys(headers).join(' ');
      const score=requiredAny.reduce((sum,kw)=>sum+(joined.includes(App.normText(kw))?1:0),0);
      if(score>bestScore){bestIdx=i;bestScore=score;bestMap=headers;}
    });
    if(bestIdx<0) return [0,headerIndex((rows||[])[0]||[])];
    return [bestIdx,bestMap];
  }

  function findCol(headerMap,candidates){
    const cs=candidates.map(App.normText);
    for(const c of cs) if(Object.prototype.hasOwnProperty.call(headerMap,c)) return headerMap[c];
    for(const [h,idx] of Object.entries(headerMap)){
      for(const c of cs) if(c && (h===c || h.includes(c) || c.includes(h))) return idx;
    }
    return null;
  }

  function findRoleCodeCol(headerMap,field){
    const cs=new Set((App.ROLE_CODE_CANDIDATES[field]||[]).map(App.normText));
    for(const c of cs) if(Object.prototype.hasOwnProperty.call(headerMap,c)) return headerMap[c];
    return null;
  }

  function isRoleStaffHeader(header){ return /^(?:HOTEN\d+|HT\d+)$/.test(App.normText(header)); }

  function looksLikeWorkingOrRulesHeader(headerMap){
    const keys=new Set(Object.keys(headerMap));
    const hasPatientId=['MABN','MA BN','MA BENH NHAN'].some(k=>keys.has(k));
    const hasPatientName=['HOTEN','HO TEN','HO VA TEN'].some(k=>keys.has(k));
    const hasProcedure=['MAPT','MA PT','TENPT','TENPTDM','TENPTT','TEN PHAU THUAT','TEN THU THUAT'].some(k=>keys.has(k));
    const hasTime=['NGAY','NGAYBD','NGAY KT','NGAYKT','THOIGIAN'].some(k=>keys.has(k));
    const hasRole=[...keys].some(isRoleStaffHeader);
    return (hasPatientName&&hasPatientId&&hasProcedure)||(hasProcedure&&(hasTime||hasRole));
  }

  function findStaffCodeCol(headerMap){
    const primary=['Mã NV','Ma NV','MANV','Mã nhân viên','Ma nhan vien','MSNV','Mã số NV','Ma so NV','Mã','Ma'].map(App.normText);
    for(const c of primary) if(Object.prototype.hasOwnProperty.call(headerMap,c)) return headerMap[c];
    const fallback=['Mã cán bộ','Ma can bo','MACB','Mã CB','Ma CB','Mã CBVC','Ma CBVC'].map(App.normText);
    for(const c of fallback) if(Object.prototype.hasOwnProperty.call(headerMap,c)) return headerMap[c];
    return null;
  }

  function findStaffNameCol(headerMap){
    const candidates=['Họ và tên','Ho va ten','Họ tên','Ho ten','HOTEN','Tên nhân viên','Ten nhan vien','Họ tên nhân viên','Ho ten nhan vien','Tên','Ten'].map(App.normText);
    for(const c of candidates) if(Object.prototype.hasOwnProperty.call(headerMap,c)&&!isRoleStaffHeader(c)) return headerMap[c];
    for(const [h,idx] of Object.entries(headerMap)) if(!isRoleStaffHeader(h)&&((h.includes('HO')&&h.includes('TEN'))||h.includes('TEN NHAN VIEN'))) return idx;
    return null;
  }

  function readStaffRows(sheet,rows){
    if(!rows.length) return {items:[],sheet,score:-1};
    let [headerRow]=findHeader(rows,['STT','MA','HO VA TEN','HO TEN']);
    const map=headerIndex(rows[headerRow]||[]);
    if(looksLikeWorkingOrRulesHeader(map)) return {items:[],sheet,score:-1};
    let fixed=false,sttCol=null,codeCol=null,nameCol=null;
    if((rows[headerRow]||[]).length>=3){
      const [h0,h1,h2]=(rows[headerRow]||[]).slice(0,3).map(App.normText);
      fixed=['STT','SO TT','TT'].includes(h0)&&['MA','MA NV','MANV','MSNV','MA SO NV','MA NHAN VIEN'].includes(h1)&&((h2.includes('HO')&&h2.includes('TEN'))||['HOTEN','TEN'].includes(h2));
    }
    if(fixed){sttCol=0;codeCol=1;nameCol=2;} else {
      sttCol=findCol(map,['STT','Số TT','So TT','TT']);
      codeCol=findStaffCodeCol(map); nameCol=findStaffNameCol(map);
    }
    const titleCol=findCol(map,['Chức danh','Chuc danh','Chức vụ','Chuc vu']);
    if(nameCol===null) return {items:[],sheet,score:-1};
    const items=[],seen=new Set();
    for(let i=headerRow+1;i<rows.length;i++){
      const row=rows[i]||[]; const rawName=row[nameCol]??''; const [prefix,rawPerson]=App.splitStaffCodeName(rawName); const name=App.cleanStaffName(rawPerson);
      let code=(codeCol!==null ? App.cleanCell(row[codeCol]) : prefix); code=App.normCode(code||prefix);
      if(!name || ['TEN','HO TEN','HO VA TEN','HO VA TEN NHAN VIEN'].includes(App.normText(name))) continue;
      const key=code+'|'+App.normName(name); if(!App.normName(name)||seen.has(key)) continue; seen.add(key);
      items.push({name,title:titleCol!==null?App.cleanCell(row[titleCol]):'',code,row:i+1});
    }
    const short=items.filter(x=>/^\d{3,5}$/.test(App.normCode(x.code))).length;
    const score=items.length*100+short*50+(fixed?1000000:0);
    return {items,sheet,score,code_column:codeCol!==null?App.cleanCell((rows[headerRow]||[])[codeCol]):'',name_column:App.cleanCell((rows[headerRow]||[])[nameCol])};
  }

  App.loadStaffExcel = async function(file){
    const wb=await App.readWorkbook(file); const candidates=[];
    for(const sheet of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[sheet],500,80); const c=readStaffRows(sheet,rows); if(c.items.length)candidates.push(c);
    }
    if(!candidates.length) return {items:[],sheet:''};
    candidates.sort((a,b)=>b.score-a.score); const best=candidates[0];
    return {items:best.items,sheet:best.sheet,code_column:best.code_column,name_column:best.name_column};
  };

  App.loadRulesExcel = async function(file){
    const wb=await App.readWorkbook(file);
    for(const sheet of wb.SheetNames){
      const rows=sheetRows(wb.Sheets[sheet],5000,80); if(!rows.length)continue;
      let [headerRow]=findHeader(rows,['MAPT','TENPT','THOIGIAN','HOTEN1']); const map=headerIndex(rows[headerRow]||[]);
      const maptCol=findCol(map,['MAPT','Mã PT','Ma PT']); const tenCol=findCol(map,['TENPT','Tên PT','Tên thủ thuật','Tên phẫu thuật']); const timeCol=findCol(map,['THOIGIAN','Thời gian','Thoi gian']);
      if(tenCol===null)continue;
      const roleCols={}; App.ROLE_DEFS.forEach(([field])=>roleCols[field]=findCol(map,[field]));
      const items=[];
      for(let i=headerRow+1;i<rows.length;i++){
        const row=rows[i]||[]; const ten=App.cleanCell(row[tenCol]); if(!ten)continue; const req=[];
        App.ROLE_DEFS.forEach(([field,label])=>{const col=roleCols[field];const marker=col!==null?App.cleanCell(row[col]):'';if(marker&&!['0','NO','KHONG'].includes(App.normText(marker)))req.push({field,label});});
        items.push({mapt:maptCol!==null?App.cleanCell(row[maptCol]):'',tenpt:ten,time_rule:timeCol!==null?App.cleanCell(row[timeCol]):'',required_roles:req,min_people:req.length,row:i+1});
      }
      if(items.length)return {items,sheet};
    }
    return {items:[],sheet:''};
  };

  function workingColumns(map){
    const cols={};
    cols.ten=findCol(map,['TENPT','TENPTDM','TENPTT','Tên phẫu thuật','Tên thủ thuật']);
    cols.mabn=findCol(map,['MABN','Mã BN','Ma BN']); cols.hoten=findCol(map,['HOTEN','Họ tên','Ho ten']); cols.namsinh=findCol(map,['NAMSINH','Năm sinh','Nam sinh']);
    cols.start=findCol(map,['NGAY','Ngày bắt đầu','Ngay bat dau','NGAYBD']); cols.end=findCol(map,['NGAYKT','Ngày kết thúc','Ngay ket thuc']); cols.mapt=findCol(map,['MAPT','Mã PT','Ma PT']);
    cols.khoa=findCol(map,['TENKHOACHIDINH','Khoa chỉ định','Khoa chi dinh','TENKP']); cols.tenpmo=findCol(map,['TENPMO','TEN PMO','Phòng mổ','Phong mo','Khoa thực hiện','Khoa thuc hien','TENKHOATHUCHIEN']); cols.loai=findCol(map,['TENLOAIPT','Loại PT-TT','Loai PT-TT','PHANLOAIPT']);
    const roleCols={},roleCodeCols={}; App.ROLE_DEFS.forEach(([field,_label,cands])=>{roleCols[field]=findCol(map,cands);roleCodeCols[field]=findRoleCodeCol(map,field);});
    return [cols,roleCols,roleCodeCols];
  }

  function recordFromRow(row,sheet,ridx,seq,cols,roleCols,roleCodeCols,fixSwap){
    const get=col=>col!==null&&col!==undefined&&col<row.length?row[col]:null;
    const ten=App.cleanCell(get(cols.ten)),patient=App.cleanCell(get(cols.hoten)); if(!ten&&!patient)return null;
    const roles={};
    App.ROLE_DEFS.forEach(([field,label])=>{
      const raw=get(roleCols[field]),rawCode=get(roleCodeCols[field]); let [staffCode,staffName]=App.splitStaffCodeName(raw);
      if(!staffCode&&App.cleanCell(rawCode))staffCode=App.normCode(rawCode);
      roles[field]={label,name:App.cleanStaffName(staffName),code:App.normCode(staffCode),raw:App.cleanCell(raw),raw_code:App.cleanCell(rawCode)};
    });
    const start=App.parseDate(get(cols.start),fixSwap),end=App.parseDate(get(cols.end),fixSwap);
    return {source:'Excel',source_row:`${sheet}!${ridx}`,stt:String(seq),mabn:App.cleanCell(get(cols.mabn)),patient_name:patient,birth_year:App.cleanCell(get(cols.namsinh)),mapt:App.cleanCell(get(cols.mapt)),tenpt:ten,khoa:App.cleanCell(get(cols.khoa)),tenpmo:App.cleanCell(get(cols.tenpmo)),has_tenpmo:cols.tenpmo!==null,loai:App.cleanCell(get(cols.loai)),start:App.formatDate(start),end:App.formatDate(end),start_dt:start,end_dt:end,duration_minutes:App.durationMinutes(start,end),roles};
  }

  App.loadWorkingExcel = async function(file,fixDayMonthSwap){
    const wb=await App.readWorkbook(file);
    for(const sheet of wb.SheetNames){
      const ws=wb.Sheets[sheet]; const preview=sheetRows(ws,100,160); if(!preview.length)continue;
      let [headerRow]=findHeader(preview,['MABN','HOTEN','TENPT','NGAY','NGAYKT']); const map=headerIndex(preview[headerRow]||[]); const [cols,rc,rcc]=workingColumns(map);
      if(cols.ten===null||cols.hoten===null)continue;
      const fullRows=sheetRows(ws,0,0); const records=[];
      for(let i=headerRow+1;i<fullRows.length;i++){
        const rec=recordFromRow(fullRows[i]||[],sheet,i+1,records.length+1,cols,rc,rcc,!!fixDayMonthSwap); if(rec)records.push(rec);
      }
      if(records.length)return {records,sheet};
    }
    return {records:[],sheet:''};
  };

  App._excelInternals={headerIndex,findHeader,findCol,workingColumns,sheetRows};
})(globalThis);
