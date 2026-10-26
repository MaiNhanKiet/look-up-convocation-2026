export type StudentRow = {
  student_code: string;
  full_name: string;
  email: string | null;
  seat_tcn: string | null;
  seat_ph2: string | null;
  checkin_zone: string | null;
  checkin_waiting_room: string | null;
  led_image_key: string | null;
  session_label: string | null;
};

export type LedImageStatus = "ready" | "missing" | "unavailable";

export type LedImageAccessResult =
  | {
      status: "ready";
      url: string;
      expiresAt: number | null;
    }
  | { status: Exclude<LedImageStatus, "ready"> };

export type PublicStudent = {
  fullName: string;
  studentCode: string;
  email: string | null;
  emailRevealable: boolean;
  seatTcn: string | null;
  seatPh2: string | null;
  checkinZone: string | null;
  checkinWaitingRoom: string | null;
  ledImageUrl: string | null;
  ledImageExpiresAt: number | null;
  ledImageStatus: LedImageStatus;
  sessionLabel: string | null;
  demo: boolean;
};

export type LookupErrorCode =
  | "INVALID_PAYLOAD"
  | "INVALID_STUDENT_CODE"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TURNSTILE_FAILED"
  | "UNAVAILABLE"
  | "SERVER_ERROR";

export type LookupResponse =
  | { ok: true; student: PublicStudent }
  | {
      ok: false;
      error: {
        code: LookupErrorCode;
        message: string;
        retryAfterSeconds?: number;
      };
    };
