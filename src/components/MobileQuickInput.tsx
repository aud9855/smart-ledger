import React, { useState } from 'react';
import { TransactionType, PaymentMethod, Category, PAYMENT_METHODS } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { buildTransactedAt, toLocalDateKey } from '../lib/date';
import { DuplicateTransactionError } from '../lib/supabase';
import { Delete, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface MobileQuickInputProps {
  categories: Category[];
  onSubmit: (transaction: {
    type: TransactionType;
    amount: number;
    category_name: string;
    category_id?: string;
    payment_method: PaymentMethod;
    memo: string;
    transacted_at: string;
  }) => Promise<void>;
}

export const MobileQuickInput: React.FC<MobileQuickInputProps> = ({ categories, onSubmit }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [memo, setMemo] = useState<string>('');
  const [date, setDate] = useState<string>(() => toLocalDateKey());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // 현재 타입에 맞는 카테고리 필터링
  const filteredCategories = categories.filter(c => c.type === type);

  // 기본 카테고리 자동 선택
  React.useEffect(() => {
    if (filteredCategories.length > 0 && (!selectedCategory || selectedCategory.type !== type)) {
      setSelectedCategory(filteredCategories[0]);
    }
  }, [type, categories]);

  const handleNumClick = (val: string) => {
    if (amountStr === '0') {
      setAmountStr(val);
    } else if (amountStr.length < 9) {
      setAmountStr(amountStr + val);
    }
  };

  const handleAddAmount = (addVal: number) => {
    const current = parseInt(amountStr, 10) || 0;
    setAmountStr(String(current + addVal));
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0');
    } else {
      setAmountStr(amountStr.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAmountStr('0');
  };

  const handleSubmit = async () => {
    const amount = parseInt(amountStr, 10);
    if (!amount || amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }
    if (!selectedCategory) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        type,
        amount,
        category_name: selectedCategory.name,
        category_id: selectedCategory.id,
        payment_method: paymentMethod,
        memo: memo.trim(),
        // 실제 결제 시각(시/분/초) 반영
        transacted_at: buildTransactedAt(date),
      });

      // 성공 피드백 및 입력값 리셋
      setAmountStr('0');
      setMemo('');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch (err) {
      console.error(err);
      alert(err instanceof DuplicateTransactionError ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedAmount = (parseInt(amountStr, 10) || 0).toLocaleString();

  return (
    <div className="relative flex flex-col h-full max-w-md mx-auto bg-white shadow-sm rounded-3xl overflow-hidden border border-slate-100">
      {/* 1. 상단 수입/지출 토글 */}
      <div className="p-4 pb-2 bg-slate-50/70">
        <div className="flex bg-slate-200/70 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            지출 (Expense)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            수입 (Income)
          </button>
        </div>
      </div>

      {/* 2. 대형 금액 표시부 */}
      <div className="px-6 py-4 text-right bg-slate-50/70 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 block mb-0.5">
          {type === 'expense' ? '지출 금액' : '수입 금액'}
        </span>
        <div className="flex items-baseline justify-end gap-1.5">
          <span
            className={`text-4xl font-black tracking-tight font-mono ${
              type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formattedAmount}
          </span>
          <span className="text-xl font-bold text-slate-500">원</span>
        </div>
      </div>

      {/* 3. 빠른 금액 추가 버튼 (+1만, +5만, +10만) */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto">
        <button
          onClick={() => handleAddAmount(10000)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap active:scale-95 transition"
        >
          +1만
        </button>
        <button
          onClick={() => handleAddAmount(50000)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap active:scale-95 transition"
        >
          +5만
        </button>
        <button
          onClick={() => handleAddAmount(100000)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap active:scale-95 transition"
        >
          +10만
        </button>
        <div className="flex-1" />
        <button
          onClick={handleClear}
          className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          C
        </button>
      </div>

      {/* 4. 카테고리 칩 선택 (스크롤) */}
      <div className="px-4 py-3 bg-white">
        <span className="text-xs font-semibold text-slate-400 block mb-2">카테고리 선택</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filteredCategories.map(cat => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.color || '#4f46e5' : undefined,
                }}
              >
                <CategoryIcon name={cat.name} icon={cat.icon} className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 결제 수단 & 날짜 & 메모 */}
      <div className="px-4 py-2 space-y-2 bg-slate-50/50 border-t border-slate-100">
        {/* 결제 수단 칩 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">수단:</span>
          {PAYMENT_METHODS.map(method => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                paymentMethod === method
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* 날짜 및 메모 입력 라인 */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer"
            />
          </div>
          <div className="flex-1 flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="메모 / 상호명 (예: 김밥천국)"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* 6. 숫자 키패드 */}
      <div className="p-3 bg-white border-t border-slate-100 grid grid-cols-4 gap-2">
        <button onClick={() => handleNumClick('1')} className="key-btn">1</button>
        <button onClick={() => handleNumClick('2')} className="key-btn">2</button>
        <button onClick={() => handleNumClick('3')} className="key-btn">3</button>
        <button onClick={handleBackspace} className="key-action-btn text-rose-500">
          <Delete className="w-5 h-5 mx-auto" />
        </button>

        <button onClick={() => handleNumClick('4')} className="key-btn">4</button>
        <button onClick={() => handleNumClick('5')} className="key-btn">5</button>
        <button onClick={() => handleNumClick('6')} className="key-btn">6</button>
        <button onClick={() => handleNumClick('00')} className="key-btn text-base font-bold">00</button>

        <button onClick={() => handleNumClick('7')} className="key-btn">7</button>
        <button onClick={() => handleNumClick('8')} className="key-btn">8</button>
        <button onClick={() => handleNumClick('9')} className="key-btn">9</button>
        <button onClick={() => handleNumClick('0')} className="key-btn">0</button>
      </div>

      {/* 등록하기 버튼 */}
      <div className="p-3 pt-0 bg-white">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || amountStr === '0'}
          className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2 ${
            amountStr === '0'
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : type === 'expense'
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
          }`}
        >
          {isSubmitting ? '저장 중...' : `${formattedAmount}원 ${type === 'expense' ? '지출' : '수입'} 등록`}
        </button>
      </div>

      {/* 성공 토스트 알림 */}
      {showSuccessToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{type === 'expense' ? '지출' : '수입'} 내역이 안전하게 등록되었습니다!</span>
        </div>
      )}
    </div>
  );
};
