# Hướng Dẫn Chạy Thử Demo

Bạn chỉ cần dùng máy Windows có Internet.

1. Tải branch `feature/free-hybrid-demo` của dự án về máy. Có thể dùng GitHub Desktop để Clone, hoặc tải ZIP và giải nén.
2. Mở thư mục vừa tải về.
3. Nhấn đúp file `START_DEMO.bat`.
4. Nếu Windows hỏi cài Node.js hoặc Java 21 lần đầu, chọn đồng ý và chạy lại `START_DEMO.bat` khi cài xong.
5. Khi hỏi `Admin email`, có thể để trống để test vai trò người học. Muốn test Admin, nhập đúng email sẽ dùng để đăng nhập. Sau khi đăng nhập bằng email đó, menu `Quản trị` sẽ tự hiện trên thanh đầu trang.
6. Trình duyệt sẽ tự mở tại `http://localhost:5173`.

## Đăng Nhập Và Test

- Có thể đăng ký bằng email thật của bạn, sau đó dùng nút `Quên mật khẩu` để nhận email đặt lại mật khẩu.
- Có thể đăng nhập bằng Google. Mỗi người dùng tài khoản Google của mình.
- Nếu chưa thấy email đặt lại mật khẩu, kiểm tra thư mục Spam/Thư rác.
- Không dùng chung một tài khoản email và mật khẩu với người khác.

## Khi Kết Thúc

Đóng hai cửa sổ đen có tên `ML Path Local Services` và `ML Path Web` để dừng demo.

Dữ liệu học và thay đổi trong Firestore/Storage của demo nằm trên máy bạn. Lần chạy demo tiếp theo sẽ tạo lại dữ liệu mẫu. Tài khoản Firebase, Google đăng nhập và email đặt lại mật khẩu vẫn dùng Firebase thật.

## Nếu Không Mở Được

- Nếu BAT báo thiếu Java sau khi vừa cài, đóng cửa sổ và chạy lại `START_DEMO.bat`.
- Nếu trình duyệt không tự mở, vào `http://localhost:5173`.
- Nếu vẫn lỗi, chụp ảnh cả màn hình có dòng `ERROR` và gửi cho chủ dự án.
