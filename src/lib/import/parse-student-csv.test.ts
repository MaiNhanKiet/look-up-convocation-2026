import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseStudentCsv } from "@/lib/import/parse-student-csv";

describe("parseStudentCsv", () => {
  it("normalizes codes, blanks, and a utf-8 bom", () => {
    const parsed = parseStudentCsv(
      "\uFEFFstudent_code,full_name,email,seat_tcn,seat_ph2,checkin_time,checkin_room,award_time,contact_group,link_thu_moi,led_image_path,session_label\nhe123456,Nguyễn An,an@example.edu,A-1,,07:00,Phòng 101,08:30,https://example.com/nhom-01,https://example.com/thu-moi/HE123456, ,Đợt 1\n",
    );
    assert.equal(parsed.issues.length, 0);
    assert.equal(parsed.students.length, 1);
    assert.equal(parsed.students[0]?.student_code, "HE123456");
    assert.equal(parsed.students[0]?.full_name, "Nguyễn An");
    assert.equal(parsed.students[0]?.seat_ph2, null);
    assert.equal(parsed.students[0]?.checkin_time, "07:00");
    assert.equal(parsed.students[0]?.checkin_room, "Phòng 101");
    assert.equal(parsed.students[0]?.award_time, "08:30");
    assert.equal(
      parsed.students[0]?.contact_group,
      "https://example.com/nhom-01",
    );
    assert.equal(
      parsed.students[0]?.invitation_link,
      "https://example.com/thu-moi/HE123456",
    );
    assert.equal(parsed.students[0]?.led_image_key, null);
  });

  it("keeps the last duplicate and reports invalid rows", () => {
    const parsed = parseStudentCsv(
      [
        "student_code,full_name,email",
        "QE123456,Trần Bình,binh@example.edu",
        "QE123456,Trần Bình Mới,binh.moi@example.edu",
        "XE123456,Sai Mã,sai@example.edu",
        "QA123456,,qa@example.edu",
        "DS123456,Phạm Dũng,khong-phai-email",
      ].join("\n"),
    );

    assert.equal(parsed.duplicateCount, 1);
    assert.equal(parsed.students.length, 1);
    assert.equal(parsed.students[0]?.full_name, "Trần Bình Mới");
    assert.deepEqual(
      parsed.issues.map((issue) => issue.reason),
      ["MSSV không đúng định dạng.", "Thiếu họ và tên.", "Email không đúng định dạng."],
    );
    assert.equal(JSON.stringify(parsed.issues).includes("khong-phai-email"), false);
  });
});
