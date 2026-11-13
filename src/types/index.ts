export type TransactionType = 'expense' | 'income';

/** 돈이 실제로 들어있는 곳 (잔액 집계 단위). 순서가 화면 표시 순서 */
export const PAYMENT_METHODS = ['우체국', '신한', '카카오페이', '현금'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** 계좌별 현재 잔액 (account_balances 뷰) */
export interface AccountBalance {
  name: string;
  base_balance: number; // 기준 시점 잔액 (직접 맞춘 값)
  base_at: string; // 이 시각 이후 거래만 잔액에 반영
  balance: number;
  tx_count: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  order_num: number;
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category_id?: string | null;
  category_name: string;
  payment_method: string; // 새 거래는 PaymentMethod, 예전 거래는 '토스'·'체크카드' 등이 남아 있을 수 있음
  memo: string;
  transacted_at: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  month: string; // 'YYYY-MM'
  target_amount: number;
  created_at?: string;
}

export interface MonthlyStats {
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  dailyAverageExpense: number;
  categoryBreakdown: {
    categoryName: string;
    amount: number;
    color: string;
    percentage: number;
  }[];
  dailyTrend: {
    day: string; // 'YYYY-MM-DD' or 'DD일'
    expense: number;
    income: number;
  }[];
}
