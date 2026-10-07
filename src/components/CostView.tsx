import React from 'react';
import { TCostCalculation, TInvoiceLine, MSupplier } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CostViewProps {
  currentStoreCostCalculations: TCostCalculation[];
  currentStoreInvoiceLines: TInvoiceLine[];
  M_Supplier: MSupplier[];
  currentMonthCostTotal: number;
  currentMonthPurchaseTotal: number;
  showToast: (message: string, type?: any) => void;
}

export const CostView: React.FC<CostViewProps> = ({
  currentStoreCostCalculations,
  currentStoreInvoiceLines,
  M_Supplier,
  currentMonthCostTotal,
  currentMonthPurchaseTotal,
  showToast,
}) => {
  const supplierSummaryMap: Record<number, { supplier_id: number; supplier_name: string; invoiceCount: number; totalAmount: number }> = {};

  currentStoreInvoiceLines.filter(l => l.status === '確定').forEach(line => {
    if (!supplierSummaryMap[line.supplier_id]) {
      const sup = M_Supplier.find(s => s.supplier_id === line.supplier_id);
      supplierSummaryMap[line.supplier_id] = {
        supplier_id: line.supplier_id,
        supplier_name: line.converted_supplier_name || sup?.supplier_name || `SUP-${line.supplier_id}`,
        invoiceCount: 0,
        totalAmount: 0,
      };
    }
    supplierSummaryMap[line.supplier_id].invoiceCount += 1;
    supplierSummaryMap[line.supplier_id].totalAmount += Number(line.quantity) * Number(line.unit_price);
  });

  const supplierPurchaseSummary = Object.values(supplierSummaryMap).sort((a, b) => b.totalAmount - a.totalAmount);

  const exportCostCsv = () => {
    const headers = ['品目名', '仕入先', '単位', '期首在庫', '当月仕入', '期末在庫', '当月消費量', '適用単価', '消費金額(原価)'];
    const rows = currentStoreCostCalculations.map(i => [
      i.item_name,
      i.supplier_name,
      i.unit,
      i.beginning_stock,
      i.monthly_purchase,
      i.ending_stock,
      i.consumption_qty,
      i.latest_unit_price,
      i.consumption_cost,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `原価計算サマリ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('原価計算CSVファイルをダウンロードしました', 'success');
  };

  return (
    <div className="space-y-6">
      {/* 原価計算テーブル */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-calculator text-neutral-700" />
              <span>最終仕入原価法による原価計算テーブル (T_Cost_Calculation)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              消費金額 = (期首在庫 + 当月仕入 - 実地在庫) × 最新取得単価 でリアルタイム算出されます。
            </p>
          </div>
          <button
            onClick={exportCostCsv}
            className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-medium rounded-md border border-neutral-300 shadow-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-download text-[10px]" />
            <span>CSVエクスポート</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">品目名</th>
                <th className="p-3">仕入先</th>
                <th className="p-3">単位</th>
                <th className="p-3 text-right">期首在庫</th>
                <th className="p-3 text-right">当月仕入</th>
                <th className="p-3 text-right bg-neutral-100 text-neutral-900 font-bold">期末在庫(実地)</th>
                <th className="p-3 text-right font-bold text-neutral-900">当月消費量</th>
                <th className="p-3 text-right">適用単価(最新)</th>
                <th className="p-3 text-right font-bold text-neutral-950 bg-neutral-50">消費金額(原価)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {currentStoreCostCalculations.map(item => (
                <tr key={item.item_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3 font-semibold text-neutral-900">{item.item_name}</td>
                  <td className="p-3 text-neutral-500">{item.supplier_name}</td>
                  <td className="p-3 text-neutral-500 font-mono">{item.unit}</td>
                  <td className="p-3 text-right font-mono text-neutral-600">{item.beginning_stock}</td>
                  <td className="p-3 text-right font-mono text-neutral-700">+{item.monthly_purchase}</td>
                  <td className="p-3 text-right font-mono font-bold bg-neutral-50 text-neutral-950">{item.ending_stock}</td>
                  <td className="p-3 text-right font-mono font-bold text-neutral-900">{item.consumption_qty}</td>
                  <td className="p-3 text-right font-mono text-neutral-600">{formatCurrency(item.latest_unit_price)}</td>
                  <td className="p-3 text-right font-mono font-bold text-neutral-950 bg-neutral-50/70">{formatCurrency(item.consumption_cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-100 text-neutral-900 font-bold border-t border-neutral-200">
              <tr>
                <td colSpan={6} className="p-3.5 text-right text-neutral-600">当月原価合計:</td>
                <td className="p-3.5 text-right font-mono text-xs">
                  {currentStoreCostCalculations.reduce((sum, i) => sum + i.consumption_qty, 0)}
                </td>
                <td />
                <td className="p-3.5 text-right font-mono text-sm text-neutral-950">
                  {formatCurrency(currentMonthCostTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 仕入先別 当月仕入集計サマリ */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden max-w-3xl">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-boxes-packing text-neutral-700" />
            <span>仕入先別 当月仕入集計サマリ（確定伝票ベース）</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">取引先ID</th>
                <th className="p-3">仕入先名</th>
                <th className="p-3 text-center">確定伝票数</th>
                <th className="p-3 text-right font-bold">当月仕入合計金額 (税込)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {supplierPurchaseSummary.map(sup => (
                <tr key={sup.supplier_id} className="hover:bg-neutral-50">
                  <td className="p-3 text-neutral-400 font-mono">SUP-{sup.supplier_id}</td>
                  <td className="p-3 font-semibold text-neutral-900">{sup.supplier_name}</td>
                  <td className="p-3 text-center font-mono">{sup.invoiceCount} 件</td>
                  <td className="p-3 text-right font-mono font-bold text-neutral-950">{formatCurrency(sup.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 border-t font-bold">
              <tr>
                <td colSpan={3} className="p-3.5 text-right text-neutral-600">総合計:</td>
                <td className="p-3.5 text-right font-mono text-sm text-neutral-950">{formatCurrency(currentMonthPurchaseTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};