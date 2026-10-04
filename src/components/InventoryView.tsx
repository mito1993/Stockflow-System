import React, { useState } from 'react';
import { MItem, MSupplier, TCostCalculation, TInventoryCount } from '../types';

interface InventoryViewProps {
  currentStoreCostCalculations: TCostCalculation[];
  storeInventoryItems: MItem[];
  M_Supplier: MSupplier[];
  inventoryDraft: Record<number, string>;
  setInventoryDraft: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  selectedStoreId: string;
  selectedMonth: string;
  currentUserId: string;
  setT_Inventory_Count: React.Dispatch<React.SetStateAction<TInventoryCount[]>>;
  setM_Item: React.Dispatch<React.SetStateAction<MItem[]>>;
  showToast: (message: string, type?: any) => void;
  setActiveTab: (tab: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers: string[], records: any[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currentStoreCostCalculations,
  storeInventoryItems,
  M_Supplier,
  inventoryDraft,
  setInventoryDraft,
  selectedStoreId,
  selectedMonth,
  currentUserId,
  setT_Inventory_Count,
  setM_Item,
  showToast,
  saveSheetToGoogle,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const [showNewCountModal, setShowNewCountModal] = useState(false);
  const [newCountForm, setNewCountForm] = useState({
    item_name: '',
    category: '肉類',
    unit: 'kg',
    actual_quantity: '',
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(val || 0);
  };

  const categories = Array.from(new Set(storeInventoryItems.map(i => i.category)));

  const filteredItems = currentStoreCostCalculations.filter(i => {
    if (!i.inventory_target) return false;
    if (selectedCategory && i.category !== selectedCategory) return false;
    if (selectedSupplierId && i.supplier_id !== Number(selectedSupplierId)) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!i.item_name.toLowerCase().includes(kw) && !(i.category || '').toLowerCase().includes(kw)) {
        return false;
      }
    }
    return true;
  });

  const filledInventoryCount = storeInventoryItems.filter(item => {
    const val = inventoryDraft[item.item_id];
    return val !== '' && val !== undefined && val !== null;
  }).length;

  const quickAdjust = (itemId: number, diff: number) => {
    setInventoryDraft(prev => {
      const curr = Number(prev[itemId] || 0);
      return { ...prev, [itemId]: String(Math.max(0, curr + diff)) };
    });
  };

  const saveInventoryCounts = () => {
    let failSafeCount = 0;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setT_Inventory_Count(prev => {
      const updated = [...prev];

      storeInventoryItems.forEach(item => {
        let val = inventoryDraft[item.item_id];
        if (val === '' || val === undefined || val === null) {
          val = '0';
          failSafeCount++;
        }
        const num = Number(val);

        const existingIdx = updated.findIndex(c =>
          c.store_id === selectedStoreId &&
          c.target_month === selectedMonth &&
          c.item_id === item.item_id
        );

        if (existingIdx !== -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            actual_quantity: num,
            input_user_id: currentUserId,
            input_datetime: nowStr,
          };
        } else {
          updated.push({
            count_id: Date.now() + Math.floor(Math.random() * 1000),
            store_id: selectedStoreId === 'HQ' ? 'S001' : selectedStoreId,
            target_month: selectedMonth,
            item_id: item.item_id,
            actual_quantity: num,
            item_name: item.item_name,
            input_datetime: nowStr,
            input_user_id: currentUserId,
            is_new_count_flag: false,
          });
        }
      });

      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Inventory_Count', [
          'count_id', 'store_id', 'target_month', 'item_id', 'actual_quantity',
          'item_name', 'input_datetime', 'input_user_id', 'is_new_count_flag'
        ], updated);
      }

