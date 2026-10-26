export type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function remainingUntil(target: number | null, now: number): RemainingTime {
  if (target == null || now >= target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let total = Math.floor((target - now) / 1000);
  const days = Math.floor(total / 86_400);
  total -= days * 86_400;
  const hours = Math.floor(total / 3_600);
  total -= hours * 3_600;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return { days, hours, minutes, seconds };
}
