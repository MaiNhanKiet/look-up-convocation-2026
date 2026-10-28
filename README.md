# FPTU Convocation Day 2026 — Tra cứu thông tin tốt nghiệp

Website tra cứu thông tin tham dự lễ tốt nghiệp theo mã số sinh viên. Sinh viên nhập MSSV, máy chủ kiểm tra định dạng và trả về đúng một bản ghi.

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

Nếu chưa có `DATABASE_URL`, `npm run dev` dùng dữ liệu minh họa và gắn nhãn rõ trên trang. Dữ liệu này không xuất hiện ở bản production. Mã dùng thử: `SE161956`, `HE260001`, `QE260014`, `QA260088`, `DS260210`, `CS260333`, `SS260007`. Dùng `SS260007` để kiểm tra giao diện khi toàn bộ thông tin không bắt buộc và hình LED đang cập nhật.

## Biến môi trường

Sao chép `.env.example` thành `.env.local`.

| Biến | Vai trò |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL tự host. Chỉ dùng trên server. |
| `MINIO_ENDPOINT` | Host MinIO nội bộ. Trên máy host dùng `127.0.0.1`. Trong Docker, giá trị loopback được đổi thành service `minio`. |
| `MINIO_PORT` | Cổng API MinIO. Mặc định `9000`. |
| `MINIO_USE_SSL` | `true` khi MinIO dùng HTTPS. |
| `MINIO_ACCESS_KEY` | Access key MinIO. Chỉ dùng trên server. |
| `MINIO_SECRET_KEY` | Secret key MinIO. Chỉ dùng trên server. |
| `MINIO_BUCKET` | Bucket chứa hình LED. Mặc định `led-images`. |
| `MINIO_PUBLIC_ENDPOINT` | Origin HTTPS công khai để ký Presigned URL. Để trống thì Next.js proxy ảnh, không trả host `127.0.0.1`. |
| `NEXT_PUBLIC_HERO_ANIMATION_INTERVAL_MS` | Chu kỳ phát lại hiệu ứng mũi tên và slogan, tính bằng mili giây. Mặc định `5000`, tối thiểu `3500`. |
| `PUBLIC_EMAIL_MODE` | `full` (mặc định) cho phép người tra cứu bấm hiện email; `masked` luôn che địa chỉ và ẩn nút hiện. |
| `RATE_LIMIT_SALT` | Chuỗi ngẫu nhiên để băm địa chỉ IP trước khi lưu hạn mức. |
| `LOOKUP_RATE_LIMIT` | Số lần tra cứu trong một cửa sổ. Mặc định 8. |
| `LOOKUP_RATE_WINDOW_SECONDS` | Độ dài cửa sổ. Mặc định 60 giây. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bật widget Cloudflare Turnstile khi có lưu lượng bất thường. |
| `TURNSTILE_SECRET_KEY` | Secret tương ứng. Khi có secret, API từ chối request không qua được Turnstile. |
| `MAINTENANCE_MODE` | `true`, `1` hoặc `yes` giữ giao diện trang và thay ô tra cứu bằng thông báo bảo trì. |
| `MAINTENANCE_REOPEN_AT` | Giờ mở lại theo giờ Việt Nam, dạng `HH-DD-MM-YYYY`. Ví dụ `13-25-10-2026` là 13:00 ngày 25/10/2026. Hết giờ này thì đồng hồ về 00. |
| `CORRECTION_FORM_URL` | Link form `http` hoặc `https` của nút "Gửi yêu cầu chỉnh sửa". Để trống thì ẩn nút. |
| `ADMIN_PASSWORD` | Mật khẩu trang quản trị `/admin` (tối thiểu 8 ký tự). Để trống thì tắt trang quản trị. |
| `ADMIN_SESSION_SECRET` | Tuỳ chọn. Khoá ký cookie phiên quản trị; mặc định suy ra từ `ADMIN_PASSWORD`. |

## Trang quản trị

Truy cập `/admin` và đăng nhập bằng `ADMIN_PASSWORD` (phiên 12 giờ, cookie `httpOnly`).

- **Tổng quan**: lượt tra cứu theo ngày/giờ, độ phủ tra cứu, mức đầy đủ từng trường, phân bổ theo phiên/phòng/giờ, trùng ghế, link sai, MSSV được tìm nhưng chưa có trong danh sách, trạng thái hệ thống.
- **Sinh viên**: tìm kiếm, lọc, thêm, sửa, xoá, xuất CSV theo bộ lọc.
- **Nhập CSV**: kiểm tra trước rồi nhập (upsert theo MSSV).
- **Nhật ký**: lượt tra cứu (chỉ lưu MSSV và kết quả, không lưu IP) và thay đổi của quản trị viên.

Thống kê tra cứu bắt đầu ghi từ khi chạy migration `add_admin_analytics`.

## PostgreSQL

1. Tạo database trên PostgreSQL tự host.
2. Đặt `DATABASE_URL` trong `.env`.
3. Áp schema:

```bash
npx prisma migrate deploy
```

Bảng `students` chỉ được máy chủ đọc qua Prisma. Hạn mức tra cứu nằm ở `lookup_rate_limits`.

`led_image_key` là khóa object trong bucket MinIO, ví dụ `SE161956.png`. Server tạo Presigned URL 10 phút khi đã có domain công khai. Chưa có domain thì trình duyệt nhận đường dẫn proxy cùng site. URL không được lưu vào database.

## Import khoảng 3.000 sinh viên

CSV UTF-8, có hoặc không có BOM. Dòng tiêu đề:

```text
student_code,full_name,email,seat_tcn,seat_ph2,checkin_time,checkin_room,award_time,contact_group,led_image_key,session_label
```

`student_code` và `full_name` là bắt buộc. Ô trống được lưu thành null. Script chuẩn hóa MSSV, bỏ dòng sai, giữ bản ghi cuối nếu MSSV lặp trong file, rồi upsert theo `student_code`.

```bash
npm run import:students -- ./data/students.csv
```

File mẫu định dạng: `scripts/students.example.csv`. Không commit danh sách sinh viên thật. Thư mục `data/*.csv` đã được ignore.

Script đọc `.env.local` rồi `.env`, không ghi đè biến đã có trong môi trường, và không in email ra log.

## Deploy Vercel

1. Import repository vào Vercel. Framework preset: Next.js.
2. Thêm các biến ở trên trong Project Settings → Environment Variables. Không thêm secret vào biến `NEXT_PUBLIC_`.
3. Deploy. Bản production không có dữ liệu minh họa. Nếu thiếu `DATABASE_URL`, tra cứu trả về thông báo hệ thống chưa sẵn sàng.
4. Chạy `npx prisma migrate deploy` và import CSV từ máy được tin cậy trước khi mở link cho sinh viên.

## Kiểm thử

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

MSSV hợp lệ có đúng 8 ký tự: `^[HQDSC][EAS][0-9]{6}$`.

## Tài nguyên thiết kế

- `public/fonts/`: Axiforma Book, Axiforma Book Italic, SVN-Billy Bold, UTM Micra.

Axiforma, SVN-Billy và UTM Micra dùng cho chữ tiếng Anh ngắn và nhãn sự kiện. Nội dung tiếng Việt dùng Be Vietnam Pro, vì các font hiển thị được cung cấp không phủ đủ dấu tiếng Việt. Trình duyệt vẫn fallback từng glyph nếu một font thiếu ký tự.

Header dùng wordmark chữ, không dùng logo ảnh.
