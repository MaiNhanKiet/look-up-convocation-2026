import type { LedImageAccessResult, StudentRow } from "@/lib/types/student";

export const DEMO_LED_PATH = "demo:led";

const DEMO_LED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#FFF5E8"/>
  <rect x="28" y="28" width="904" height="484" fill="none" stroke="#F56A17" stroke-width="3"/>
  <circle cx="140" cy="270" r="72" fill="none" stroke="#F56A17" stroke-width="2"/>
  <circle cx="140" cy="270" r="44" fill="none" stroke="#1554E8" stroke-width="2"/>
  <text x="520" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#252525">HINH LED MINH HOA</text>
  <text x="520" y="296" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#5E5A55">Khong phai anh sinh vien</text>
</svg>`;

export const DEMO_LED_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEMO_LED_SVG)}`;

export const DEMO_STUDENTS: StudentRow[] = [
  {
    student_code: "HE260001",
    full_name: "Nguyễn An Demo",
    email: "an.demo@example.edu",
    seat_tcn: "A-128",
    seat_ph2: "B-014",
    checkin_zone: "Zone 1",
    checkin_waiting_room: "Phòng 101",
    led_image_key: DEMO_LED_PATH,
    session_label: "Đợt 1",
  },
  {
    student_code: "QE260014",
    full_name: "Trần Bình Demo",
    email: "binh.demo@example.edu",
    seat_tcn: "C-042",
    seat_ph2: "D-007",
    checkin_zone: "Zone 2",
    checkin_waiting_room: "Phòng 102",
    led_image_key: null,
    session_label: "Đợt 1",
  },
  {
    student_code: "QA260088",
    full_name: "Lê Chi Demo",
    email: null,
    seat_tcn: "E-015",
    seat_ph2: "F-221",
    checkin_zone: "Zone 3",
    checkin_waiting_room: "Phòng 201",
    led_image_key: null,
    session_label: "Đợt 2",
  },
  {
    student_code: "DS260210",
    full_name: "Phạm Dũng Demo",
    email: "dung.demo@example.edu",
    seat_tcn: "G-003",
    seat_ph2: null,
    checkin_zone: "Zone 1",
    checkin_waiting_room: "Phòng 202",
    led_image_key: null,
    session_label: "Đợt 2",
  },
  {
    student_code: "CS260333",
    full_name: "Hoàng Em Demo",
    email: "em.demo@example.edu",
    seat_tcn: null,
    seat_ph2: null,
    checkin_zone: "Zone 4",
    checkin_waiting_room: null,
    led_image_key: null,
    session_label: null,
  },
  {
    student_code: "SS260007",
    full_name: "Võ Phương Demo",
    email: null,
    seat_tcn: null,
    seat_ph2: null,
    checkin_zone: null,
    checkin_waiting_room: null,
    led_image_key: null,
    session_label: null,
  },
  {
    student_code: "SE161956",
    full_name: "Hồ Chí Trung",
    email: "ho.chi.trung@example.edu",
    seat_tcn: "A-056",
    seat_ph2: "B-112",
    checkin_zone: "Zone 1",
    checkin_waiting_room: "Phòng 101",
    led_image_key: "SE161956.png",
    session_label: "Đợt 1",
  },
];

export function findDemoStudent(code: string): StudentRow | null {
  return DEMO_STUDENTS.find((student) => student.student_code === code) ?? null;
}

export function signDemoLed(
  path: string,
): LedImageAccessResult {
  if (path === DEMO_LED_PATH) {
    return { status: "ready", url: DEMO_LED_URL, expiresAt: null };
  }
  return { status: "missing" };
}
