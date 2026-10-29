-- ==============================================================
-- Smart Ledger 월급날 직접 수정 테이블
-- 기본 월급날은 앱에서 "매월 마지막 평일"로 자동 계산하고,
-- 공휴일 등으로 월급날이 달라진 달만 이 테이블에 저장한다.
-- Supabase 대시보드 -> SQL Editor -> [Run] 실행
-- ==============================================================

create table if not exists public.payday_overrides (
    month text primary key,      -- 월급 받는 달, 형식: 'YYYY-MM'
    payday date not null,        -- 실제 월급날
    created_at timestamptz default now()
);

alter table public.payday_overrides enable row level security;

-- 다른 테이블과 같은 정책 (보안 작업 때 함께 잠금 예정)
drop policy if exists "Allow all operations on payday_overrides" on public.payday_overrides;
create policy "Allow all operations on payday_overrides" on public.payday_overrides for all using (true) with check (true);
