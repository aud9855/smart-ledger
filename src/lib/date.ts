// ==========================================
// 날짜 유틸 (기기 로컬 시간대 기준)
// transacted_at은 실제 시각(UTC ISO)으로 저장되므로,
// 화면 표시/집계용 날짜는 반드시 로컬 시간대로 변환해서 사용한다.
// ==========================================

const pad = (n: number) => String(n).padStart(2, '0');

/** 로컬 시간대 기준 'YYYY-MM-DD' */
export function toLocalDateKey(input: string | Date = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD'를 로컬 자정 Date로 파싱 */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 선택한 날짜(dateKey)에 timeSource(기본: 현재)의 시각을 붙여 transacted_at(ISO)을 만든다.
 * 오늘 날짜 + 기본값이면 결과는 현재 시각과 같다.
 */
export function buildTransactedAt(dateKey: string, timeSource: Date = new Date()): string {
  const base = parseLocalDateKey(dateKey);
  base.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds()
  );
  return base.toISOString();
}

// ==========================================
// 집계 기간 (월급날 기준 / 1일~말일 기준)
// 월급날 기준: 'YYYY-MM' 기간 = 전월 월급날 ~ 이번 달 월급날 전날
//   예) 2026-11 기간 = 10/30(금, 10월 마지막 평일) ~ 11/29
// ==========================================

export type PeriodMode = 'payday' | 'calendar';

/** 월급 받는 달('YYYY-MM') → 직접 수정한 월급날('YYYY-MM-DD') (공휴일 등) */
export type PaydayOverrides = Record<string, string>;

/** 'YYYY-MM'에서 delta개월 이동 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** 해당 월의 마지막 평일(월~금) 로컬 자정 */
export function getLastWeekday(yearMonth: string): Date {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/** 해당 월의 월급날: 직접 수정한 날짜가 있으면 그 날짜, 없으면 마지막 평일 */
export function getPayday(yearMonth: string, overrides: PaydayOverrides): Date {
  const override = overrides[yearMonth];
  return override ? parseLocalDateKey(override) : getLastWeekday(yearMonth);
}

/** 'YYYY-MM' 기간의 로컬 시간대 기준 [start, end) 범위 */
export function getPeriodRange(
  yearMonth: string,
  mode: PeriodMode,
  overrides: PaydayOverrides
): { start: Date; end: Date } {
  if (mode === 'calendar') {
    const [year, month] = yearMonth.split('-').map(Number);
    return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
  }
  return {
    start: getPayday(shiftMonth(yearMonth, -1), overrides),
    end: getPayday(yearMonth, overrides),
  };
}

/** 오늘이 속한 기간의 'YYYY-MM' (월급날 기준이면 이번 달 월급날부터 다음 달 기간) */
export function getCurrentPeriodLabel(
  mode: PeriodMode,
  overrides: PaydayOverrides,
  now: Date = new Date()
): string {
  const thisMonth = toLocalDateKey(now).slice(0, 7);
  if (mode === 'calendar') return thisMonth;
  return now >= getPayday(thisMonth, overrides) ? shiftMonth(thisMonth, 1) : thisMonth;
}
