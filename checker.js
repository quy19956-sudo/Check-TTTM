(function(global){
  'use strict';
  const App=global.App=global.App||{};
  const ALLOWED_TENPMO=new Set([App.normText('Khoa Nội Tim Mạch'),App.normText('Phong DSA')]);

  function primarySurgeonName(rec){
    const role=(rec.roles||{}).HOTEN1||{};
    if(role&&typeof role==='object'){
      const name=App.cleanCell(role.name),code=App.normCode(role.code);
      return name&&code?`${name} [${code}]`:name;
    }
    return App.cleanCell(role);
  }

  function issue(kind,level,rec,detail,suggestion,extra){
    return Object.assign({type:kind,level,source_row:rec.source_row||'',stt:rec.stt||'',mabn:rec.mabn||'',patient_name:rec.patient_name||'',tenpt:rec.tenpt||'',primary_surgeon:primarySurgeonName(rec),start:rec.start||'',end:rec.end||'',detail,suggestion:suggestion||''},extra||{});
  }

  function timeRuleSkipsOverlap(text){
    const t=App.normText(text); if(!t)return false;
    return ['KHONG KIEM TRA TRUNG GIO','KHONG CHECK TRUNG GIO','BO QUA TRUNG GIO','MIEN KIEM TRA TRUNG GIO'].some(p=>t.includes(p));
  }
  function timeRuleIsIndefinite(text){return App.normText(text).includes('KHONG AN DINH');}
  function staffTimesConflict(rec1,s1,e1,rec2,s2,e2){
    if(rec1.time_rule_indefinite||rec2.time_rule_indefinite) return +s1===+s2||+e1===+e2||+s1===+e2||+e1===+s2;
    return s1<e2&&s2<e1;
  }
  function overlapColorHex(groupIndex){return App.hsvToHex((groupIndex*0.618033988749895)%1,0.22,1.0);}

  function buildRuleIndex(rules){
    const byCode=new Map(),byName=new Map(),names=[];
    for(const r of rules){const c=App.normText(r.mapt),n=App.normText(r.tenpt);if(c)byCode.set(c,r);if(n){byName.set(n,r);names.push(n);}}
    return {byCode,byName,names};
  }
  function findRule(rec,index){
    const code=App.normText(rec.mapt); if(code&&index.byCode.has(code))return [index.byCode.get(code),'Mã PT'];
    const name=App.normText(rec.tenpt); if(index.byName.has(name))return [index.byName.get(name),'Tên TT'];
    if(name&&index.names.length){let best=null,bestRatio=0;for(const n of index.names){const r=App.similarityRatio(name,n);if(r>bestRatio){bestRatio=r;best=n;}}if(best&&bestRatio>=0.88)return [index.byName.get(best),'Tên gần đúng'];}
    return [null,''];
  }

  App.runChecks=function(records,staffData,rulesData){
    const issues=[]; const staffItems=(staffData&&staffData.items)||[]; const rulesItems=(rulesData&&rulesData.items)||[];
    const staffPairs=new Set();
    for(const x of staffItems){const c=App.normCode(x.code),n=App.strictNameKey(x.name);if(c&&n)staffPairs.add(c+'|'+n);}
    const ruleIndex=buildRuleIndex(rulesItems); const analyzed=[]; const roleStaffUsage=new Map(); const duplicateMap=new Map();

    records.forEach((rec,zeroIdx)=>{
      rec.index=zeroIdx+1;
      const [rule,ruleMatch]=findRule(rec,ruleIndex); rec.rule_match=ruleMatch; rec.rule_tenpt=rule?rule.tenpt||'':''; rec.rule_time=rule?rule.time_rule||'':''; rec.required_people=rule?rule.min_people||0:0;
      const skipOverlap=timeRuleSkipsOverlap(rec.rule_time); rec.skip_overlap=skipOverlap; rec.time_rule_indefinite=timeRuleIsIndefinite(rec.rule_time);
      if(rule&&ruleMatch==='Tên gần đúng') issues.push(issue('Tên thủ thuật khớp gần','Cảnh báo',rec,`Tên trong file được ghép gần với danh mục: ${rule.tenpt||''}.`,'Kiểm tra lại tên hoặc mã thủ thuật; nên dùng Mã PT để đối chiếu chính xác.'));

      const tenpmo=App.cleanCell(rec.tenpmo),hasTenpmo=!!rec.has_tenpmo,allowedOld=!hasTenpmo||ALLOWED_TENPMO.has(App.normText(tenpmo)); rec.tenpmo_allowed_for_old_checks=allowedOld;
      const actualStaff=[],staffInDepartmentRoles=[];
      for(const [field,roleRaw] of Object.entries(rec.roles||{})){
        const role=roleRaw&&typeof roleRaw==='object'?roleRaw:{name:roleRaw,label:field,code:''};
        const name=App.cleanCell(role.name),roleLabel=role.label||field,roleCode=App.cleanCell(role.code);
        if(name){
          const [baseName,_embedded,hasEmbedded]=App.splitVisibleNameAndEmbeddedCode(name); const effectiveCode=roleCode; const nkey=App.strictNameKey(baseName),ckey=App.normCode(effectiveCode); const personKey=ckey&&nkey?ckey+'|'+nkey:(ckey||nkey);
          if(personKey)actualStaff.push(personKey); const inStaff=!!(ckey&&nkey&&staffPairs.has(ckey+'|'+nkey)); const displayName=hasEmbedded?baseName:name; const displayPerson=effectiveCode?`${displayName} (${effectiveCode})`:displayName;
          if(personKey&&inStaff){staffInDepartmentRoles.push(`${roleLabel}: ${displayPerson}`);if(allowedOld&&!skipOverlap){if(!roleStaffUsage.has(personKey))roleStaffUsage.set(personKey,[]);roleStaffUsage.get(personKey).push([rec,roleLabel,displayPerson]);}}
        }
      }
      rec.actual_people=new Set(actualStaff.filter(Boolean)).size;

      if(hasTenpmo&&staffInDepartmentRoles.length&&!allowedOld){
        const wrong=tenpmo||'(trống)'; let txt=staffInDepartmentRoles.slice(0,6).join(', ');if(staffInDepartmentRoles.length>6)txt+=`, ... (+${staffInDepartmentRoles.length-6})`;
        issues.push(issue('Chọn sai khoa thực hiện','Lỗi',rec,`Có nhân viên thuộc danh sách khoa trong ê-kíp nhưng TENPMO đang là: ${wrong}. Nhân viên: ${txt}.`,`Đang chọn sai khoa: ${wrong}`,{tenpmo,wrong_department:wrong}));
      }

      if(hasTenpmo&&allowedOld){
        const invalid=[];
        for(const [field,role] of Object.entries(rec.roles||{})){
          if(!role||typeof role!=='object')continue; const raw=App.cleanCell(role.raw),name=App.cleanCell(role.name),code=App.normCode(role.code),label=role.label||field;
          if(!raw&&!name&&!code)continue; const nkey=App.strictNameKey(name); if(!(code&&nkey&&staffPairs.has(code+'|'+nkey))){const display=raw||`${code} ${name}`.trim();invalid.push(`${label}: ${display}`);}
        }
        if(invalid.length){let txt=invalid.slice(0,8).join(', ');if(invalid.length>8)txt+=`, ... (+${invalid.length-8})`;issues.push(issue('Sai tên nhân viên','Lỗi',rec,`TENPMO là ${tenpmo} nhưng có nhân viên không khớp danh sách nhân viên Nội Tim Mạch/DSA theo cặp Mã NV + Họ tên: ${txt}.`,'Kiểm tra lại mã NV/họ tên trong các ô HOTEN1/HOTEN2/... hoặc cập nhật danh sách nhân viên Nội Tim Mạch/DSA.',{tenpmo}));}
      }

      if(!allowedOld){analyzed.push(rec);return;}

      if(!rule){
        issues.push(issue('Thủ thuật chưa có trong danh mục','Lỗi',rec,'Không tìm thấy thủ thuật trong danh mục số người/thời gian.','Cập nhật Danh mục hoặc kiểm tra lại Mã PT/Tên thủ thuật.'));
      }else{
        const required=rule.required_roles||[],requiredFields=new Set(required.map(x=>x.field).filter(Boolean)),filled=[];
        for(const [field,rv] of Object.entries(rec.roles||{})){const name=rv&&typeof rv==='object'?rv.name:rv,label=rv&&typeof rv==='object'?(rv.label||field):field;if(App.cleanCell(name))filled.push({field,label,name:App.cleanCell(name)});}
        const missing=[];for(const req of required){const rv=(rec.roles||{})[req.field]||{},name=rv&&typeof rv==='object'?rv.name:rv;if(!App.cleanCell(name))missing.push(req.label||req.field);}
        if(missing.length){let mt=missing.slice(0,8).join(', ');if(missing.length>8)mt+=`, ... (+${missing.length-8})`;let people='';if(rec.actual_people<required.length)people=` Đồng thời có ${rec.actual_people} người khác nhau, danh mục yêu cầu ${required.length} người/vị trí.`;issues.push(issue('Thiếu người theo danh mục','Lỗi',rec,`Thiếu vị trí bắt buộc: ${mt}.${people}`,`Danh mục yêu cầu ${rule.min_people??required.length} người/vị trí cho thủ thuật này. Bổ sung đủ ê-kíp hoặc cập nhật lại danh mục nếu quy định đã thay đổi.`));}
        const extra=filled.filter(r=>!requiredFields.has(r.field));
        if(required.length&&(extra.length||filled.length>required.length)){let et=extra.slice(0,8).map(r=>`${r.label}: ${r.name}`).join(', ');if(extra.length>8)et+=`, ... (+${extra.length-8})`;if(!et)et='Có số vị trí ê-kíp nhập nhiều hơn số vị trí danh mục yêu cầu.';issues.push(issue('Dư số người theo danh mục','Lỗi',rec,`Đã nhập ${filled.length} vị trí ê-kíp (${rec.actual_people} người khác nhau), danh mục chỉ yêu cầu ${required.length} vị trí. Vị trí dư: ${et}.`,'Xóa người/vị trí nhập dư hoặc cập nhật lại danh mục nếu quy định số người đã thay đổi.'));}
        if(rec.actual_people<required.length&&!missing.length)issues.push(issue('Không đủ số người','Lỗi',rec,`Có ${rec.actual_people} người khác nhau, danh mục yêu cầu ${required.length} người/vị trí.`,'Bổ sung đủ ê-kíp hoặc cập nhật lại danh mục nếu quy định đã thay đổi.'));
        const min=App.parseMinMinutes(rule.time_rule||''),dur=rec.duration_minutes;
        if(min!==null){if(dur===null||dur===undefined)issues.push(issue('Không đọc được thời gian','Cảnh báo',rec,`Không tính được thời lượng để so với quy định: ${rule.time_rule||''}.`,'Kiểm tra cột Ngày bắt đầu/Ngày kết thúc trong file làm việc.'));else if(dur<min)issues.push(issue('Thời gian chưa đạt','Lỗi',rec,`Thời lượng ${Number(dur).toLocaleString('en-US',{maximumFractionDigits:2,useGrouping:false})} phút, quy định tối thiểu khoảng ${min} phút (${rule.time_rule||''}).`,'Kiểm tra giờ bắt đầu/kết thúc hoặc quy định thời gian trong danh mục.'));}
      }

      const dupKey=[App.cleanCell(rec.mabn),App.normText(rec.tenpt),rec.start||'']; if(dupKey.every(Boolean)){const k=dupKey.join('\u0001');if(!duplicateMap.has(k))duplicateMap.set(k,[]);duplicateMap.get(k).push(rec);}
      analyzed.push(rec);
    });

    for(const recs of duplicateMap.values())if(recs.length>1){const rows=recs.slice(0,5).map(r=>r.source_row||'').join(', ');for(const rec of recs)issues.push(issue('Trùng thủ thuật','Cảnh báo',rec,`Cùng Mã BN + Tên thủ thuật + giờ bắt đầu xuất hiện ${recs.length} lần. Dòng liên quan: ${rows}.`,'Kiểm tra có nhập trùng hay không.'));}

    let overlapGroupCount=0; const seenPairs=new Set();
    outer: for(const [staffKey,uses] of roleStaffUsage.entries()){
      const intervals=[];let displayName='';
      for(const use of uses){const [rec,roleLabel,usedDisplay='']=use,s=rec.start_dt,e=rec.end_dt;if(!(s instanceof Date)||!(e instanceof Date)||e<=s)continue;const name=usedDisplay||staffKey;displayName=displayName||name;intervals.push([s,e,rec,roleLabel]);}
      intervals.sort((a,b)=>(a[0]-b[0])||(a[1]-b[1])||String(a[2].source_row||'').localeCompare(String(b[2].source_row||'')));
      for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){
        const [s1,e1,r1,role1]=intervals[i],[s2,e2,r2,role2]=intervals[j];if(r1===r2||!staffTimesConflict(r1,s1,e1,r2,s2,e2))continue;
        const pk=[staffKey,r1.source_row,r1.start,r1.end,r2.source_row,r2.start,r2.end,role1,role2].join('\u0001');if(seenPairs.has(pk))continue;seenPairs.add(pk);overlapGroupCount++;if(overlapGroupCount>500)break outer;
        const color=overlapColorHex(overlapGroupCount),gid='TG'+String(overlapGroupCount).padStart(3,'0'),extra={overlap_group:gid,overlap_staff:displayName,overlap_color:'#'+color,overlap_color_hex:color};
        const endpoint=!!(r1.time_rule_indefinite||r2.time_rule_indefinite),mode=endpoint?'trùng mốc giờ (có thủ thuật Không ấn định)':'chồng chéo thời gian';
        const pairText=`Nhóm ${gid}: ${displayName} bị ${mode} giữa ${r1.source_row} (${r1.start} - ${r1.end}; ${role1}) và ${r2.source_row} (${r2.start} - ${r2.end}; ${role2}).`;const suggestion='Kiểm tra lại mốc giờ hoặc người thực hiện. Hai ca trong cùng nhóm được tô cùng màu.';
        issues.push(issue('Trùng thời gian nhân viên','Cảnh báo',r1,pairText,suggestion,Object.assign({overlap_related_row:r2.source_row,overlap_pair_order:1},extra)));
        issues.push(issue('Trùng thời gian nhân viên','Cảnh báo',r2,pairText,suggestion,Object.assign({overlap_related_row:r1.source_row,overlap_pair_order:2},extra)));
      }
    }

    const counts={},levels={};for(const i of issues){counts[i.type]=(counts[i.type]||0)+1;levels[i.level]=(levels[i.level]||0)+1;}
    const summary={total_records:records.length,total_issues:issues.length,error_count:levels['Lỗi']||0,warning_count:levels['Cảnh báo']||0,staff_count:staffItems.length,rules_count:rulesItems.length,issue_counts:counts,overlap_group_count:overlapGroupCount};
    return {summary,issues,records:analyzed};
  };
})(globalThis);
