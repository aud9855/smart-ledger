import React, { useState } from 'react';
import { AccountBalance } from '../types';
import { Wallet, Pencil, Loader2 } from 'lucide-react';

interface AccountBalancesProps {
  balances: AccountBalance[] | null; // null: accounts 테이블이 아직 없음
  onSetBalance: (name: string, balance: number) => Promise<void>;
  compact?: boolean; // 모바일용 촘촘한 레이아웃
}

const ACCOUNT_COLORS: Record<string, string> = {
  우체국: 'bg-rose-500',
  신한: 'bg-blue-600',
  카카오페이: 'bg-yellow-400',
  현금: 'bg-emerald-500',
};

/** 계좌별 현재 잔액: 총합 + 계좌별 (기간과 무관하게 지금 시점 기준) */
export const AccountBalances: React.FC<AccountBalancesProps> = ({ balances, onSetBalance, compact }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (balances === null) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
        계좌별 잔액을 보려면 Supabase SQL Editor에서 <b>schema_accounts.sql</b>을 한 번 실행해주세요.
      </div>
    );
  }

  const total = balances.reduce((sum, a) => sum + a.balance, 0);
  // 잔액도 0이고 사용 내역도 없는 계좌는 숨김 (잔액 맞추기 중에는 모두 표시)
  const visible = isEditing ? balances : balances.filter(a => a.balance !== 0 || a.tx_count > 0);

  const startEditing = () => {
    setInputs(Object.fromEntries(balances.map(a => [a.name, String(a.balance)])));
    setIsEditing(true);
  };

  const handleSave = async () => {
    const changed = balances.filter(a => {
      const raw = (inputs[a.name] ?? '').replace(/,/g, '').trim();
      return raw !== '' && Number(raw) !== a.balance;
    });
    for (const a of changed) {
      if (!Number.isInteger(Number(inputs[a.name].replace(/,/g, '')))) {
        alert(`${a.name} 잔액을 숫자로 입력해주세요.`);
        return;
      }
    }
    try {
      setIsSaving(true);
      for (const a of changed) {
        await onSetBalance(a.name, Number(inputs[a.name].replace(/,/g, '')));
      }
      setIsEditing(false);
    } catch {
      alert('잔액 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const money = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString()}원`;

  return (
    <div className={`rounded-3xl bg-white border border-slate-100 shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      {/* 총 잔액 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-400 block">지금 남은 돈 (전체)</span>
            <span
              className={`font-black font-mono block truncate ${compact ? 'text-xl' : 'text-2xl'} ${
                total >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {money(total)}
            </span>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition shrink-0"
          >
            <Pencil className="w-3 h-3" />
            잔액 맞추기
          </button>
        )}
      </div>

      {/* 계좌별 잔액 */}
      {visible.length > 0 && (
        <div
          className={`mt-4 grid gap-2 ${
            compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {visible.map(a => (
            <div key={a.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${ACCOUNT_COLORS[a.name] || 'bg-slate-400'}`} />
                <span className="text-xs font-semibold text-slate-500 truncate">{a.name}</span>
              </div>
              {isEditing ? (
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputs[a.name] ?? ''}
                    onChange={e => setInputs(prev => ({ ...prev, [a.name]: e.target.value }))}
                    className="w-full min-w-0 px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm font-bold font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500 shrink-0">원</span>
                </div>
              ) : (
                <span
                  className={`mt-0.5 text-sm font-bold font-mono block truncate ${
                    a.balance >= 0 ? 'text-slate-800' : 'text-rose-600'
                  }`}
                >
                  {money(a.balance)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-slate-400">
            지금 실제로 남아 있는 금액을 입력하세요. 이후 기록되는 수입·지출이 여기에 더해지고 빠집니다.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
