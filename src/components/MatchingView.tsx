import React, { useState } from 'react';
import { TInventoryCount, TInvoiceLine, MItem, MSupplier, MatchingHistoryItem } from '../types';
import { formatCurrency, getNowShortDateTimeString } from '../utils/formatters';

interface MatchingViewProps {
  unlinkedCountItems: TInventoryCount[];
  unlinkedInvoiceLines: TInvoiceLine[];
  storeItems: MItem[];
  M_Supplier: MSupplier[];
  currentStoreInvoiceLines: TInvoiceLine[];
  setT_Invoice_Line: React.Dispatch<React.SetStateAction<TInvoiceLine[]>>;
  setT_Inventory_Count: React.Dispatch<React.SetStateAction<TInventoryCount[]>>;
  setM_Item: React.Dispatch<React.SetStateAction<MItem[]>>;
  showToast: (message: string, type?: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers?: string[], records?: any[]) => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  unlinkedCountItems,
  unlinkedInvoiceLines,
  storeItems,
  M_Supplier,
  currentStoreInvoiceLines,
  setT_Invoice_Line,
  setT_Inventory_Count,
  setM_Item,
  showToast,
  saveSheetToGoogle,
}) => {
  const [matchingSourceType, setMatchingSourceType] = useState<'inventory' | 'invoice'>('inventory');
  const [selectedMatchingCount, setSelectedMatchingCount] = useState<TInventoryCount | null>(unlinkedCountItems[0] || null);
  const [selectedMatchingLine, setSelectedMatchingLine] = useState<TInvoiceLine | null>(unlinkedInvoiceLines[0] || null);

  const [matchingTargetTab, setMatchingTargetTab] = useState<'invoice' | 'existing_item' | 'new_item'>('invoice');
  const [selectedTargetInvoiceLine, setSelectedTargetInvoiceLine] = useState<TInvoiceLine | null>(currentStoreInvoiceLines[0] || null);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<number | null>(storeItems[0]?.item_id || null);

  const [newMasterItemForm, setNewMasterItemForm] = useState({
    item_name: '',
    category: '肉類',
    supplier_id: 1,
    unit: 'kg',
    inventory_target: true,
  });

  const [matchingHistory, setMatchingHistory] = useState<MatchingHistoryItem[]>([
    {
      history_id: 1,
      matched_at: '2026-09-24 14:15',
      supplier_name: '肉のハナマサ',
      raw_item_name: '国産 牛ﾊﾞﾗ ｽﾗｲｽ',
      target_item_name: '牛バラ肉',
      item_id: 1,
      quantity: 20,
      unit: 'kg',
      unit_price: 1300,
      operator: 'owner@example.com',
    }
  ]);

  const canExecuteMatch = () => {
    if (matchingSourceType === 'inventory') {
      if (!selectedMatchingCount) return false;
      if (matchingTargetTab === 'invoice') return !!selectedTargetInvoiceLine;
      if (matchingTargetTab === 'existing_item') return !!selectedTargetItemId;
      if (matchingTargetTab === 'new_item') return !!newMasterItemForm.item_name.trim();
    } else {
      if (!selectedMatchingLine) return false;
      if (matchingTargetTab === 'existing_item') return !!selectedTargetItemId;
      if (matchingTargetTab === 'new_item') return !!newMasterItemForm.item_name.trim();
    }
    return false;
  };

  const executeMatching = () => {
    const nowStr = getNowShortDateTimeString();

    if (matchingSourceType === 'inventory' && selectedMatchingCount) {
      const cnt = selectedMatchingCount;

      if (matchingTargetTab === 'invoice' && selectedTargetInvoiceLine) {
        const line = selectedTargetInvoiceLine;
        const unifiedItemId = line.item_id || cnt.item_id;

        // T_Inventory_Count 新規フラグ解除
        setT_Inventory_Count(prev => {
          const updated = prev.map(c => c.count_id === cnt.count_id ? { ...c, is_new_count_flag: false, item_id: unifiedItemId } : c);
          if (saveSheetToGoogle) saveSheetToGoogle('T_Inventory_Count', undefined, updated);
          return updated;
        });

        // T_Invoice_Line 紐付け更新
        setT_Invoice_Line(prev => {
          const updated = prev.map(l => l.line_id === line.line_id ? { ...l, item_id: unifiedItemId, converted_item_name: cnt.item_name, is_new_item: false } : l);
          if (saveSheetToGoogle) saveSheetToGoogle('T_Invoice_Line', undefined, updated);
          return updated;
        });

        setMatchingHistory(prev => [
          {
            history_id: Date.now(),
            matched_at: nowStr,
            supplier_name: line.supplier_name,
            raw_item_name: line.item_name,
            target_item_name: cnt.item_name,
            item_id: unifiedItemId,
            line_id: line.line_id,
            count_id: cnt.count_id,
            quantity: line.quantity,
            actual_quantity: cnt.actual_quantity,
            unit: line.unit,
            unit_price: line.unit_price,
            operator: 'owner@example.com',
          },
          ...prev,
        ]);

        showToast(`棚卸品目「${cnt.item_name}」と仕入伝票をID統合・紐付け完了しました`, 'success');
        setSelectedMatchingCount(null);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 案内ヘッダー */}
      <div className="bg-neutral-950 text-white p-5 rounded-xl border border-neutral-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg shrink-0 text-white">
            <i className="fa-solid fa-link" />
          </div>
          <div>
            <h2 className="font-bold text-sm md:text-base text-white flex items-center gap-2">
              <span>棚卸・OCRマッチング専用画面</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">v4.0 独立機能</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              現場で仮登録された「仮棚卸品目」を、後から受領した「OCR仕入伝票」と紐付けて品目IDを統合します。
            </p>
          </div>
        </div>
      </div>

      {/* 2カラムワークスペース */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ベースデータ選択 (左カラム) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-neutral-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-mono">1</span>
              <span>ベース①: 仕入データ未紐付けの棚卸データを選択</span>
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-600 bg-neutral-100 border px-2 py-0.5 rounded">
              {unlinkedCountItems.length} 件該当
            </span>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-3 max-h-[540px] overflow-y-auto space-y-2.5">
            {unlinkedCountItems.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                現在、仕入未紐付けの臨時棚卸データはありません。
              </div>
            ) : (
              unlinkedCountItems.map(cnt => (
                <div
                  key={cnt.count_id}
                  onClick={() => setSelectedMatchingCount(cnt)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedMatchingCount?.count_id === cnt.count_id ? 'border-neutral-950 bg-neutral-50 ring-2 ring-neutral-950 shadow-sm' : 'border-neutral-200 hover:border-neutral-400 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-950 text-white">
                      <i className="fa-solid fa-sparkles text-[8px] mr-1" />現場先行登録（未照合）
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{cnt.input_datetime}</span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-neutral-400 font-mono">現場登録品目名:</div>
                      <div className="text-sm font-bold text-neutral-900">{cnt.item_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-mono">実地数量:</div>
                      <div className="text-base font-bold font-mono text-neutral-950">{cnt.actual_quantity}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 突合先選択 (右カラム) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-neutral-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-mono">2</span>
              <span>突合先②: 対象の仕入データ（OCR）を選択</span>
            </h3>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {currentStoreInvoiceLines.map(line => (
                <div
                  key={line.line_id}
                  onClick={() => setSelectedTargetInvoiceLine(line)}
                  className={`p-2.5 rounded-md border cursor-pointer text-xs ${
                    selectedTargetInvoiceLine?.line_id === line.line_id ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 hover:border-neutral-400 bg-white text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px]">{line.invoice_date} ({line.supplier_name})</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-neutral-100 text-neutral-700">{line.status}</span>
                  </div>
                  <div className="font-bold text-xs">{line.item_name}</div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
                    <span>数量: {line.quantity}{line.unit}</span>
                    <span>単価: {formatCurrency(line.unit_price)}</span>
                    <span className="font-bold">計 {formatCurrency(line.quantity * line.unit_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={executeMatching}
              disabled={!canExecuteMatch()}
              className="w-full py-2.5 px-4 bg-neutral-950 hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-link text-xs" />
              <span>選択した2件を紐付け・ID統合を実行する</span>
            </button>
          </div>
        </div>
      </div>

      {/* 履歴テーブル */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60">
          <h3 className="font-bold text-neutral-900 text-xs flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-neutral-700" />
            <span>紐付け完了履歴（手動マッチング監査ログ）</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">紐付け日時</th>
                <th className="p-3">取引先</th>
                <th className="p-3">OCR元データ名</th>
                <th className="p-3">紐付け品目名 (ID統合後)</th>
                <th className="p-3 text-right">数量</th>
                <th className="p-3 text-right">適用単価</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {matchingHistory.map(h => (
                <tr key={h.history_id} className="hover:bg-neutral-50">
                  <td className="p-3 font-mono text-neutral-500">{h.matched_at}</td>
                  <td className="p-3 text-neutral-700">{h.supplier_name}</td>
                  <td className="p-3 font-mono text-neutral-600">{h.raw_item_name}</td>
                  <td className="p-3 font-bold text-neutral-950">{h.target_item_name}</td>
                  <td className="p-3 text-right font-mono">{h.quantity} {h.unit}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(h.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};