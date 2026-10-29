import React, { useState, useMemo } from 'react';
import { Transaction, Category } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { toLocalDateKey } from '../lib/date';
import {
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Plus,
  Download,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DesktopDashboardProps {
  transactions: Transaction[];
  categories: Category[];
  budget: number;
  onSetBudget: (amount: number) => Promise<void>;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentMonth: string;
  periodStart: Date;
  periodEnd: Date; // 미포함
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  transactions,
  budget,
  onSetBudget,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  currentMonth,
  periodStart,
  periodEnd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.toString());

  // 통계 계산
  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpense;
  const budgetUsagePercent = budget > 0 ? Math.min(Math.round((totalExpense / budget) * 100), 100) : 0;

  // 카테고리별 지출 집계 (도넛 차트 데이터)
  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map.set(t.category_name, (map.get(t.category_name) || 0) + t.amount);
      });

    const colors: Record<string, string> = {
      식비: '#ef4444',
      '카페/간식': '#f97316',
      '편의점/마트': '#eab308',
      '교통/차량': '#3b82f6',
      '쇼핑/의류': '#ec4899',
      '주거/통신': '#8b5cf6',
      '의료/건강': '#10b981',
      '문화/여가': '#06b6d4',
      '경조사/선물': '#f43f5e',
      기타지출: '#94a3b8',
    };

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || '#6366f1',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 일별 지출/수입 집계 (바 차트 데이터) - 기간이 두 달에 걸치면 'M/D'로 표시
  const dailyChartData = useMemo(() => {
    const lastDay = new Date(periodEnd);
    lastDay.setDate(lastDay.getDate() - 1);
    const isSingleMonth = periodStart.getMonth() === lastDay.getMonth();
    const dataMap = new Map<string, { day: string; expense: number; income: number }>();

    for (const d = new Date(periodStart); d < periodEnd; d.setDate(d.getDate() + 1)) {
      dataMap.set(toLocalDateKey(d), {
        day: isSingleMonth ? `${d.getDate()}일` : `${d.getMonth() + 1}/${d.getDate()}`,
        expense: 0,
        income: 0,
      });
    }

    transactions.forEach(t => {
      const entry = dataMap.get(toLocalDateKey(t.transacted_at));
      if (entry) {
        if (t.type === 'expense') {
          entry.expense += t.amount;
        } else {
          entry.income += t.amount;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [transactions, periodStart, periodEnd]);

  // 필터링된 거래 목록
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (methodFilter !== 'all' && t.payment_method !== methodFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchMemo = (t.memo || '').toLowerCase().includes(query);
        const matchCategory = t.category_name.toLowerCase().includes(query);
        const matchMethod = t.payment_method.toLowerCase().includes(query);
        return matchMemo || matchCategory || matchMethod;
      }
      return true;
    });
  }, [transactions, typeFilter, methodFilter, searchQuery]);

  // CSV 엑셀 다운로드
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const headers = ['일시', '유형', '카테고리', '결제수단', '금액', '메모'];
    const rows = filteredTransactions.map(t => [
      toLocalDateKey(t.transacted_at),
      t.type === 'expense' ? '지출' : '수입',
      t.category_name,
      t.payment_method,
      t.amount,
      `"${(t.memo || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `가계부_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // 클릭 직후 바로 해제하면 일부 브라우저(Safari)에서 다운로드가 실패하므로 약간 뒤에 해제
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSaveBudget = async () => {
    const val = parseInt(budgetInput, 10) || 0;
    try {
      await onSetBudget(val);
      setIsEditingBudget(false);
    } catch {
      alert('예산 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. 상단 KPI 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 지출 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">이번 달 총 지출</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {totalExpense.toLocaleString()}
              <span className="text-sm font-semibold text-slate-500 ml-1">원</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {transactions.filter(t => t.type === 'expense').length}건 결제
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* 총 수입 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">이번 달 총 수입</span>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {totalIncome.toLocaleString()}
              <span className="text-sm font-semibold text-slate-500 ml-1">원</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {transactions.filter(t => t.type === 'income').length}건 입금
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 순수 잔여 수지 (수입 - 지출) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">순 잔액 (수입-지출)</span>
            <div
              className={`text-2xl font-black font-mono ${
                netBalance >= 0 ? 'text-indigo-600' : 'text-amber-600'
              }`}
            >
              {netBalance >= 0 ? '+' : ''}
              {netBalance.toLocaleString()}
              <span className="text-sm font-semibold text-slate-500 ml-1">원</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {netBalance >= 0 ? '흑자 유지 중' : '지출 초과 주의'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

        {/* 예산 사용률 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">목표 예산 대비</span>
              <div className="text-xl font-black text-slate-800 font-mono">
                {budget > 0 ? `${budgetUsagePercent}%` : '예산 미설정'}
              </div>
            </div>
            <button
              onClick={() => {
                setBudgetInput(budget.toString());
                setIsEditingBudget(true);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
            >
              설정
            </button>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetUsagePercent > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${budgetUsagePercent}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1.5 block">
              목표: {budget.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* 예산 수정 간이 팝업 */}
      {isEditingBudget && (
        <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-indigo-900">
              {currentMonth} 목표 예산 입력:
            </span>
            <input
              type="number"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-indigo-900 outline-none w-40"
              placeholder="예: 1500000"
            />
            <span className="text-sm font-semibold text-indigo-900">원</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingBudget(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white"
            >
              취소
            </button>
            <button
              onClick={handleSaveBudget}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 2. 중단 시각화 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 좌측: 카테고리별 도넛 차트 */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-base">카테고리별 지출 분석</h3>
            <span className="text-xs text-slate-400">총 {categoryChartData.length}개 분류</span>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-300">
              <AlertCircle className="w-10 h-10 mb-2 stroke-1" />
              <span className="text-xs">지출 내역이 없습니다.</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val.toLocaleString()}원`, '금액']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 순위 리스트 */}
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                {categoryChartData.map(item => {
                  const percent = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="text-slate-400">({percent}%)</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {item.value.toLocaleString()}원
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 일별 지출/수입 바 차트 */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">일별 소비 & 수입 추이</h3>
              <p className="text-xs text-slate-400 mt-0.5">일자별로 지출이 몰린 날을 파악합니다</p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={val => `${val / 10000}만`}
                />
                <Tooltip
                  formatter={(val: number) => [`${val.toLocaleString()}원`]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="expense" name="지출" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="income" name="수입" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. 하단 데이터 관리 테이블 */}
      <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        {/* 상단 툴바: 필터 및 액션 버튼 */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* 검색창 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs w-60">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="상호명, 메모, 카테고리 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>

            {/* 유형 필터 */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  typeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-1 rounded-lg transition ${
                  typeFilter === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                지출만
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-1 rounded-lg transition ${
                  typeFilter === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                수입만
              </button>
            </div>

            {/* 결제수단 필터 */}
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">결제수단: 전체</option>
              <option value="토스">토스</option>
              <option value="카카오페이">카카오페이</option>
              <option value="신용카드">신용카드</option>
              <option value="체크카드">체크카드</option>
              <option value="계좌이체">계좌이체</option>
              <option value="현금">현금</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV 내보내기</span>
            </button>
            <button
              onClick={onAddTransaction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>거래 추가</span>
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">일시</th>
                <th className="py-3 px-4">유형</th>
                <th className="py-3 px-4">카테고리</th>
                <th className="py-3 px-4">결제 수단</th>
                <th className="py-3 px-4">메모 / 상호명</th>
                <th className="py-3 px-4 text-right">금액</th>
                <th className="py-3 px-4 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    일치하는 거래 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <div className="font-semibold text-slate-700">{toLocalDateKey(t.transacted_at)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.transacted_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.type === 'expense'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {t.type === 'expense' ? '지출' : '수입'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                      <CategoryIcon name={t.category_name} className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.category_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium">
                        {t.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">
                      {t.memo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                      <span className={t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}>
                        {t.type === 'expense' ? '-' : '+'}
                        {t.amount.toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => onEditTransaction(t)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              onDeleteTransaction(t.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
