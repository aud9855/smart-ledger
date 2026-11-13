-- ==============================================================
-- Smart Ledger 계좌별 잔액 (우체국 / 신한 / 카카오페이 / 현금)
-- 잔액 = 기준 잔액(base_balance) + 기준 시각(base_at) 이후의 수입 - 지출
-- 앱에서 "잔액 맞추기"로 실제 잔액을 입력하면 base_balance와 base_at이 갱신된다.
-- Supabase 대시보드 -> SQL Editor -> [Run] 실행 (여러 번 실행해도 안전)
-- ==============================================================

create table if not exists public.accounts (
    name text primary key,               -- transactions.payment_method와 같은 값
    base_balance bigint not null default 0,
    base_at timestamptz not null default '1970-01-01T00:00:00Z',
    order_num integer not null default 0,
    created_at timestamptz default now()
);

insert into public.accounts (name, order_num)
values ('우체국', 1), ('신한', 2), ('카카오페이', 3), ('현금', 4)
on conflict (name) do nothing;

alter table public.accounts enable row level security;

-- 다른 테이블과 같은 정책 (보안 작업 때 함께 잠금 예정)
drop policy if exists "Allow all operations on accounts" on public.accounts;
create policy "Allow all operations on accounts" on public.accounts for all using (true) with check (true);

-- 계좌별 현재 잔액 뷰 (security_invoker: 조회하는 사람의 RLS 권한으로 실행)
create or replace view public.account_balances
with (security_invoker = true) as
select
    a.name,
    a.base_balance,
    a.base_at,
    a.order_num,
    a.base_balance
      + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance,
    count(t.id) as tx_count
from public.accounts a
left join public.transactions t
    on t.payment_method = a.name
   and t.transacted_at >= a.base_at
group by a.name, a.base_balance, a.base_at, a.order_num;

create index if not exists idx_transactions_payment_method on public.transactions (payment_method, transacted_at);
