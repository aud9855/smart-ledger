import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Transaction, Category, TransactionType, PaymentMethod } from './types';
import {
  PeriodMode,
  PaydayOverrides,
  getCurrentPeriodLabel,
  getPeriodRange,
} from './lib/date';
import {
  supabase,
  getTransactionsInRange,
  getPaydayOverrides,
  setPaydayOverride,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
  getBudgetByMonth,
  setBudgetForMonth,
} from './lib/supabase';
import { Header } from './components/Header';
import { MobileQuickInput } from './components/MobileQuickInput';
import { MobileRecentFeed } from './components/MobileRecentFeed';
import { DesktopDashboard } from './components/DesktopDashboard';
import { TransactionModal } from './components/TransactionModal';
import { PinLockModal } from './components/PinLockModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { PeriodSettingsModal } from './components/PeriodSettingsModal';
import { PlusCircle, ListOrdered, Loader2 } from 'lucide-react';

const PERIOD_MODE_KEY = 'smart_ledger_period_mode';

/** 집계 기간 방식 (기기별 설정, 기본: 월급날 기준) */
function loadPeriodMode(): PeriodMode {
  try {
    return localStorage.getItem(PERIOD_MODE_KEY) === 'calendar' ? 'calendar' : 'payday';
  } catch {
    return 'payday';
  }
}