      return updated;
    });

    if (failSafeCount > 0) {
      showToast(`実地棚卸を保存（未入力 ${failSafeCount} 件を安全補完「0」処理）`, 'warning');
    } else {
      showToast(`全 ${storeInventoryItems.length} 品目の棚卸データを保存しました`, 'success');
    }
  };

  const handleAddNewCountItem = () => {
    if (!newCountForm.item_name.trim()) {
      showToast('食材・品目名を入力してください', 'error');
      return;
    }

    const newId = Date.now();
    const qty = Number(newCountForm.actual_quantity || 0);
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newItem: MItem = {
      item_id: newId,
      supplier_id: 1,
      item_name: newCountForm.item_name.trim(),
      category: newCountForm.category,
      unit: newCountForm.unit || '個',
      inventory_target: true,
      store_id: targetStore,
    };

    const newCount: TInventoryCount = {
      count_id: Date.now() + 1,
      store_id: targetStore,
      target_month: selectedMonth,
      item_id: newId,
      actual_quantity: qty,
      item_name: newCountForm.item_name.trim(),
      input_datetime: nowStr,
      input_user_id: currentUserId,
      is_new_count_flag: true,
    };

    setM_Item(prev => {
      const updated = [...prev, newItem];
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'], updated);
      return updated;
    });

    setT_Inventory_Count(prev => {
      const updated = [...prev, newCount];
      if (saveSheetToGoogle) saveSheetToGoogle('T_Inventory_Count', ['count_id', 'store_id', 'target_month', 'item_id', 'actual_quantity', 'item_name', 'input_datetime', 'input_user_id', 'is_new_count_flag'], updated);
      return updated;
    });

    setInventoryDraft(prev => ({ ...prev, [newId]: String(qty) }));
    setShowNewCountModal(false);
    showToast(`「${newCountForm.item_name}」を臨時品目（未照合）として登録しました`, 'success');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 案内バナー */}
      <div className="bg-neutral-950 text-white p-5 rounded-xl border border-neutral-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg shrink-0 text-white">
            <i className="fa-solid fa-tablet-screen-button" />
          </div>
          <div>
            <h2 className="font-bold text-sm md:text-base text-white">月次実地棚卸入力 (現場タブレットモード)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              品目マスタで「棚卸対象」に指定された品目のみ表示されています。未入力保存時は自動的に「0」補完されます。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs text-neutral-300">
          <i className="fa-solid fa-shield-halved text-neutral-400" />
          <span>自動補完(空欄 ➔ 0) 有効</span>
        </div>
      </div>

      {/* 検索・フィルタ */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 w-full items-center">
          <div className="relative flex-1 w-full">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-neutral-400 text-xs" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="品目名・カテゴリで検索..."
              className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-900 outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-40 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-800 outline-none"
          >
            <option value="">全カテゴリ ({storeInventoryItems.length})</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            value={selectedSupplierId}
            onChange={e => setSelectedSupplierId(e.target.value)}
            className="w-full sm:w-44 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-800 outline-none"
          >
            <option value="">全仕入先</option>
            {M_Supplier.map(sup => <option key={sup.supplier_id} value={sup.supplier_id}>{sup.supplier_name}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowNewCountModal(true)}
          className="w-full md:w-auto px-3.5 py-2 bg-neutral-900 hover:bg-black text-white font-medium text-xs rounded-md shadow-sm flex items-center justify-center gap-1.5 shrink-0"
        >
          <i className="fa-solid fa-plus text-[10px]" />
          <span>臨時品目の棚卸追加</span>
        </button>
      </div>

      {/* タブレット入力カードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map(item => {
          const draftVal = inventoryDraft[item.item_id] ?? '';
          const actualVal = draftVal === '' ? 0 : Number(draftVal);
          const consumptionVal = Math.max(0, item.beginning_stock + item.monthly_purchase - actualVal);

          return (
            <div
              key={item.item_id}
              className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-between ${
                draftVal !== '' ? 'border-neutral-900 bg-neutral-50/20' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-1.5 py-0.2 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[10px] font-mono">
                      {item.category}
                    </span>
                    <span className="text-xs text-neutral-500">{item.supplier_name}</span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">{item.item_name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">最新適用単価</div>
                  <div className="text-xs font-bold font-mono">{formatCurrency(item.latest_unit_price)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-neutral-50 border rounded-lg p-2.5 mb-3 text-center text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400">期首在庫</div>
                  <div className="text-xs font-bold font-mono mt-0.5">{item.beginning_stock} {item.unit}</div>
                </div>
                <div className="border-x border-neutral-200">
                  <div className="text-[10px] text-neutral-400">当月仕入</div>
                  <div className="text-xs font-bold font-mono mt-0.5">+{item.monthly_purchase} {item.unit}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">当月消費(自動)</div>
                  <div className="text-xs font-bold font-mono mt-0.5">{consumptionVal} {item.unit}</div>
                </div>
              </div>

              {/* タブレットタッチ用入力エリア */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={draftVal}
                    onChange={e => setInventoryDraft(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                    placeholder="未入力(0扱い)"
                    className="w-full p-2.5 text-center text-xl font-bold bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg shadow-sm outline-none font-mono"
                  />
                  <span className="absolute right-3 top-3 text-xs font-medium text-neutral-400 pointer-events-none">
                    {item.unit}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button onClick={() => quickAdjust(item.item_id, 1)} className="w-9 h-7 bg-neutral-100 border rounded text-xs font-semibold">+1</button>
                    <button onClick={() => quickAdjust(item.item_id, 5)} className="w-9 h-7 bg-neutral-100 border rounded text-xs font-semibold">+5</button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => quickAdjust(item.item_id, -1)} className="w-9 h-7 bg-neutral-100 border rounded text-xs font-semibold">-1</button>
                    <button onClick={() => setInventoryDraft(prev => ({ ...prev, [item.item_id]: '0' }))} className="w-9 h-7 bg-neutral-200 border rounded text-[11px] font-bold">0</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 固定下部保存バー */}
      <div className="fixed bottom-0 left-60 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3.5 px-8 flex items-center justify-between z-20 shadow-lg">
        <div className="text-xs text-neutral-700 font-medium">
          対象品目: {storeInventoryItems.length} 品目中 <strong className="font-bold font-mono">{filledInventoryCount}</strong> 品目入力済
        </div>
        <button
          onClick={saveInventoryCounts}
          className="px-6 py-2 bg-neutral-900 hover:bg-black text-white font-semibold text-xs rounded-md shadow flex items-center gap-2"
        >
          <i className="fa-solid fa-floppy-disk text-xs" />
          <span>実地棚卸データを保存する</span>
        </button>
      </div>

      {/* 臨時品目の棚卸追加モーダル */}
      {showNewCountModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">臨時品目の棚卸追加</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">食材・品目名 *</label>
                <input
                  type="text"
                  value={newCountForm.item_name}
                  onChange={e => setNewCountForm({ ...newCountForm, item_name: e.target.value })}
                  placeholder="例: 特選黒毛和牛イチボ"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">カテゴリ</label>
                  <select
                    value={newCountForm.category}
                    onChange={e => setNewCountForm({ ...newCountForm, category: e.target.value })}
                    className="w-full px-2.5 py-2 bg-neutral-50 border rounded-lg"
                  >
                    <option value="肉類">肉類</option>
                    <option value="野菜類">野菜類</option>
                    <option value="魚介類">魚介類</option>
                    <option value="穀物">穀物</option>
                    <option value="調味料">調味料</option>
                    <option value="飲料・酒類">飲料・酒類</option>
                    <option value="その他食材">その他食材</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">管理単位</label>
                  <input
                    type="text"
                    value={newCountForm.unit}
                    onChange={e => setNewCountForm({ ...newCountForm, unit: e.target.value })}
                    placeholder="kg / 本 / 箱"
                    className="w-full px-3 py-2 bg-neutral-50 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">実地棚卸数量 *</label>
                <input
                  type="number"
                  value={newCountForm.actual_quantity}
                  onChange={e => setNewCountForm({ ...newCountForm, actual_quantity: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg font-mono font-bold text-lg text-center"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t">
              <button onClick={() => setShowNewCountModal(false)} className="px-4 py-2 bg-neutral-100 text-xs font-semibold rounded-lg">キャンセル</button>
              <button onClick={handleAddNewCountItem} className="px-5 py-2 bg-neutral-950 text-white text-xs font-bold rounded-lg">登録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};