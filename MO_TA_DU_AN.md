# Nền Tảng Web Học Tập Tương Tác Machine Learning

Đây là nền tảng web hỗ trợ tự học Machine Learning bằng bài học, bài kiểm tra, playground trực quan và theo dõi tiến độ.

## Chức Năng Chính

- Đăng ký/đăng nhập bằng Email-Password hoặc Google.
- Gửi email đặt lại mật khẩu qua Firebase Authentication.
- Học bài lý thuyết, làm quiz và ghi nhận tiến độ.
- Thử nghiệm các thuật toán Machine Learning, thay đổi tham số và xem kết quả trực quan.
- Quản lý nội dung qua vai trò Admin khi chạy demo với email Admin được chọn.

## Cách Chạy Cho Bạn Bè

Branch này được tạo để mọi người tự chạy trên máy của mình bằng `START_DEMO.bat`.

- Đăng nhập Google và email đặt lại mật khẩu dùng Firebase Authentication thật của dự án.
- Functions, Firestore và Storage chạy local trên từng máy bằng Firebase Emulator Suite.
- Vì vậy máy của chủ dự án không cần bật trong lúc bạn test.
- Dữ liệu học của các máy khác nhau không tự động chia sẻ với nhau.

Xem [HUONG_DAN_BAN_BE_TEST.md](HUONG_DAN_BAN_BE_TEST.md) để chạy demo.
