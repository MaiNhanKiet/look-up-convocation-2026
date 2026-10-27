export const copy = {
  updating: "Đang cập nhật",
  emptyCode: "Vui lòng nhập mã số sinh viên.",
  invalidCode: "MSSV sai định dạng. Hãy thử lại nhé.",
  invalidPayload: "Dữ liệu gửi lên không hợp lệ.",
  notFound:
    "Chưa tìm thấy thông tin của bạn. Hãy kiểm tra lại mã số sinh viên nhé.",
  server: "Hệ thống đang gặp sự cố vui lòng thử lại.",
  unavailable: "Hệ thống tra cứu chưa sẵn sàng. Vui lòng thử lại sau.",
  turnstile: "Không thể xác minh yêu cầu. Vui lòng thử lại.",
} as const;

export function rateLimitMessage(seconds: number): string {
  return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${seconds} giây.`;
}
