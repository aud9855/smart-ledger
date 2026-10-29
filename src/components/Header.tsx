import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  Lock,
  ReceiptText,
  Download,
} from 'lucide-react';
import { usePwaInstall, shouldOfferInstall, requestInstall } from '../lib/pwa';
import { shiftMonth } from '../lib/date';

const formatShortDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

interface HeaderProps {
  currentMonth: string; // 'YYYY-MM'
  onChangeMonth: (newMonth: string) => void;
  periodStart: Date;
  periodEnd: Date; // 미포함
  onOpenPeriodSettings: () => void;
  viewMode: 'mobile' | 'desktop';
  onToggleViewMode: () => void;
  onLock: () => void;
  isRealtimeConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onChangeMonth,
  periodStart,
  periodEnd,
  onOpenPeriodSettings,
  viewMode,
  onToggleViewMode,
  onLock,
  isRealtimeConnected,
}) => {
  const pwa = usePwaInstall();
  const [year, month] = currentMonth.split('-').map(Number);

  // periodEnd는 다음 기간 시작일(미포함)이므로 표시용 마지막 날은 하루 전
  const lastDay = new Date(periodEnd);
  lastDay.setDate(lastDay.getDate() - 1);

  const handlePrevMonth = () => onChangeMonth(shiftMonth(currentMonth, -1));
  const handleNextMonth = () => onChangeMonth(shiftMonth(currentMonth, 1));

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* 1. 좌측 로고 & 타이틀 */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="./icon.png"
            alt="스마트가계부"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs shrink-0 object-cover border border-slate-100"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-slate-800 text-sm sm:text-base tracking-tight leading-none whitespace-nowrap">
                스마트 가계부
              </h1>
              {/* 실시간 연결 점 인디케이터 */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
                title={isRealtimeConnected ? 'Supabase 실시간 연동됨' : '오프라인'}
              />
            </div>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
              {isRealtimeConnected ? 'Supabase 실시간 연동' : '오프라인'}
            </span>
          </div>
        </div>

        {/* 2. 중앙 연월 선택기 (모바일에서도 컴팩트하게 표시) */}
        <div className="flex items-center bg-slate-100/90 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 shadow-inner shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 transition active:scale-95"
            title="이전 달"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          {/* 연월 + 실제 집계 기간 (누르면 기간 설정) */}
          <button
            onClick={onOpenPeriodSettings}
            className="px-1.5 sm:px-3 flex flex-col items-center leading-none rounded-lg hover:bg-white transition py-0.5"
            title="집계 기간 설정"
          >
            <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono whitespace-nowrap">
              {year}.{String(month).padStart(2, '0')}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium font-mono whitespace-nowrap mt-0.5">
              {formatShortDate(periodStart)}~{formatShortDate(lastDay)}
            </span>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl hover:bg-white text-slate-500 hover:text-slate-800 transition active:scale-95"
            title="다음 달"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* 3. 우측 도구: 뷰 전환 & 잠금 버튼 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 모드 전환 버튼 (모바일에서는 아이콘만, 데스크탑에서는 텍스트 포함) */}
          <button
            onClick={onToggleViewMode}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 active:scale-95"
            title={viewMode === 'mobile' ? 'PC 대시보드로 전환' : '모바일 간편입력으로 전환'}
          >
            {viewMode === 'mobile' ? (
              <>
                <Monitor className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">PC 대시보드</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">모바일 간편입력</span>
              </>
            )}
          </button>

          {/* 앱 설치 버튼 (홈 화면 앱/APK/EXE로 실행 중이면 숨김) */}
          {shouldOfferInstall(pwa) && (
            <button
              onClick={() => requestInstall()}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 active:scale-95"
              title="앱 설치"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">앱 설치</span>
            </button>
          )}

          {/* PIN 잠금 버튼 */}
          <button
            onClick={onLock}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
            title="가계부 잠금"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
