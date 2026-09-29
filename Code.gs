/*
  BACKEND ONLINE CHO "KIỂM TRA THỦ THUẬT TIM MẠCH"
  1) Đổi ADMIN_PIN thành mã PIN mạnh chỉ bạn biết.
  2) Deploy > New deployment > Web app.
  3) Execute as: Me.
  4) Who has access: Anyone (hoặc tùy chọn tương đương cho phép trang GitHub Pages gọi được).
  5) Copy URL kết thúc bằng /exec và dán vào config.js của website.

  Dữ liệu được lưu thành 2 file JSON trong Google Drive của tài khoản triển khai Apps Script.
*/

const ADMIN_PIN = 'DOI_MA_PIN_NAY';
const DATA_FOLDER = 'KiemTraThuThuatTimMach_OnlineData';
const STAFF_FILE = 'staff.json';
const RULES_FILE = 'rules.json';

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDataFolder_() {
  const it = DriveApp.getFoldersByName(DATA_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DATA_FOLDER);
}

function readJson_(name) {
  const folder = getDataFolder_();
  const it = folder.getFilesByName(name);
  if (!it.hasNext()) return null;
  const text = it.next().getBlob().getDataAsString('UTF-8');
  if (!text) return null;
  try { return JSON.parse(text); }
  catch (e) { throw new Error('File ' + name + ' bị lỗi JSON: ' + e.message); }
}

function writeJson_(name, data) {
  if (!data || !Array.isArray(data.items)) throw new Error('Dữ liệu không hợp lệ: thiếu items.');
  const folder = getDataFolder_();
  const text = JSON.stringify(data);
  const it = folder.getFilesByName(name);
  if (it.hasNext()) {
    const f = it.next();
    f.setContent(text);
    while (it.hasNext()) it.next().setTrashed(true);
  } else {
    folder.createFile(name, text, MimeType.PLAIN_TEXT);
  }
  return data;
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'getAll');
    if (action !== 'getAll') return jsonOut({ok:false,error:'Action không hợp lệ.'});
    return jsonOut({
      ok: true,
      staff: readJson_(STAFF_FILE),
      rules: readJson_(RULES_FILE),
      server_time: new Date().toISOString()
    });
  } catch (err) {
    return jsonOut({ok:false,error:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (String(body.pin || '') !== String(ADMIN_PIN)) return jsonOut({ok:false,error:'Sai mã PIN quản trị.'});
    if (body.action === 'saveStaff') return jsonOut({ok:true,data:writeJson_(STAFF_FILE, body.data),saved:'staff'});
    if (body.action === 'saveRules') return jsonOut({ok:true,data:writeJson_(RULES_FILE, body.data),saved:'rules'});
    return jsonOut({ok:false,error:'Action không hợp lệ.'});
  } catch (err) {
    return jsonOut({ok:false,error:String(err && err.message || err)});
  }
}
