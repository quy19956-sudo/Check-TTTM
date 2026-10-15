# Kiểm tra thủ thuật Tim mạch v54 — 15/10/2026

Khoa thực hiện chỉ lấy từ cột **TENPMO**. Không so sánh TENKP với TENKHOACHIDINH để phát sinh lỗi hoặc cảnh báo.

## Quy định kiểm tra

| THOIGIAN trong danh mục | Số phút tối thiểu | Trùng giờ nhân viên | Nhân viên, ê-kíp, ngày giờ hợp lệ |
| --- | --- | --- | --- |
| Trên hoặc bằng N phút | Kiểm tra theo N | Kiểm tra | Kiểm tra |
| Không ấn định | Không áp mức tối thiểu | Kiểm tra bằng giờ bắt đầu/kết thúc thực tế | Kiểm tra |
| Không kiểm tra trùng giờ | Chỉ áp nếu ghi riêng mức tối thiểu | Miễn kiểm tra | Kiểm tra |

TENPMO xác định nơi thực hiện và phạm vi Nội Tim mạch/Phòng DSA. TENKP và TENKHOACHIDINH là thông tin khoa chỉ định, được giữ làm dữ liệu nguồn khi xuất Excel; chúng không được dùng để suy ra lỗi khoa thực hiện.

Một ca kết thúc đúng lúc ca kế tiếp bắt đầu không bị tính chồng giờ. Ca qua nửa đêm phải có ngày kết thúc đúng. Tên nhập sai nhưng mã nhân viên vẫn có trong danh sách không làm mất việc kiểm tra trùng giờ theo mã đó. Các cặp cột tên cùng vị trí, ví dụ HOTEN6/HT8, được kiểm tra thống nhất.

## Kết quả trên hai Excel được cung cấp

- Đọc 46.400 bản ghi tại sheet rptDspttt, kiểm tra 1.616 bản ghi trong phạm vi. 44.784 bản ghi ngoài phạm vi không được kiểm tra đầy đủ theo danh sách nhân viên Tim mạch.
- Danh sách tham chiếu gồm 46 nhân viên tích hợp trong v52. Danh mục gồm 44 dòng từ Excel được cung cấp.
- Kết quả v54: 25 lỗi và 10 cảnh báo, tổng 35 vấn đề trên 24 dòng nguồn. Giữ đủ 23 lỗi từng phát hiện trong v52.
- Đã bỏ toàn bộ 26 cảnh báo không đúng trong v53 do so sánh hai cột khoa chỉ định.
- Dòng 17468 có TENPMO = Phòng DSA: không có lỗi/cảnh báo. TENKP khác TENKHOACHIDINH không làm phát sinh vấn đề.
- Dòng 17466 và 17467: ngày 20/06/2026, ca 15:05–21:50 chồng ca 16:20–17:25, cùng 5 nhân viên. Có 5 nhóm, mỗi nhóm gồm 2 dòng cảnh báo.
- Dòng 17469: HOTEN6 ghi 0811 Trần Đức cửng, HT8 ghi Trần Đức Hải, trong khi danh sách nhân viên ghi 0411 Trần Đức Hải. Báo sai mã/tên và tên không thống nhất giữa các cột.

Ngày/tháng được giữ nguyên cách đọc trong lần đối chiếu này; không bật tùy chọn điều chỉnh ngày/tháng. Chương trình không sửa hai tệp Excel nguồn.

## Đưa bản sửa lên GitHub Pages

Giải nén và thay các tệp ở thư mục gốc website hiện tại: index.html, app.js, style.css, config.js, excel-worker.js, worker-client.js, xlsx-loader.js và .nojekyll. Sau khi cập nhật, tải lại trang và kiểm tra phiên bản hiển thị v54.

rules.json là danh mục 44 dòng lấy từ Excel được cung cấp. Chỉ thay danh mục nếu đây là bản đang muốn áp dụng. staff.json là danh sách tích hợp; nếu website có danh sách nhân viên mới hơn đã được xác nhận thì giữ danh sách mới đó. Chức năng nhập token một lần để cập nhật tham chiếu được giữ nguyên. Không có token nằm trong gói này.

Mở tệp Excel ở trang Làm việc rồi bấm Kiểm tra. Lọc Dòng nguồn bằng 17466 hoặc 17469 để đối chiếu lỗi. Lọc 17468 sẽ không có lỗi/cảnh báo. Nút Tải Excel xuất toàn bộ kết quả, không chỉ các dòng đang được lọc.

## Kiểm thử

node self_test.cjs chạy 33 kiểm thử logic, không cần mạng hoặc dữ liệu bệnh nhân. Kết quả đối chiếu tệp thực tế và giới hạn kiểm thử giao diện được ghi tại KIEM_THU_V54.txt.
