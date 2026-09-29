(function(global){
  'use strict';
  const App=global.App=global.App||{};
  const cfg=global.APP_CONFIG||{};
  const apiUrl=String(cfg.ONLINE_API_URL||'').trim();

  function enabled(){return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(apiUrl);}
  async function parseResponse(res){
    const text=await res.text();
    let data;
    try{data=JSON.parse(text);}catch(_e){throw new Error('Máy chủ online trả về dữ liệu không hợp lệ.');}
    if(!res.ok||!data||data.ok===false)throw new Error((data&&data.error)||('HTTP '+res.status));
    return data;
  }
  async function loadAll(){
    if(!enabled())throw new Error('Chưa cấu hình ONLINE_API_URL trong config.js.');
    const sep=apiUrl.includes('?')?'&':'?';
    const res=await fetch(apiUrl+sep+'action=getAll&t='+Date.now(),{method:'GET',cache:'no-store',redirect:'follow'});
    return parseResponse(res);
  }
  async function save(kind,data,pin){
    if(!enabled())throw new Error('Chưa cấu hình ONLINE_API_URL trong config.js.');
    if(!pin)throw new Error('Bạn chưa nhập mã PIN quản trị.');
    const res=await fetch(apiUrl,{method:'POST',cache:'no-store',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:kind==='staff'?'saveStaff':'saveRules',pin:String(pin),data})});
    return parseResponse(res);
  }
  async function saveStaff(data,pin){return save('staff',data,pin);}
  async function saveRules(data,pin){return save('rules',data,pin);}

  App.OnlineStore={enabled,loadAll,saveStaff,saveRules,apiUrl};
})(globalThis);
