(function(global){
  'use strict';
  const App = global.App = global.App || {};

  App.ROLE_DEFS = [
    ['HOTEN1','PT-TT chính',['HOTEN1','HT1','PT-TT CHINH','PTTT CHINH']],
    ['HOTEN2','BS-ĐD phụ 1',['HOTEN2','HT2','BS-DD PHU 1','BS ĐD PHỤ 1']],
    ['HOTEN22','BS-ĐD phụ 2',['HOTEN22','HT3','BS-DD PHU 2','BS ĐD PHỤ 2']],
    ['HOTEN3','BS-ĐD phụ 3',['HOTEN3','HT4','BS-DD PHU 3','BS ĐD PHỤ 3']],
    ['HOTEN4','GM chính',['HOTEN4','HT5','GM CHINH']],
    ['HT6','GM phụ',['HT6','GM PHU']],
    ['HOTEN5','Dụng cụ phụ',['HOTEN5','HT7','DCU PHU','DUNG CU PHU']],
    ['HOTEN6','Giúp việc',['HOTEN6','HT8','GIUP VIEC']]
  ];

  App.ROLE_CODE_CANDIDATES = {
    HOTEN1:['MANV1','MA NV 1','MA_NV1','MAHT1','MA HT1','MA HOTEN1','MA_HOTEN1','MABS1','MA BS 1','MACB1','MA CB 1','MA PTTT CHINH','MA PT TT CHINH','MA PT-TT CHINH'],
    HOTEN2:['MANV2','MA NV 2','MA_NV2','MAHT2','MA HT2','MA HOTEN2','MA_HOTEN2','MABS2','MA BS 2','MACB2','MA CB 2','MA PHU 1','MA BS DD PHU 1','MA BS-ĐD PHỤ 1'],
    HOTEN22:['MANV3','MA NV 3','MA_NV3','MAHT3','MA HT3','MA HOTEN22','MA_HOTEN22','MA HOTEN3','MA_HOTEN3','MABS3','MA BS 3','MACB3','MA CB 3','MA PHU 2','MA BS DD PHU 2','MA BS-ĐD PHỤ 2'],
    HOTEN3:['MANV4','MA NV 4','MA_NV4','MAHT4','MA HT4','MA HOTEN3','MA_HOTEN3','MABS4','MA BS 4','MACB4','MA CB 4','MA PHU 3','MA BS DD PHU 3','MA BS-ĐD PHỤ 3'],
    HOTEN4:['MANV5','MA NV 5','MA_NV5','MAHT5','MA HT5','MA HOTEN4','MA_HOTEN4','MAGM1','MA GM 1','MA GM CHINH'],
    HT6:['MANV6','MA NV 6','MA_NV6','MAHT6','MA HT6','MAGM2','MA GM 2','MA GM PHU'],
    HOTEN5:['MANV7','MA NV 7','MA_NV7','MAHT7','MA HT7','MA HOTEN5','MA_HOTEN5','MA DCU PHU','MA DUNG CU PHU'],
    HOTEN6:['MANV8','MA NV 8','MA_NV8','MAHT8','MA HT8','MA HOTEN6','MA_HOTEN6','MA GIUP VIEC']
  };

  App.cleanCell = function(value){
    if (value === null || value === undefined) return '';
    let s;
    if (typeof value === 'number' && Number.isInteger(value)) s = String(value);
    else s = String(value);
    return s.replace(/\r/g,' ').replace(/\n/g,' ').replace(/\s+/g,' ').trim();
  };

  App.stripAccents = function(value){
    return App.cleanCell(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d');
  };

  App.normText = function(value){
    return App.stripAccents(value).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  };

  App.normCode = function(value){
    return App.cleanCell(value).toUpperCase().replace(/^[\'’‘`´]+/,'').replace(/\s+/g,'');
  };

  App.splitStaffCodeName = function(value){
    const raw = App.cleanCell(value);
    if (!raw) return ['', ''];
    let m = raw.match(/^\s*(\d{2,12})\s+(.+?)\s*$/);
    if (m) return [App.cleanCell(m[1]), App.cleanCell(m[2])];
    m = raw.match(/^\s*([A-Za-z0-9][A-Za-z0-9._/-]{1,60}\d[A-Za-z0-9._/-]*)\s+(.+?)\s*$/);
    if (m){
      const code = App.cleanCell(m[1]);
      const name = App.cleanCell(m[2]);
      if (/\d/.test(code) && (/[._/-]/.test(code) || /^\d+$/.test(code) || code.length >= 4)) return [code,name];
    }
    return ['',raw];
  };

  App.cleanStaffName = function(value){
    const parts = App.splitStaffCodeName(value);
    return App.cleanCell(parts[1]).replace(/\s+/g,' ').replace(/^[\s\-;,\.\t]+|[\s\-;,\.\t]+$/g,'');
  };

  App.normName = function(value){
    let s = App.stripAccents(App.cleanStaffName(value)).toUpperCase();
    s = s.replace(/[^A-Z ]+/g,' ');
    s = s.replace(/\b(BS|DD|CN|KS|THS|TS|CKI|CKII|BSCKI|BSCKII)\b/g,' ');
    return s.replace(/\s+/g,' ').trim();
  };

  App.strictNameKey = function(value){
    let s = App.cleanCell(value).toUpperCase();
    try { s = s.replace(/[^\p{L}\sĐ]+/gu,' '); }
    catch(_e){ s = s.replace(/[^A-ZÀ-ỸĐ\s]+/g,' '); }
    s = s.replace(/\b(BS|DD|ĐD|CN|KS|THS|TS|CKI|CKII|BSCKI|BSCKII)\b/g,' ');
    return s.replace(/\s+/g,' ').trim();
  };

  App.splitVisibleNameAndEmbeddedCode = function(value){
    const raw = App.cleanCell(value);
    if (!raw) return [raw,'',false];
    const m = raw.match(/\s*\[([^\]]{1,40})\]\s*$/);
    if (!m) return [raw,'',false];
    const base = App.cleanCell(raw.slice(0,m.index));
    const embedded = App.normCode(m[1]);
    return base && embedded ? [base,embedded,true] : [raw,'',false];
  };

  function validDateParts(y,m,d,h,min){
    const dt = new Date(y,m-1,d,h||0,min||0,0,0);
    return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d ? dt : null;
  }

  function swapDayMonthIfNeeded(dt, fix){
    const out = new Date(dt.getTime());
    out.setSeconds(0,0);
    if (!fix) return out;
    const d = out.getDate(), m = out.getMonth()+1;
    if (d>=1 && d<=12 && m>=1 && m<=12){
      const swapped = validDateParts(out.getFullYear(),d,m,out.getHours(),out.getMinutes());
      if (swapped) return swapped;
    }
    return out;
  }

  App.excelSerialToDate = function(serial){
    if (!Number.isFinite(serial)) return null;
    const whole = Math.floor(serial);
    const frac = serial - whole;
    // Excel 1900 date system, including the historical leap-year bug.
    let days = whole;
    if (days >= 60) days -= 1;
    const base = Date.UTC(1899,11,31);
    const ms = base + days*86400000 + Math.round(frac*86400000);
    const u = new Date(ms);
    return new Date(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate(),u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),0);
  };

  App.parseDate = function(value, fixDayMonthSwap){
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return swapDayMonthIfNeeded(value, !!fixDayMonthSwap);
    if (typeof value === 'number' && Number.isFinite(value)){
      const dt = App.excelSerialToDate(value);
      return dt ? swapDayMonthIfNeeded(dt, !!fixDayMonthSwap) : null;
    }
    let s = App.cleanCell(value).replace('T',' ').replace(/\s+/g,' ');
    if (!s) return null;
    let m;
    m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{1,2})?)?$/);
    if (m) return validDateParts(+m[3],+m[2],+m[1],+(m[4]||0),+(m[5]||0));
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::\d{1,2})?)?$/);
    if (m) return validDateParts(+m[1],+m[2],+m[3],+(m[4]||0),+(m[5]||0));
    m = s.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}).*?(\d{1,2}:\d{2})/);
    if (m) return App.parseDate(m[1]+' '+m[2],false);
    m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return new Date(1900,0,1,+m[1],+m[2],0,0);
    return null;
  };

  App.formatDate = function(dt){
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
    const pad=n=>String(n).padStart(2,'0');
    if (dt.getFullYear()===1900) return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  App.durationMinutes = function(start,end){
    if (!(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start)||Number.isNaN(end)) return null;
    if (start.getFullYear()===1900 || end.getFullYear()===1900) return null;
    let ms=end-start;
    if (ms<0 && Math.abs(ms)<=86400000) ms+=86400000;
    if (ms<0) return null;
    return Math.round((ms/60000)*100)/100;
  };

  App.parseMinMinutes = function(ruleText){
    const text=App.normText(ruleText);
    if (!text) return null;
    const noMin=['KHONG AN DINH','KHONG KIEM TRA TRUNG GIO','KHONG CHECK TRUNG GIO','BO QUA TRUNG GIO','MIEN KIEM TRA TRUNG GIO'];
    if (noMin.some(p=>text.includes(p))) return null;
    let m=text.match(/(\d+)\s*(PHUT|TIENG|GIO)/);
    if (!m){
      m=text.match(/(?:TREN|TOI THIEU|IT NHAT|>=|>|MIN)?\s*(\d+)\b/);
      return m ? +m[1] : null;
    }
    const n=+m[1];
    return (m[2]==='TIENG'||m[2]==='GIO') ? n*60 : n;
  };

  App.similarityRatio = function(a,b){
    a=String(a||''); b=String(b||'');
    if (a===b) return 1;
    if (!a.length || !b.length) return 0;
    // LCS ratio is close to difflib's ratio for small normalized procedure names.
    const prev=new Uint16Array(b.length+1), cur=new Uint16Array(b.length+1);
    for (let i=1;i<=a.length;i++){
      for (let j=1;j<=b.length;j++) cur[j]=a[i-1]===b[j-1] ? prev[j-1]+1 : Math.max(prev[j],cur[j-1]);
      prev.set(cur); cur.fill(0);
    }
    return 2*prev[b.length]/(a.length+b.length);
  };

  App.hsvToHex = function(h,s,v){
    const i=Math.floor(h*6), f=h*6-i, p=v*(1-s), q=v*(1-f*s), t=v*(1-(1-f)*s);
    let r,g,b;
    switch(i%6){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;default:r=v;g=p;b=q;}
    return [r,g,b].map(x=>Math.floor(x*255).toString(16).padStart(2,'0').toUpperCase()).join('');
  };

  App.escapeHtml = function(value){
    return App.cleanCell(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  };

  App.nowText = function(){
    const d=new Date(), pad=n=>String(n).padStart(2,'0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  App.downloadBlob = function(blob,filename){
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
})(globalThis);
