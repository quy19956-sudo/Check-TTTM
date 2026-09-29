(function(global){
  'use strict';
  const App=global.App=global.App||{};
  const cfg=global.APP_CONFIG||{};

  const owner=String(cfg.GITHUB_OWNER||'').trim();
  const repo=String(cfg.GITHUB_REPO||'').trim();
  const branch=String(cfg.GITHUB_BRANCH||'main').trim()||'main';
  const staffPath=String(cfg.GITHUB_STAFF_PATH||'data/staff.json').trim();
  const rulesPath=String(cfg.GITHUB_RULES_PATH||'data/rules.json').trim();
  const TOKEN_KEY='kt_ttm_github_pat_session';

  function enabled(){
    return !!(owner&&repo&&branch&&staffPath&&rulesPath);
  }

  function repoLabel(){
    return owner&&repo ? owner+'/'+repo : '';
  }

  function rawUrl(path){
    const parts=String(path||'').split('/').map(encodeURIComponent).join('/');
    return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${parts}`;
  }

  function apiUrl(path){
    const parts=String(path||'').split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${parts}`;
  }

  async function readRaw(path){
    const url=rawUrl(path)+(rawUrl(path).includes('?')?'&':'?')+'t='+Date.now();
    const res=await fetch(url,{method:'GET',cache:'no-store'});
    if(res.status===404)return null;
    if(!res.ok)throw new Error(`Không đọc được ${path} từ GitHub (HTTP ${res.status}).`);
    const data=await res.json();
    if(!data||!Array.isArray(data.items))throw new Error(`File ${path} trên GitHub không đúng định dạng.`);
    return data;
  }

  async function loadAll(){
    if(!enabled())throw new Error('Chưa cấu hình repository GitHub trong config.js.');
    const [staff,rules]=await Promise.all([readRaw(staffPath),readRaw(rulesPath)]);
    return {ok:true,staff,rules,repo:repoLabel(),branch};
  }

  function getToken(){
    try{return String(sessionStorage.getItem(TOKEN_KEY)||'').trim();}
    catch(_e){return '';}
  }

  function setToken(token){
    token=String(token||'').trim();
    if(!token)throw new Error('GitHub token không được để trống.');
    try{sessionStorage.setItem(TOKEN_KEY,token);}catch(_e){}
    return token;
  }

  function clearToken(){
    try{sessionStorage.removeItem(TOKEN_KEY);}catch(_e){}
  }

  function authHeaders(token){
    return {
      'Accept':'application/vnd.github+json',
      'Authorization':'Bearer '+String(token||'').trim(),
      'Content-Type':'application/json'
    };
  }

  async function parseApiError(res){
    let msg='';
    try{
      const body=await res.json();
      msg=body&&body.message?body.message:'';
      if(body&&Array.isArray(body.errors)&&body.errors.length){
        const more=body.errors.map(x=>x&&x.message?x.message:JSON.stringify(x)).join('; ');
        if(more)msg+=(msg?': ':'')+more;
      }
    }catch(_e){}
    if(res.status===401) return 'GitHub token không hợp lệ hoặc đã hết hạn.';
    if(res.status===403) return 'GitHub từ chối quyền ghi. Hãy kiểm tra token có quyền Contents: Read and write cho repository này.';
    if(res.status===404) return 'Không tìm thấy repository/file hoặc token chưa được cấp quyền cho repository.';
    if(res.status===409) return 'Xung đột khi ghi GitHub. Hãy tải lại dữ liệu rồi thử lại.';
    if(res.status===422) return 'GitHub không chấp nhận nội dung commit: '+(msg||'dữ liệu không hợp lệ.');
    return msg||(`GitHub API lỗi HTTP ${res.status}.`);
  }

  async function getCurrentSha(path,token){
    const url=apiUrl(path)+'?ref='+encodeURIComponent(branch)+'&t='+Date.now();
    const res=await fetch(url,{method:'GET',cache:'no-store',headers:authHeaders(token)});
    if(res.status===404)return null;
    if(!res.ok)throw new Error(await parseApiError(res));
    const body=await res.json();
    return body&&body.sha?String(body.sha):null;
  }

  function utf8ToBase64(text){
    const bytes=new TextEncoder().encode(String(text));
    let binary='';
    const step=0x8000;
    for(let i=0;i<bytes.length;i+=step){
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+step,bytes.length)));
    }
    return btoa(binary);
  }

  async function saveFile(path,data,token,label){
    if(!enabled())throw new Error('Chưa cấu hình repository GitHub trong config.js.');
    if(!data||!Array.isArray(data.items))throw new Error('Dữ liệu không hợp lệ: thiếu items.');
    token=String(token||getToken()||'').trim();
    if(!token)throw new Error('Bạn chưa nhập GitHub token.');
    setToken(token);

    const sha=await getCurrentSha(path,token);
    const now=new Date();
    const message=`Cập nhật ${label||path} từ ứng dụng ${now.toLocaleString('vi-VN')}`;
    const body={
      message,
      content:utf8ToBase64(JSON.stringify(data,null,2)),
      branch
    };
    if(sha)body.sha=sha;

    const res=await fetch(apiUrl(path),{
      method:'PUT',
      cache:'no-store',
      headers:authHeaders(token),
      body:JSON.stringify(body)
    });
    if(!res.ok)throw new Error(await parseApiError(res));
    const result=await res.json();
    return {
      ok:true,
      data,
      saved:path,
      commit_sha:result&&result.commit&&result.commit.sha||'',
      commit_url:result&&result.commit&&result.commit.html_url||'',
      repo:repoLabel(),
      branch
    };
  }

  async function saveStaff(data,token){return saveFile(staffPath,data,token,'danh sách nhân viên');}
  async function saveRules(data,token){return saveFile(rulesPath,data,token,'danh mục thủ thuật');}

  async function checkWriteAccess(token){
    token=String(token||getToken()||'').trim();
    if(!token)throw new Error('Bạn chưa nhập GitHub token.');
    setToken(token);
    const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res=await fetch(url,{method:'GET',cache:'no-store',headers:authHeaders(token)});
    if(!res.ok)throw new Error(await parseApiError(res));
    const body=await res.json();
    return {ok:true,repo:body.full_name||repoLabel(),private:!!body.private,default_branch:body.default_branch||branch};
  }

  App.OnlineStore={
    enabled,loadAll,saveStaff,saveRules,getToken,setToken,clearToken,checkWriteAccess,
    repo:repoLabel(),branch,staffPath,rulesPath
  };
})(globalThis);
