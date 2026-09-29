# Kiểm Tra Thủ Thuật Tim Mạch — GitHub Pages (không Python)

Bản này chạy hoàn toàn bằng **HTML/CSS/JavaScript** trên GitHub Pages. Không cần cài Python, Flask hay máy chủ riêng.

## Cách đưa lên GitHub

1. Tạo repository GitHub.
2. Tải **toàn bộ nội dung trong thư mục này** lên nhánh `main`, giữ nguyên cấu trúc thư mục. `index.html` phải nằm ở thư mục gốc của repository.
3. Mở **Settings → Pages**.
4. Trong **Build and deployment**, chọn **Deploy from a branch**.
5. Chọn branch `main`, folder `/(root)`, rồi **Save**.
6. Mở đường link GitHub Pages mà GitHub cung cấp.

File `.nojekyll` đã có sẵn. Không cần thêm file cấu hình hay GitHub Actions.

## Chức năng

- Đọc file làm việc `.xlsx` và `.xls` ngay trong trình duyệt.
- Cập nhật danh sách nhân viên và danh mục thủ thuật từ Excel.
- Lưu danh sách/danh mục cập nhật trong `localStorage` của trình duyệt.
- Kiểm tra cặp **Mã NV + Họ tên**, TENPMO, danh mục thủ thuật, thiếu/dư vị trí, số người, thời gian tối thiểu, trùng thủ thuật và trùng giờ nhân viên.
- Hiển thị kết quả có bộ lọc, in A4 ngang và xuất báo cáo `.xlsx`.
- File Excel làm việc được xử lý **trên thiết bị**, không được gửi lên máy chủ ứng dụng.

## Điểm khác với bản Python v44

- Bản GitHub Pages này **không đọc PDF**. Phần đọc bảng PDF của bản cũ dùng xử lý phía Python; bản web tĩnh tập trung vào Excel.
- Với file Excel rất lớn, trình duyệt phải nạp workbook vào bộ nhớ nên điện thoại cũ có thể chậm hơn bản Python trên máy tính.
- Danh sách/danh mục do người dùng cập nhật chỉ nằm trên thiết bị/trình duyệt hiện tại. Đổi thiết bị hoặc xóa dữ liệu website sẽ quay về dữ liệu mặc định đi kèm.
- Thư viện SheetJS được nạp từ jsDelivr khi mở trang, vì vậy lần đầu sử dụng cần có kết nối Internet.

## Lưu ý khi dùng GitHub Pages

GitHub Pages là website có thể truy cập qua Internet. **Không đưa file bệnh nhân, báo cáo kết quả hoặc dữ liệu nhạy cảm vào repository.** Chỉ chọn các file đó từ nút tải file trong ứng dụng; trình duyệt sẽ xử lý cục bộ.

Gói hiện tại giữ dữ liệu danh sách nhân viên mặc định từ bản v44 để ứng dụng hoạt động giống bản cũ. Nếu repository/site của bạn công khai, các tên/mã nhân viên nằm trong mã nguồn cũng có thể được xem từ Internet. Nếu cần triển khai công khai, nên xóa dữ liệu nhân viên mặc định và cập nhật danh sách trực tiếp trong trình duyệt sau khi mở app.


## Bản Online v45

Gói này có thêm `config.js`, `js/online_store.js` và `backend/Code.gs` để lưu danh sách nhân viên/danh mục thủ thuật online bằng Google Apps Script + Google Drive. Xem `CAI_DAT_LUU_ONLINE.txt`.
