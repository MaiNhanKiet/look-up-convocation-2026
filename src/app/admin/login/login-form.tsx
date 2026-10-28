"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/admin/actions";
import { inputClass, primaryButton } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Mật khẩu quản trị</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          autoFocus
          className={inputClass}
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[#b42318]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
