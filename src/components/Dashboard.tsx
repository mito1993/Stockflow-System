import React, { useState } from 'react';
import { MUser, MStore, TInvoiceLine, TCostCalculation, TMonthlySales, TabType } from '../types';

interface DashboardProps {
  currentUser: MUser;
  currentStore: MStore;
  selectedMonth: string;
  availableMonths: string[];
  currentStoreInvoiceLines: TInvoiceLine[];
  unresolvedInvoicesCount: number;
  currentStoreCostCalculations: TCostCalculation[];
  T_Monthly_Sales: TMonthlySales[];
  setT_Monthly_Sales: React.Dispatch<React.SetStateAction<TMonthlySales[]>>;
  setActiveTab: (tab: TabType) => void;
  showToast: (message: string, type?: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers: string[], records: any[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentStore,
  selectedMonth,
  availableMonths,
  currentStoreInvoiceLines,
  unresolvedInvoicesCount,
  currentStoreCostCalculations,
  T_Monthly_Sales,
  setT_Monthly_Sales,
  setActiveTab,
  showToast,
  saveSheetToGoogle,
}) => {
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [modalTargetMonth, setModalTargetMonth] = useState('2026-09');
  const [modalSalesValue, setModalSalesValue] = useState(2000000);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatMonthJP = (mStr: string) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    return `${year}年${Number(month)}月`;
  };