export const App: React.FC = () => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>(loadPeriodMode);
  const [paydayOverrides, setPaydayOverrides] = useState<PaydayOverrides>({});
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    getCurrentPeriodLabel(loadPeriodMode(), {})
  );
  // 사용자가 직접 월을 넘겼는지: 월급날 수정 내역이 늦게 로드돼도 보던 기간을 바꾸지 않기 위함
  const monthTouchedRef = useRef(false);
  const [isPeriodSettingsOpen, setIsPeriodSettingsOpen] = useState(false);

  const periodRange = useMemo(
    () => getPeriodRange(currentMonth, periodMode, paydayOverrides),
    [currentMonth, periodMode, paydayOverrides]
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>(() => {
    return window.innerWidth < 1024 ? 'mobile' : 'desktop';
  });
  const [mobileTab, setMobileTab] = useState<'input' | 'feed'>('input');

  const [savedPin, setSavedPin] = useState<string | null>(() => {
    return localStorage.getItem('smart_ledger_pin');
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return !!localStorage.getItem('smart_ledger_pin');
  });

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && viewMode === 'mobile') {
        setViewMode('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => {
    async function initCategories() {
      try {
        const catList = await getCategories();
        setCategories(catList);
      } catch (err) {
        console.error('카테고리 로드 에러:', err);
      }
    }
    initCategories();

    getPaydayOverrides().then(overrides => {
      setPaydayOverrides(overrides);
      if (!monthTouchedRef.current) {
        setCurrentMonth(getCurrentPeriodLabel(loadPeriodMode(), overrides));
      }
    });
  }, []);

  // 가장 최근 조회 요청 번호: 월을 빠르게 넘길 때 늦게 도착한 이전 달 응답이 덮어쓰지 않도록 함
  const latestRequestRef = useRef(0);

  // showSpinner=false면 화면을 유지한 채 조용히 갱신 (입력 폼/필터 상태가 초기화되지 않도록)
  const fetchMonthData = useCallback(
    async (showSpinner: boolean) => {
      const requestId = ++latestRequestRef.current;
      if (showSpinner) setLoading(true);
      try {
        const [txList, budgetAmount] = await Promise.all([
          getTransactionsInRange(periodRange.start, periodRange.end),
          getBudgetByMonth(currentMonth),
        ]);
        if (requestId !== latestRequestRef.current) return;
        setTransactions(txList);
        setBudget(budgetAmount);
      } catch (err) {
        console.error('데이터 조회 오류:', err);
      } finally {
        if (requestId === latestRequestRef.current) setLoading(false);
      }
    },
    [currentMonth, periodRange]
  );

  const refreshData = useCallback(() => fetchMonthData(false), [fetchMonthData]);

  useEffect(() => {
    fetchMonthData(true);
  }, [fetchMonthData]);

  useEffect(() => {
    const channel = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          refreshData();
        }
      )
      .subscribe(status => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const handleCreateTx = async (txData: {
    type: TransactionType;
    amount: number;
    category_name: string;
    category_id?: string;
    payment_method: PaymentMethod;
    memo: string;
    transacted_at: string;
  }) => {
    await createTransaction(txData);
    await refreshData();
  };

  const handleUpdateTx = async (txData: Partial<Transaction>) => {
    if (!txData.id) return;
    await updateTransaction(txData.id, txData);
    await refreshData();
  };

  const handleDeleteTx = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
      return;
    }
    await refreshData();
  };

  const handleSetBudget = async (amount: number) => {
    await setBudgetForMonth(currentMonth, amount);
    setBudget(amount);
  };

  const handleChangeMonth = (month: string) => {
    monthTouchedRef.current = true;
    setCurrentMonth(month);
  };

  // 방식을 바꾸면 오늘이 속한 기간으로 이동
  const handleChangePeriodMode = (mode: PeriodMode) => {
    try {
      localStorage.setItem(PERIOD_MODE_KEY, mode);
    } catch {
      // 저장 실패 시 이번 세션에서만 적용
    }
    setPeriodMode(mode);
    setCurrentMonth(getCurrentPeriodLabel(mode, paydayOverrides));
  };

  const handleSetPayday = async (paydayMonth: string, payday: string | null) => {
    await setPaydayOverride(paydayMonth, payday);
    setPaydayOverrides(prev => {
      const next = { ...prev };
      if (payday) next[paydayMonth] = payday;
      else delete next[paydayMonth];
      return next;
    });
  };

  const handleSavePin = (pin: string) => {
    localStorage.setItem('smart_ledger_pin', pin);
    setSavedPin(pin);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* PWA 설치 유도 배너 */}
      <PwaInstallPrompt />

      {/* 헤더 */}
      <Header
        currentMonth={currentMonth}
        onChangeMonth={handleChangeMonth}
        periodStart={periodRange.start}
        periodEnd={periodRange.end}
        onOpenPeriodSettings={() => setIsPeriodSettingsOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(prev => (prev === 'mobile' ? 'desktop' : 'mobile'))}
        onLock={() => setIsLocked(true)}
        isRealtimeConnected={isRealtimeConnected}
      />

      <main className="flex-1 py-3 sm:py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm font-semibold">데이터를 동기화하는 중...</p>
          </div>
        ) : viewMode === 'mobile' ? (
          <div className="px-3 pb-24 max-w-md mx-auto">
            {mobileTab === 'input' ? (
              <MobileQuickInput
                categories={categories}
                onSubmit={handleCreateTx}
              />
            ) : (
              <MobileRecentFeed
                transactions={transactions}
                onDelete={handleDeleteTx}
                onEdit={tx => {
                  setEditingTx(tx);
                  setIsTxModalOpen(true);
                }}
              />
            )}

            {/* 모바일 하단 내비게이션 바 (Safe Area 대응) */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 pt-2 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex justify-around items-center shadow-lg">
              <button
                onClick={() => setMobileTab('input')}
                className={`flex flex-col items-center gap-1 transition active:scale-95 ${
                  mobileTab === 'input'
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[11px]">기록하기</span>
              </button>
              <button
                onClick={() => setMobileTab('feed')}
                className={`flex flex-col items-center gap-1 transition active:scale-95 ${
                  mobileTab === 'feed'
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[11px]">내역 조회</span>
              </button>
            </nav>
          </div>
        ) : (
          <DesktopDashboard
            transactions={transactions}
            categories={categories}
            budget={budget}
            onSetBudget={handleSetBudget}
            onAddTransaction={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            onEditTransaction={tx => {
              setEditingTx(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTx}
            currentMonth={currentMonth}
            periodStart={periodRange.start}
            periodEnd={periodRange.end}
          />
        )}
      </main>

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={async data => {
          if (editingTx) {
            await handleUpdateTx(data);
          } else {
            await handleCreateTx(data as any);
          }
        }}
        transaction={editingTx}
        categories={categories}
      />

      <PeriodSettingsModal
        isOpen={isPeriodSettingsOpen}
        onClose={() => setIsPeriodSettingsOpen(false)}
        periodMode={periodMode}
        onChangePeriodMode={handleChangePeriodMode}
        currentMonth={currentMonth}
        periodStart={periodRange.start}
        paydayOverrides={paydayOverrides}
        onSetPayday={handleSetPayday}
      />

      <PinLockModal
        isOpen={isLocked}
        onSuccess={() => setIsLocked(false)}
        savedPin={savedPin}
        onSavePin={handleSavePin}
      />
    </div>
  );
};
