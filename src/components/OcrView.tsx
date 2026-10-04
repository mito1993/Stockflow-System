import React from 'react';
import { TInvoiceLine, MItem, TabType } from '../types';

interface OcrViewProps {
  currentStoreInvoiceLines: TInvoiceLine[];
  setT_Invoice_Line: React.Dispatch<React.SetStateAction<TInvoiceLine[]>>;
  storeItems: MItem[];
  unresolvedInvoicesCount: number;
  selectedMonth: string;
  selectedStoreId: string;
  showToast: (message: string, type?: any) => void;
  setActiveTab: (tab: TabType) => void;
  saveSheetToGoogle?: (sheetName: any, headers: string[], records: any[]) => void;
}

export const OcrView: React.FC<OcrViewProps> = ({
  currentStoreInvoiceLines,
  setT_Invoice_Line,
  storeItems,
  unresolvedInvoicesCount,
  selectedMonth,
  selectedStoreId,
  showToast,
  setActiveTab,
  saveSheetToGoogle,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(val || 0);
  };

  const simulateOcrUpload = () => {
    showToast('AI/OCR解析を実行しています...', 'info');
    setTimeout(() => {
      const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
      const newLine: TInvoiceLine = {
        line_id: Date.now(),
        invoice_id: Date.now() + 1,
        file_url: '/dummy/uploaded.pdf',
        item_id: 1,
        item_name: 'ｷﾞｭｳ ﾊﾞﾗｽﾗｲｽ 15kg (特売)',
        inventory_target: true,
        supplier_id: 1,
        supplier_name: '肉のﾊﾅﾏｻ 渋谷店',
        quantity: 15,
        unit_price: 1350,
        total_price: 20250,
        is_manual_edited: false,
        unit: 'kg',
        converted_item_name: '牛バラ肉',
        converted_supplier_name: '肉のハナマサ 精肉部',
        is_new_item: false,
        is_new_supplier: false,
        status: '確認待ち',
        invoice_date: `${selectedMonth}-26`,
        store_id: targetStore,
      };

      setT_Invoice_Line(prev => {
        const updated = [newLine, ...prev];
        if (saveSheetToGoogle) {
          saveSheetToGoogle('T_Invoice_Line', [
            'line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target',
            'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price',
            'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name',
            'is_new_item', 'is_new_supplier'
          ], updated);
        }
        return updated;
      });

      showToast('OCR解析が完了しました。「牛バラ肉」へ名寄せ照合されました。', 'success');
    }, 800);
  };

  const handleLineItemChange = (line: TInvoiceLine, newItemId: string) => {
    const targetItem = storeItems.find(i => i.item_id === Number(newItemId));
    if (!targetItem) return;

    setT_Invoice_Line(prev => {
      const updated = prev.map(l => {
        if (l.line_id === line.line_id) {
          return {
            ...l,
            item_id: targetItem.item_id,
            converted_item_name: targetItem.item_name,
            unit: targetItem.unit,
            is_manual_edited: true,
          };
        }
        return l;
      });
      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Invoice_Line', [
          'line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target',
          'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price',
          'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name',
          'is_new_item', 'is_new_supplier'
        ], updated);
      }
      return updated;
    });

    showToast(`品目を「${targetItem.item_name}」に変更しました`, 'info');
  };

  const confirmSingleInvoiceLine = (line: TInvoiceLine) => {
    setT_Invoice_Line(prev => {
      const updated = prev.map(l => l.line_id === line.line_id ? { ...l, status: '確定' } : l);
      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Invoice_Line', [
          'line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target',
          'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price',
          'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name',
          'is_new_item', 'is_new_supplier'
        ], updated);
      }
      return updated;
    });
    showToast('伝票を確定しました', 'success');
  };

  const confirmAllPendingInvoices = () => {
    setT_Invoice_Line(prev => {
      const updated = prev.map(l => l.status !== '確定' ? { ...l, status: '確定' } : l);
      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Invoice_Line', [
          'line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target',
          'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price',
          'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name',
          'is_new_item', 'is_new_supplier'
        ], updated);
      }
      return updated;
    });
    showToast('未確定伝票を一括確定しました', 'success');
  };

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <div
        onClick={simulateOcrUpload}
        className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50/80 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 text-xl mb-3">
          <i className="fa-solid fa-cloud-arrow-up" />
        </div>
        <h3 className="font-bold text-neutral-900 text-sm mb-1">
          請求書・納品書の画像/PDFをアップロード（AI/OCR解析シミュレータ）
        </h3>
        <p className="text-xs text-neutral-500 max-w-lg mb-3">
          画像から食材名、取引先、数量、単価を自動抽出して名寄せレコメンドします。
        </p>
        <span className="px-3 py-1.5 bg-neutral-900 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5">
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          <span>クリックして新規伝票OCRをシミュレート</span>
        </span>
      </div>

      {/* 明細テーブル */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-neutral-700" />
              <span>仕入伝票明細・OCR解析結果一覧 (T_Invoice_Line)</span>
            </h2>
          </div>
          <button
            onClick={confirmAllPendingInvoices}
            disabled={unresolvedInvoicesCount === 0}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1.5"
          >
            <i className="fa-solid fa-check-double text-[11px]" />
            <span>未確定伝票を一括確定 ({unresolvedInvoicesCount})</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">伝票日付</th>
                <th className="p-3">取引先 (生OCR ➔ 名寄せ)</th>
                <th className="p-3">食材名 (生OCR ➔ マスタ候補)</th>
                <th className="p-3 text-center">単位</th>
                <th className="p-3 text-right">数量</th>
                <th className="p-3 text-right">単価(円)</th>
                <th className="p-3 text-right">総額(円)</th>
                <th className="p-3 text-center">修正</th>
                <th className="p-3 text-center">ステータス</th>
                <th className="p-3 text-center w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {currentStoreInvoiceLines.map(line => (
                <tr key={line.line_id} className="hover:bg-neutral-50">
                  <td className="p-3 text-neutral-500 font-mono">{line.invoice_date}</td>
                  <td className="p-3">
                    <div className="text-[10px] text-neutral-400 font-mono">生: {line.supplier_name}</div>
                    <div className="font-semibold text-neutral-900 mt-0.5">{line.converted_supplier_name}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-[10px] text-neutral-400 font-mono">生: {line.item_name}</div>
                    <div className="mt-1">
                      {line.status !== '確定' && line.item_id ? (
                        <select
                          value={line.item_id}
                          onChange={(e) => handleLineItemChange(line, e.target.value)}
                          className="p-1 px-2 bg-white border border-neutral-300 rounded text-xs font-medium text-neutral-900 outline-none"
                        >
                          {storeItems.map(item => (
                            <option key={item.item_id} value={item.item_id}>
                              {item.item_name} ({item.category})
                            </option>
                          ))}
                        </select>
                      ) : !line.item_id ? (
                        <button onClick={() => setActiveTab('matching')} className="text-[11px] underline font-bold text-neutral-900">
                          マッチング画面で紐付け ➔
                        </button>
                      ) : (
                        <div className="font-semibold text-neutral-900">{line.converted_item_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-1.5 py-0.5 bg-neutral-100 border text-[11px] font-mono">{line.unit}</span>
                  </td>
                  <td className="p-3 text-right font-mono">{line.quantity}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(line.unit_price)}</td>
                  <td className="p-3 text-right font-semibold font-mono">{formatCurrency(line.quantity * line.unit_price)}</td>
                  <td className="p-3 text-center">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {line.is_manual_edited ? '修正済' : 'AI初期値'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${line.status === '確定' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 border text-neutral-800'}`}>
                      {line.status || '確認待ち'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {line.status !== '確定' && line.item_id && (
                      <button
                        onClick={() => confirmSingleInvoiceLine(line)}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white font-medium rounded text-[11px]"
                      >
                        確定
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};