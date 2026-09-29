# Check-TTTM v47 FLAT

Bản GitHub Pages không có thư mục con. Tất cả file nằm ngay ở root repository.

## File bắt buộc
- `index.html`
- `style.css`
- `config.js`
- `app.js`
- `staff.json`
- `rules.json`
- `.nojekyll`

## Cách sửa lỗi treo “đang tải…”
Xóa/ghi đè bản cũ bằng toàn bộ file của gói này. Đặc biệt phải có `app.js`, `staff.json`, `rules.json` cùng cấp với `index.html`.

## Đồng bộ dữ liệu
- Danh sách nhân viên: `staff.json`
- Danh mục thủ thuật: `rules.json`
- Khi bấm cập nhật, ứng dụng dùng GitHub Contents API để commit trực tiếp vào nhánh `main`.
- Token không lưu trong source code; chỉ giữ trong `sessionStorage` của phiên trình duyệt.
- Thiết bị khác tải lại trang sẽ đọc dữ liệu mới từ GitHub API. Không cần chờ GitHub Pages build lại để đọc commit mới.

## Token
Fine-grained Personal Access Token cho repository `quy19956-sudo/Check-TTTM`, quyền `Contents: Read and write`.
