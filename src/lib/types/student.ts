export type StudentRow = {
  student_code: string;
  full_name: string;
  email: string | null;
  seat_tcn: string | null;
  seat_ph2: string | null;
  checkin_time: string | null;
  checkin_room: string | null;
  award_time: string | null;
  contact_group: string | null;
  invitation_link: string | null;
  drive_link: string | null;
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
  /** False when PUBLIC_EMAIL_MODE=hidden — UI omits the email row entirely. */
  emailShown: boolean;
  seatTcn: string | null;
  seatPh2: string | null;
  checkinTime: string | null;
  checkinRoom: string | null;
  awardTime: string | null;
  contactGroup: string | null;
  invitationLink: string | null;
  driveLink: string | null;
  ledExternalUrl: string | null;
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

export type LedImageRefresh =
  | {
      ok: true;
      ledImageUrl: string;
      ledImageExpiresAt: number;
      ledImageStatus: "ready";
    }
  | { ok: false; ledImageStatus: Exclude<LedImageStatus, "ready"> };
