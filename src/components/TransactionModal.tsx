import React, { useState, useEffect } from 'react';
import { Transaction, Category, TransactionType, PAYMENT_METHODS } from '../types';
import { X } from 'lucide-react';
import { buildTransactedAt, toLocalDateKey } from '../lib/date';
import { DuplicateTransactionError } from '../lib/supabase';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Partial<Transaction>) => Promise<void>;
  transaction?: Transaction | null;
  categories: Category[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transaction,
  categories,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [memo, setMemo] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount);
      setCategoryName(transaction.category_name);
      setCategoryId(transaction.category_id || '');
      setPaymentMethod(transaction.payment_method);
      setMemo(transaction.memo || '');
      setDate(toLocalDateKey(transaction.transacted_at));
    } else {
      setType('expense');
      setAmount(0);
      const defaultCat = categories.find(c => c.type === 'expense');
      setCategoryName(defaultCat?.name || '식비');
      setCategoryId(defaultCat?.id || '');
      setPaymentMethod(PAYMENT_METHODS[0]);
      setMemo('');
      setDate(toLocalDateKey());
    }
  }, [transaction, categories, isOpen]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('금액을 올바르게 입력해주세요.');
      return;
    }
    if (!categoryName) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 신규: 실제 시각 반영 / 수정: 날짜가 그대로면 원래 시각 유지, 바뀌면 원래 시:분:초를 새 날짜에 적용
      let transactedAt: string;
      if (!transaction) {
        transactedAt = buildTransactedAt(date);
      } else if (date === toLocalDateKey(transaction.transacted_at)) {
        transactedAt = transaction.transacted_at;
      } else {
        transactedAt = buildTransactedAt(date, new Date(transaction.transacted_at));
      }

      await onSave({
        ...(transaction ? { id: transaction.id } : {}),
        type,
        amount,
        category_name: categoryName,
        category_id: categoryId || undefined,
        payment_method: paymentMethod,
        memo: memo.trim(),
        transacted_at: transactedAt,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert(err instanceof DuplicateTransactionError ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800">
            {transaction ? '거래 내역 수정' : '새 거래 내역 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 타입 선택 */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const first = categories.find(c => c.type === 'expense');
                if (first) {
                  setCategoryName(first.name);
                  setCategoryId(first.id);
                }
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const first = categories.find(c => c.type === 'income');
                if (first) {
                  setCategoryName(first.name);
                  setCategoryId(first.id);
                }
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              수입
            </button>
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">금액 (원)</label>
            <input
              type="number"
              min="1"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="금액을 입력하세요"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold text-lg outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">카테고리</label>
            <select
              value={categoryId}
              onChange={e => {
                const selected = categories.find(c => c.id === e.target.value);
                if (selected) {
                  setCategoryId(selected.id);
                  setCategoryName(selected.name);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm outline-none focus:border-indigo-500 focus:bg-white transition"
            >
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 결제 수단 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">결제 수단</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm outline-none focus:border-indigo-500 focus:bg-white transition"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {/* 예전 결제수단(토스 등)으로 저장된 거래는 그 값도 선택지에 남겨 둠 */}
              {!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod) && (
                <option value={paymentMethod}>{paymentMethod} (예전 수단)</option>
              )}
            </select>
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">결제 일자</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">메모 (선택사항)</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="상호명이나 비고 입력"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