  // 当月指標計算
  const currentMonthCostTotal = currentStoreCostCalculations.reduce((sum, i) => sum + i.consumption_cost, 0);
  const confirmedLines = currentStoreInvoiceLines.filter(l => l.status === '確定');
  const currentMonthPurchaseTotal = confirmedLines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unit_price)), 0);

  const salesRecord = T_Monthly_Sales.find(s => s.store_id === currentStore.store_id && s.target_month === selectedMonth);
  const currentSalesAmount = salesRecord ? Number(salesRecord.sales_amount) : 2000000;
  const currentCostRate = currentSalesAmount > 0 ? ((currentMonthCostTotal / currentSalesAmount) * 100).toFixed(1) : '0.0';

  // 店舗別月次推移表データ (要件定義書ベース)
  const baseMonthlyData: Record<string, { beginningStock: number; monthlyPurchase: number; endingStock: number; cost: number }> = {
    '2026-06': { beginningStock: 180000, monthlyPurchase: 550000, endingStock: 190000, cost: 540000 },
    '2026-07': { beginningStock: 190000, monthlyPurchase: 640000, endingStock: 200000, cost: 630000 },
    '2026-08': { beginningStock: 200000, monthlyPurchase: 710000, endingStock: 210000, cost: 700000 },
    '2026-09': { beginningStock: 210000, monthlyPurchase: 680000, endingStock: 215000, cost: 675000 },
  };

  const monthlyTransitionColumns = availableMonths.map(month => {
    const sRec = T_Monthly_Sales.find(s => s.store_id === currentStore.store_id && s.target_month === month);
    const salesAmount = sRec ? Number(sRec.sales_amount) : 2000000;

    if (month === selectedMonth) {
      const beginningStock = currentStoreCostCalculations.reduce((sum, i) => sum + (i.beginning_stock * i.latest_unit_price), 0);
      const monthlyPurchase = currentStoreCostCalculations.reduce((sum, i) => sum + (i.monthly_purchase * i.latest_unit_price), 0);
      const endingStock = currentStoreCostCalculations.reduce((sum, i) => sum + (i.ending_stock * i.latest_unit_price), 0);
      const cost = Math.max(0, beginningStock + monthlyPurchase - endingStock);
      const costRate = salesAmount > 0 ? ((cost / salesAmount) * 100).toFixed(1) : '0.0';

      return { month, beginningStock, monthlyPurchase, endingStock, cost, costRate, salesAmount };
    } else {
      const d = baseMonthlyData[month] || { beginningStock: 180000, monthlyPurchase: 550000, endingStock: 190000, cost: 540000 };
      const costRate = salesAmount > 0 ? ((d.cost / salesAmount) * 100).toFixed(1) : '0.0';
      return { month, beginningStock: d.beginningStock, monthlyPurchase: d.monthlyPurchase, endingStock: d.endingStock, cost: d.cost, costRate, salesAmount };
    }
  });

  const openSalesEditModal = (month: string) => {
    setModalTargetMonth(month);
    const rec = T_Monthly_Sales.find(s => s.store_id === currentStore.store_id && s.target_month === month);
    setModalSalesValue(rec ? Number(rec.sales_amount) : 2000000);
    setShowSalesModal(true);
  };

  const handleSaveSalesModal = () => {
    setT_Monthly_Sales(prev => {
      const existingIdx = prev.findIndex(s => s.store_id === currentStore.store_id && s.target_month === modalTargetMonth);
      let updated: TMonthlySales[];
      if (existingIdx !== -1) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], sales_amount: Number(modalSalesValue) };
      } else {
        updated = [
          ...prev,
          { sales_id: Date.now(), store_id: currentStore.store_id, target_month: modalTargetMonth, sales_amount: Number(modalSalesValue) }
        ];
      }
      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Monthly_Sales', ['sales_id', 'store_id', 'target_month', 'sales_amount'], updated);
      }
      return updated;
    });

    setShowSalesModal(false);
    showToast(`売上高を ${formatCurrency(modalSalesValue)} に更新しました`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* 未確定伝票アラートバナー */}
      {unresolvedInvoicesCount > 0 && (
        <div className="bg-neutral-900 text-neutral-100 p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm shrink-0 text-white">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-white">
                未確定の仕入伝票が {unresolvedInvoicesCount} 件あります（翌月5日確定ルール）
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                未確定伝票は当月の原価計算および仕入集計に含まれません。OCR解析結果を確認して確定してください。
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ocr')}
            className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-neutral-950 font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <span>伝票を確認・確定</span>
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </div>
      )}

      {/* KPIサマリカード 4種 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 当月仕入総額 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
            <span>当月仕入総額 (確定済)</span>
            <span className="w-6 h-6 rounded bg-neutral-100 text-neutral-700 flex items-center justify-center text-[11px]">
              <i className="fa-solid fa-truck-ramp-box" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight tabular-nums">
            {formatCurrency(currentMonthPurchaseTotal)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 font-mono">
            対象: {formatMonthJP(selectedMonth)}
          </div>
        </div>

        {/* 2. 今月の推定原価 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
            <span>今月の推定原価 (最終原価法)</span>
            <span className="w-6 h-6 rounded bg-neutral-100 text-neutral-700 flex items-center justify-center text-[11px]">
              <i className="fa-solid fa-calculator" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight tabular-nums">
            {formatCurrency(currentMonthCostTotal)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            先月末在庫 + 当月仕入 - 当月末在庫
          </div>
        </div>

        {/* 3. 推定原価率 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
            <span>推定原価率</span>
            <span className="w-6 h-6 rounded bg-neutral-100 text-neutral-700 flex items-center justify-center text-[11px]">
              <i className="fa-solid fa-percent" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight tabular-nums text-neutral-950">
              {currentCostRate}%
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-neutral-300 bg-neutral-100 text-neutral-800">
              {Number(currentCostRate) > 35 ? '警戒' : Number(currentCostRate) > 30 ? '目安(30%)超' : '適正'}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            基準目安: 30.0%
          </div>
        </div>

        {/* 4. 当月売上高 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
            <span>当月売上高</span>
            {(currentUser.role === 'owner' || currentUser.role === 'hq') && (
              <button
                onClick={() => openSalesEditModal(selectedMonth)}
                className="text-[11px] text-neutral-700 hover:text-black font-semibold flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded transition-colors"
              >
                <i className="fa-solid fa-pen text-[9px]" /> 編集
              </button>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight tabular-nums">
            {formatCurrency(currentSalesAmount)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>原価率計算の分母</span>
            <span className="text-neutral-500 text-[10px]">管理者編集可</span>
          </div>
        </div>
      </div>

      {/* 店舗別月次推移表 */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-neutral-700" />
              <span>{currentStore.store_name} 月次原価推移表</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              横軸に月次推移、縦軸に「先月末在庫・当月仕入・当月末在庫・原価・原価率」を表示します。
            </p>
          </div>
          <span className="text-[11px] font-mono font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded self-start md:self-auto">
            JPY (円)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                <th className="p-3 w-48 bg-neutral-100 sticky left-0 z-10 border-r border-neutral-200">項目</th>
                {monthlyTransitionColumns.map(col => (
                  <th
                    key={col.month}
                    className={`p-3 text-right min-w-[120px] font-semibold border-r border-neutral-200 ${
                      col.month === selectedMonth ? 'bg-neutral-200/50 text-neutral-950 font-bold' : ''
                    }`}
                  >
                    {col.month === selectedMonth && <div className="text-[10px] text-neutral-500 font-mono">[選択月]</div>}
                    {formatMonthJP(col.month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {/* 1. 先月末在庫 */}
              <tr className="hover:bg-neutral-50/70 transition-colors">
                <td className="p-3 font-semibold text-neutral-700 bg-neutral-50/60 sticky left-0 z-10 border-r border-neutral-200 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-neutral-200 text-neutral-700 text-[9px] font-mono font-bold flex items-center justify-center">1</span>
                  <span>先月末在庫（円）</span>
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-3 text-right font-mono font-medium border-r border-neutral-100 tabular-nums ${col.month === selectedMonth ? 'bg-neutral-100/50 font-bold text-neutral-950' : 'text-neutral-600'}`}>
                    {formatCurrency(col.beginningStock)}
                  </td>
                ))}
              </tr>

              {/* 2. 当月仕入 */}
              <tr className="hover:bg-neutral-50/70 transition-colors">
                <td className="p-3 font-semibold text-neutral-700 bg-neutral-50/60 sticky left-0 z-10 border-r border-neutral-200 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-neutral-200 text-neutral-700 text-[9px] font-mono font-bold flex items-center justify-center">2</span>
                  <span>当月仕入（円）</span>
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-3 text-right font-mono font-medium border-r border-neutral-100 tabular-nums ${col.month === selectedMonth ? 'bg-neutral-100/50 font-bold text-neutral-950' : 'text-neutral-700'}`}>
                    {formatCurrency(col.monthlyPurchase)}
                  </td>
                ))}
              </tr>

              {/* 3. 当月末在庫 */}
              <tr className="hover:bg-neutral-50/70 transition-colors">
                <td className="p-3 font-semibold text-neutral-700 bg-neutral-50/60 sticky left-0 z-10 border-r border-neutral-200 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-neutral-200 text-neutral-700 text-[9px] font-mono font-bold flex items-center justify-center">3</span>
                  <span>当月末在庫（円）</span>
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-3 text-right font-mono font-medium border-r border-neutral-100 tabular-nums ${col.month === selectedMonth ? 'bg-neutral-100/50 font-bold text-neutral-950' : 'text-neutral-600'}`}>
                    {formatCurrency(col.endingStock)}
                  </td>
                ))}
              </tr>

              {/* 4. 原価 */}
              <tr className="bg-neutral-100/40 font-semibold border-t-2 border-neutral-200">
                <td className="p-3 font-bold text-neutral-900 bg-neutral-100 sticky left-0 z-10 border-r border-neutral-200 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-neutral-900 text-white text-[9px] font-mono font-bold flex items-center justify-center">4</span>
                  <span>原価（円）</span>
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-3 text-right font-mono font-bold text-sm text-neutral-950 border-r border-neutral-200 tabular-nums ${col.month === selectedMonth ? 'bg-neutral-200/60 text-base' : ''}`}>
                    {formatCurrency(col.cost)}
                  </td>
                ))}
              </tr>

              {/* 5. 原価率 */}
              <tr className="bg-neutral-50 font-semibold border-t border-neutral-200">
                <td className="p-3 font-bold text-neutral-900 bg-neutral-100 sticky left-0 z-10 border-r border-neutral-200 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-neutral-800 text-white text-[9px] font-mono font-bold flex items-center justify-center">5</span>
                  <span>原価率（％）</span>
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-3 text-right font-mono font-bold text-sm border-r border-neutral-200 tabular-nums text-neutral-900 ${col.month === selectedMonth ? 'bg-neutral-200/60 text-base font-extrabold' : ''}`}>
                    {col.costRate}%
                  </td>
                ))}
              </tr>

              {/* 売上高参考行 */}
              <tr className="text-xs text-neutral-500 bg-neutral-50/20">
                <td className="p-2.5 font-medium text-neutral-500 bg-neutral-100/50 sticky left-0 z-10 border-r border-neutral-200">
                  (参考) 売上高 (円)
                </td>
                {monthlyTransitionColumns.map(col => (
                  <td key={col.month} className={`p-2.5 text-right font-mono border-r border-neutral-200/60 tabular-nums ${col.month === selectedMonth ? 'bg-neutral-100/30 font-semibold text-neutral-800' : ''}`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{formatCurrency(col.salesAmount)}</span>
                      {(currentUser.role === 'owner' || currentUser.role === 'hq') && (
                        <button
                          onClick={() => openSalesEditModal(col.month)}
                          className="text-neutral-400 hover:text-black p-0.5 transition-colors"
                        >
                          <i className="fa-solid fa-pen text-[9px]" />
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 売上額編集モーダル */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-1 flex items-center gap-2 tracking-tight">
              <i className="fa-solid fa-cash-register text-neutral-700" />
              <span>売上高の変更</span>
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              {currentStore.store_name} - {formatMonthJP(modalTargetMonth)}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">売上金額（円）</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-400 font-mono text-sm">¥</span>
                <input
                  type="number"
                  value={modalSalesValue}
                  onChange={(e) => setModalSalesValue(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-md text-base font-bold outline-none font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSalesModal(false)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-md text-xs transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSalesModal}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white font-medium rounded-md text-xs shadow"
              >
                更新する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};