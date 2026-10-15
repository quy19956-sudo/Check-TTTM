// Run with: node self_test.cjs. No network, Excel library or patient data required.
'use strict';
const assert=require('node:assert/strict');
require('./app.js');
const A=App.DEFAULT_STAFF.items.find(s=>s.code==='0402');
const B=App.DEFAULT_STAFF.items.find(s=>s.code==='0403');
const staff={items:[A,B]};
const rules=time=>({items:[{mapt:'TEST',tenpt:'Thủ thuật kiểm thử',time_rule:time,required_roles:[{field:'HOTEN1',label:'PT-TT chính'}],min_people:1}]});
function record(row,start='2026-06-20 08:00',end='2026-06-20 09:00',person=A){
  const a=App.parseDate(start),b=App.parseDate(end);
  return {source_row:'test!'+row,stt:String(row-1),mabn:'BN'+row,patient_name:'Người bệnh kiểm thử '+row,mapt:'TEST',tenpt:'Thủ thuật kiểm thử',khoa:'Khoa Nội Tim Mạch',khoa_chidinh:'Khoa Nội Tim Mạch',tenkp:'Khoa Nội Tim Mạch',tenpmo:'Phòng DSA',has_tenpmo:true,start_dt:a,end_dt:b,start:App.formatDate(a),end:App.formatDate(b),roles:{HOTEN1:{name:person.name,code:person.code,raw:person.code+' '+person.name,label:'PT-TT chính'}}};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('OK',name);}
