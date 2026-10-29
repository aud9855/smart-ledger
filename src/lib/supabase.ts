import { createClient } from '@supabase/supabase-js';
import { Transaction, Category, Budget } from '../types';
import { PaydayOverrides } from './date';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 거래 내역 (Transactions) API
// ==========================================

/** [start, end) 기간의 거래 내역 (start/end는 getPeriodRange의 로컬 시간대 기준 Date) */
export async function getTransactionsInRange(start: Date, end: Date): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transacted_at', start.toISOString())
    .lt('transacted_at', end.toISOString())
    .order('transacted_at', { ascending: false });

  if (error) {
    console.error('거래 내역 조회 실패:', error);
    throw error;
  }
  return data || [];
}

/** DB 트리거(process_transaction_automation)가 중복으로 판정해 INSERT를 취소한 경우 */
export class DuplicateTransactionError extends Error {
  constructor() {
    super('중복 거래로 판단되어 저장되지 않았습니다.');
    this.name = 'DuplicateTransactionError';
  }
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .maybeSingle();

  if (error) {
    console.error('거래 내역 생성 실패:', error);
    throw error;
  }
  if (!data) {
    // BEFORE INSERT 트리거가 null을 반환하면 0건이 저장됨
    throw new DuplicateTransactionError();
  }
  return data;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('거래 내역 수정 실패:', error);
    throw error;
  }
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('거래 내역 삭제 실패:', error);
    throw error;
  }
}

// ==========================================
// 카테고리 (Categories) API
// ==========================================

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order_num', { ascending: true });

  if (error) {
    console.error('카테고리 목록 조회 실패:', error);
    throw error;
  }
  return data || [];
}

// ==========================================
// 예산 (Budgets) API
// ==========================================

export async function getBudgetByMonth(yearMonth: string): Promise<number> {
  const { data, error } = await supabase
    .from('budgets')
    .select('target_amount')
    .eq('month', yearMonth)
    .maybeSingle();

  if (error) {
    console.error('예산 조회 실패:', error);
    return 0;
  }
  return data?.target_amount || 0;
}

export async function setBudgetForMonth(yearMonth: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .upsert({ month: yearMonth, target_amount: amount }, { onConflict: 'month' });

  if (error) {
    console.error('예산 설정 실패:', error);
    throw error;
  }
}

// ==========================================
// 월급날 직접 수정 (Payday Overrides) API
// payday_overrides 테이블은 schema_payday.sql로 생성
// ==========================================

export async function getPaydayOverrides(): Promise<PaydayOverrides> {
  const { data, error } = await supabase.from('payday_overrides').select('month, payday');

  if (error) {
    // 테이블이 아직 없으면 자동 계산(마지막 평일)만 사용
    console.warn('월급날 수정 내역 조회 실패 (schema_payday.sql 실행 여부 확인):', error);
    return {};
  }
  return Object.fromEntries((data || []).map(row => [row.month, row.payday]));
}

/** payday가 null이면 수정 내역을 지우고 자동 계산(마지막 평일)으로 되돌린다 */
export async function setPaydayOverride(month: string, payday: string | null): Promise<void> {
  const { error } = payday
    ? await supabase.from('payday_overrides').upsert({ month, payday }, { onConflict: 'month' })
    : await supabase.from('payday_overrides').delete().eq('month', month);

  if (error) {
    console.error('월급날 수정 실패:', error);
    throw error;
  }
}
