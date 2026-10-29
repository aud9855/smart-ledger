import React, { useState, useEffect } from 'react';
import { X, CalendarClock } from 'lucide-react';
import {
  PeriodMode,
  PaydayOverrides,
  shiftMonth,
  toLocalDateKey,
  getLastWeekday,
} from '../lib/date';

interface PeriodSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodMode: PeriodMode;
  onChangePeriodMode: (mode: PeriodMode) => void;
  currentMonth: string; // 'YYYY-MM' (보고 있는 기간)
  periodStart: Date;
  paydayOverrides: PaydayOverrides;
  onSetPayday: (paydayMonth: string, payday: string | null) => Promise<void>;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const formatDate = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;

export const PeriodSettingsModal: React.FC<PeriodSettingsModalProps> = ({
  isOpen,
  onClose,
  periodMode,
  onChangePeriodMode,
  currentMonth,
  periodStart,
  paydayOverrides,
  onSetPayday,
}) => {
  // 보고 있는 기간을 시작하는 월급날은 전월에 받은 월급
  const paydayMonth = shiftMonth(currentMonth, -1);
  const isOverridden = !!paydayOverrides[paydayMonth];
  const [paydayInput, setPaydayInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setPaydayInput(toLocalDateKey(periodStart));
  }, [isOpen, periodStart]);

  if (!isOpen) return null;

  const [, paydayMonthNum] = paydayMonth.split('-').map(Number);
  const [, currentMonthNum] = currentMonth.split('-').map(Number);

  const savePayday = async (payday: string | null) => {
    if (payday && !payday.startsWith(paydayMonth)) {
      alert(`${paydayMonthNum}월 안의 날짜를 선택해주세요.`);
      return;
    }
    try {
      setIsSaving(true);
      await onSetPayday(paydayMonth, payday);
    } catch {
      alert('월급날 저장 중 오류가 발생했습니다.\nSupabase에서 schema_payday.sql을 실행했는지 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            집계 기간 설정
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 기간 방식 선택 */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
          <button
            onClick={() => onChangePeriodMode('payday')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              periodMode === 'payday' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            월급날 기준
          </button>
          <button
            onClick={() => onChangePeriodMode('calendar')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              periodMode === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            1일 ~ 말일
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          {periodMode === 'payday'
            ? '매월 마지막 평일(월급날)부터 다음 월급날 전날까지를 한 달로 봅니다. 그 월급으로 쓰는 달의 이름이 붙어요.'
            : '매월 1일부터 말일까지를 한 달로 봅니다.'}
        </p>

        {/* 월급날 직접 수정 (공휴일 등) */}
        {periodMode === 'payday' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600">
                {paydayMonthNum}월 월급날 ({currentMonthNum}월 기간 시작)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOverridden ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {isOverridden ? '직접 수정됨' : '자동'}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-800">{formatDate(periodStart)}</div>
            {isOverridden && (
              <div className="text-[11px] text-slate-400">
                자동 계산: {formatDate(getLastWeekday(paydayMonth))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="date"
                value={paydayInput}
                onChange={e => setPaydayInput(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => savePayday(paydayInput)}
                disabled={isSaving || !paydayInput || paydayInput === toLocalDateKey(periodStart)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40"
              >
                변경
              </button>
            </div>
            {isOverridden && (
              <button
                onClick={() => savePayday(null)}
                disabled={isSaving}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                자동(마지막 평일)으로 되돌리기
              </button>
            )}
            <p className="text-[11px] text-slate-400">
              공휴일 때문에 월급이 당겨진 달만 바꾸면 됩니다. 수정 내용은 모든 기기에 함께 적용돼요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
