# Kiểm Tra Thủ Thuật Tim Mạch — GitHub Pages / GitHub Sync v46

Ứng dụng chạy bằng HTML/CSS/JavaScript trên GitHub Pages.

## Điểm mới v46

Danh sách nhân viên và danh mục thủ thuật **không còn lưu bằng Google Apps Script/Google Drive**.
Khi cập nhật từ Excel, ứng dụng commit trực tiếp vào chính repository GitHub:

- `data/staff.json`
- `data/rules.json`

Mọi thiết bị mở cùng trang GitHub Pages sẽ đọc lại hai file này và dùng chung dữ liệu.

## Repository mặc định

- Owner: `quy19956-sudo`
- Repo: `Check-TTTM`
- Branch: `main`

Có thể đổi trong `config.js`.

## Quyền ghi

GitHub Pages là trang tĩnh nên muốn ghi ngược vào repository phải xác thực với GitHub API.
Bản này yêu cầu **Fine-grained Personal Access Token** khi người quản trị bấm cập nhật.

Token nên:
- chỉ được cấp cho repo `Check-TTTM`;
- chỉ có `Contents: Read and write`;
- không ghi token vào `config.js` hoặc bất kỳ file nào trong repo.

Ứng dụng chỉ giữ token trong `sessionStorage` của phiên trình duyệt.

Xem `CAI_DAT_LUU_GITHUB.txt` để cài đặt.

## GitHub Pages

1. Upload toàn bộ nội dung thư mục lên nhánh `main`.
2. `index.html` phải ở thư mục gốc.
3. `Settings -> Pages -> Deploy from a branch`.
4. Chọn `main` và `/(root)`.

## Quyền riêng tư

File Excel bệnh nhân dùng để kiểm tra chỉ được xử lý trong trình duyệt, không commit lên GitHub.

**Lưu ý:** nếu repository là Public thì `data/staff.json` và `data/rules.json` cũng có thể được xem công khai.