function run(rows,time='không ấn định'){return App.runChecks(rows,staff,rules(time));}
function has(result,type){return result.issues.some(i=>i.type===type);}
test('Không ấn định vẫn phát hiện chồng giờ',()=>{const r=run([record(2),record(3,'2026-06-20 08:30','2026-06-20 09:30')]);assert.equal(r.summary.overlap_group_count,1);assert.equal(r.summary.indefinite_time_records,2);assert.equal(r.summary.full_check_records,2);});
test('Không ấn định bỏ giới hạn số phút',()=>{assert.equal(run([record(2,'2026-06-20 08:00','2026-06-20 08:01')]).issues.length,0);});
test('Miễn trùng giờ không tạo nhóm chồng giờ',()=>{const r=run([record(2),record(3)],'không kiểm tra trùng giờ');assert.equal(r.summary.overlap_group_count,0);assert.equal(r.summary.overlap_exempt_records,2);});
for(const time of ['không ấn định','không kiểm tra trùng giờ']){
  test(time+': vẫn kiểm tra tên sai',()=>{const x=record(2);x.roles.HOTEN1.name='Tên nhập sai';x.roles.HOTEN1.raw='0402 Tên nhập sai';assert(has(run([x],time),'Sai tên nhân viên'));});
  test(time+': khác khoa chỉ định không sinh lỗi hoặc cảnh báo',()=>{const x=record(2);x.tenkp='Khoa Lão học';assert.equal(run([x],time).issues.length,0);});
  test(time+': vẫn kiểm tra sai nơi thực hiện',()=>{const x=record(2);x.tenpmo='Khoa khác';assert(has(run([x],time),'Chọn sai khoa thực hiện'));});
  test(time+': vẫn kiểm tra thiếu người',()=>{const x=record(2);x.roles={};assert(has(run([x],time),'Thiếu người theo danh mục'));});
  test(time+': vẫn kiểm tra giờ sai',()=>{assert(has(run([record(2,'2026-06-20 09:00','2026-06-20 08:00')],time),'Thời gian không hợp lệ'));});
  test(time+': vẫn kiểm tra mã/tên thủ thuật',()=>{const x=record(2);x.tenpt='Tên sai';assert(has(run([x],time),'Mã và tên thủ thuật không khớp'));});
}
test('Sai khoa và sai tên trên cùng dòng đều hiện',()=>{const x=record(2);x.tenpmo='Khoa khác';x.roles.HOTEN1.name='Tên nhập sai';assert(has(run([x]),'Chọn sai khoa thực hiện'));assert(has(run([x]),'Sai tên nhân viên'));});
test('Sai tên không làm mất kiểm tra trùng giờ theo mã đã biết',()=>{const x=record(2);x.roles.HOTEN1.name='Tên sai';assert.equal(run([x,record(3)]).summary.overlap_group_count,1);});
test('Phát hiện cột tên riêng bị sửa',()=>{const x=record(2);x.roles.HOTEN1.name_columns=[{column:'HOTEN1',raw:A.code+' '+A.name,name:A.name,code:A.code},{column:'HT1',raw:'Tên sai',name:'Tên sai',code:''}];assert(has(run([x]),'Tên nhân viên không thống nhất'));});
test('Phát hiện cột tên chính bị xóa nhưng cột tên riêng còn dữ liệu',()=>{const x=record(2);x.roles.HOTEN1={name:'',code:'',raw:'',name_columns:[{column:'HOTEN1',raw:'',name:'',code:''},{column:'HT1',raw:A.name,name:A.name,code:''}]};assert(has(run([x]),'Tên nhân viên không thống nhất'));});
test('Giờ kết thúc bằng giờ bắt đầu ca kế tiếp không chồng',()=>{assert.equal(run([record(2),record(3,'2026-06-20 09:00','2026-06-20 10:00')]).summary.overlap_group_count,0);});
test('Chồng giờ qua nửa đêm',()=>{assert.equal(run([record(2,'2026-06-20 23:30','2026-06-21 00:30'),record(3,'2026-06-21 00:00','2026-06-21 01:00')]).summary.overlap_group_count,1);});
test('Cùng người ở hai vị trí khác nhau giữa hai ca vẫn chồng giờ',()=>{const x=record(3,undefined,undefined,B);x.roles.HOTEN6={...record(2).roles.HOTEN1,label:'Giúp việc'};assert.equal(run([record(2),x]).summary.overlap_group_count,1);});
test('Hai nhân viên khác nhau không chồng giờ',()=>{assert.equal(run([record(2),record(3,undefined,undefined,B)]).summary.overlap_group_count,0);});
test('Miễn chồng giờ không bỏ tối thiểu được ghi cùng quy định',()=>{assert(has(run([record(2,'2026-06-20 08:00','2026-06-20 08:04')],'Trên hoặc bằng 5 phút; không kiểm tra trùng giờ'),'Thời gian chưa đạt'));});
test('Mốc tối thiểu bằng đúng 5 phút đạt',()=>{assert(!has(run([record(2,'2026-06-20 08:00','2026-06-20 08:05')],'Trên hoặc bằng 5 phút'),'Thời gian chưa đạt'));});
test('Dưới tối thiểu một giây bị phát hiện',()=>{assert(has(run([record(2,'2026-06-20 08:00:00','2026-06-20 08:04:59')],'Trên hoặc bằng 5 phút'),'Thời gian chưa đạt'));});
test('Không ấn định vẫn kiểm tra trùng bản ghi',()=>{const x=record(2),y=record(3);y.mabn=x.mabn;assert(has(run([x,y]),'Trùng thủ thuật'));});
test('Tên người ở khoa khác trùng tên nhưng khác mã không bị nhận nhầm',()=>{const x=record(2);x.tenpmo='Khoa khác';x.roles.HOTEN1.code='9999';assert.equal(run([x]).summary.out_of_scope_records,1);assert(!has(run([x]),'Chọn sai khoa thực hiện'));});
test('Thiếu nơi thực hiện không che lỗi tên của mã nhân viên đã biết',()=>{const x=record(2);x.tenpmo='';x.roles.HOTEN1.name='Tên sai';assert(has(run([x]),'Thiếu khoa thực hiện'));assert(has(run([x]),'Sai tên nhân viên'));});
test('TENPMO hợp lệ vẫn đạt khi cả hai cột khoa chỉ định khác nhau',()=>{const x=record(2);x.tenkp='Khoa Lão học';x.khoa_chidinh='Khoa Ngoại';x.khoa='Khoa Ngoại';assert.equal(run([x]).issues.length,0);});
test('Khoa chỉ định hợp lệ không che TENPMO sai',()=>{const x=record(2);x.tenpmo='Khoa khác';assert(has(run([x]),'Chọn sai khoa thực hiện'));});
test('Thiếu TENPMO không được lấy khoa chỉ định để thay thế',()=>{const x=record(2);x.tenpmo='';assert(has(run([x]),'Thiếu khoa thực hiện'));});
test('Chạm giới hạn 500 nhóm phải hiện trạng thái chưa hoàn tất',()=>{const r=run(Array.from({length:34},(_,i)=>record(i+2)));assert.equal(r.summary.overlap_group_count,500);assert.equal(r.summary.overlap_complete,false);assert(has(r,'Kiểm tra trùng giờ chưa hoàn tất'));});
App.validateReference(App.DEFAULT_STAFF,'staff');App.validateReference(App.DEFAULT_RULES,'rules');
console.log(`${passed} kiểm thử đạt.`);
