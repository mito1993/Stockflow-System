import React, { useState } from 'react';
import { MItem, MSupplier, TCostCalculation, TInventoryCount, MUser, MStore, TInventoryLock } from '../types';
import { formatCurrency, getNowDateTimeString, formatMonthJP } from '../utils/formatters';
import { openPrintInventorySheet } from '../utils/printInventorySheet';

interface InventoryViewProps {
  currentStoreCostCalculations: TCostCalculation[];
  storeInventoryItems: MItem[];
  M_Supplier: MSupplier[];
  inventoryDraft: Record<number, string>;
  setInventoryDraft: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  selectedStoreId: string;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  currentUserId: string;
  currentUser: MUser;
  currentStore: MStore;
  inventoryLocks: TInventoryLock[];
  setInventoryLocks: React.Dispatch<React.SetStateAction<TInventoryLock[]>>;
  setT_Inventory_Count: React.Dispatch<React.SetStateAction<TInventoryCount[]>>;
  setM_Item: React.Dispatch<React.SetStateAction<MItem[]>>;
  showToast: (message: string, type?: any) => void;
  setActiveTab: (tab: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers?: string[], records?: any[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currentStoreCostCalculations,
  storeInventoryItems,
  M_Supplier,
  inventoryDraft,
  setInventoryDraft,
  selectedStoreId,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  currentUserId,
  currentUser,
  currentStore,
  inventoryLocks,
  setInventoryLocks,
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

  // 対象店舗かつ対象年月のロック状態を判定
  const targetStoreId = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
  const currentMonthLock = inventoryLocks.find(
    l => l.store_id === targetStoreId && l.target_month === selectedMonth
  );
  const isMonthLocked = currentMonthLock ? currentMonthLock.is_locked : false;

  // ロック操作権限の判定（開発者または本部権限者のみ可能）
  const canLockToggle = currentUser.role === 'developer' || currentUser.role === 'hq';

  const categories = Array.from(new Set(storeInventoryItems.map(i => i.category)));

  // 「当月の仕入れ記録（monthly_purchase > 0）」または「期首の在庫記録（beginning_stock > 0）」がある食材のみ表示
  const filteredItems = currentStoreCostCalculations.filter(i => {
    if (!i.inventory_target) return false;

    const hasActivity = i.monthly_purchase > 0 || i.beginning_stock > 0;
    if (!hasActivity) return false;

    if (selectedCategory && i.category !== selectedCategory) return false;
    if (selectedSupplierId && i.supplier_id !== Number(selectedSupplierId)) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!i.item_name?.toLowerCase().includes(kw) && !(i.category || '').toLowerCase().includes(kw)) {
        return false;
      }
    }
    return true;
  });

  const filledInventoryCount = filteredItems.filter(item => {
    const val = inventoryDraft[item.item_id];
    return val !== '' && val !== undefined && val !== null;
  }).length;

  const quickAdjust = (itemId: number, diff: number) => {
    if (isMonthLocked) return;
    setInventoryDraft(prev => {
      const curr = Number(prev[itemId] || 0);
      return { ...prev, [itemId]: String(Math.max(0, curr + diff)) };
    });
  };

  // 棚卸ロック・解除のトグル処理
  const handleToggleLock = () => {
    if (!canLockToggle) {
      showToast('棚卸のロック/解除は開発者または本部権限のみ可能です', 'error');
      return;
    }

    const nextLockState = !isMonthLocked;
    const nowStr = getNowDateTimeString();

    setInventoryLocks(prev => {
      const existsIndex = prev.findIndex(
        l => l.store_id === targetStoreId && l.target_month === selectedMonth
      );
      let updated: TInventoryLock[];
      if (existsIndex !== -1) {
        updated = [...prev];
        updated[existsIndex] = {
          ...updated[existsIndex],
          is_locked: nextLockState,
          locked_at: nowStr,
          locked_by: currentUserId,
        };
      } else {
        updated = [
          ...prev,
          {
            store_id: targetStoreId,
            target_month: selectedMonth,
            is_locked: nextLockState,
            locked_at: nowStr,
            locked_by: currentUserId,
          },
        ];
      }
      return updated;
    });

    if (nextLockState) {
      showToast(`「${formatMonthJP(selectedMonth)}」の実地棚卸を確定・ロックしました`, 'warning');
    } else {
      showToast(`「${formatMonthJP(selectedMonth)}」の実地棚卸ロックを解除しました`, 'info');
    }
  };

  const saveInventoryCounts = () => {
    if (isMonthLocked) {
      showToast('この月は棚卸確定済みのため保存できません', 'error');
      return;
    }

    let failSafeCount = 0;
    const nowStr = getNowDateTimeString();

    setT_Inventory_Count(prev => {
      const updated = [...prev];

      filteredItems.forEach(item => {
        let val = inventoryDraft[item.item_id];
        if (val === '' || val === undefined || val === null) {
          val = '0';
          failSafeCount++;
        }
        const num = Number(val);

        const existingIdx = updated.findIndex(
          c =>
            c.store_id === targetStoreId &&
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
            store_id: targetStoreId,
            target_month: selectedMonth,
            item_id: item.item_id,
            actual_quantity: num,
            item_name: item.item_name || '',
            input_datetime: nowStr,
            input_user_id: currentUserId,
            is_new_count_flag: false,
          });
        }
      });

      if (saveSheetToGoogle) {
        saveSheetToGoogle('T_Inventory_Count', undefined, updated);
      }

      return updated;
    });

    if (failSafeCount > 0) {
      showToast(`実地棚卸を保存（未入力 ${failSafeCount} 件を安全補完「0」処理）`, 'warning');
    } else {
      showToast(`表示中の全 ${filteredItems.length} 食材の棚卸データを保存しました`, 'success');
    }
  };

  const handleAddNewCountItem = () => {
    if (isMonthLocked) {
      showToast('ロック中は品目追加できません', 'error');
      return;
    }

    if (!newCountForm.item_name.trim()) {
      showToast('食材名を入力してください', 'error');
      return;
    }

    const newId = Date.now();
    const qty = Number(newCountForm.actual_quantity || 0);
    const nowStr = getNowDateTimeString();

    const newItem: MItem = {
      item_id: newId,
      supplier_id: 1,
      item_name: newCountForm.item_name.trim(),
      category: newCountForm.category,
      unit: newCountForm.unit || '個',
      inventory_target: true,
      store_id: targetStoreId,
    };

    const newCount: TInventoryCount = {
      count_id: Date.now() + 1,
      store_id: targetStoreId,
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
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', undefined, updated);
      return updated;
    });

    setT_Inventory_Count(prev => {
      const updated = [...prev, newCount];
      if (saveSheetToGoogle) saveSheetToGoogle('T_Inventory_Count', undefined, updated);
      return updated;
    });

    setInventoryDraft(prev => ({ ...prev, [newId]: String(qty) }));
    setShowNewCountModal(false);
    showToast(`「${newCountForm.item_name}」を臨時食材（未照合）として登録しました`, 'success');
  };

  // PDF帳票印刷の起動
  const handlePrintSheet = () => {
    openPrintInventorySheet({
      targetMonth: selectedMonth,
      currentStore,
      items: filteredItems,
      isLocked: isMonthLocked,
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 上部コントロールバー：棚卸実行年月設定 ＆ ロック制御 ＆ PDF帳票出力 */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <i className="fa-regular fa-calendar-days text-neutral-600" />
              <span>棚卸実行年月:</span>
            </span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="p-1.5 px-3 bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 outline-none cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthJP(m)} 度
                </option>
              ))}
            </select>
          </div>

          {/* ロック状態表示バッジ */}
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 ${
              isMonthLocked
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <i className={`fa-solid ${isMonthLocked ? 'fa-lock' : 'fa-lock-open'}`} />
            <span>{isMonthLocked ? '棚卸確定・ロック済 (読取専用)' : '入力受付中'}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* PDF帳票出力ボタン */}
          <button
            onClick={handlePrintSheet}
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="現場記入用のA4棚卸表をPDF印刷します"
          >
            <i className="fa-solid fa-print text-neutral-600 text-xs" />
            <span>棚卸表を印刷 / PDF出力</span>
          </button>

          {/* 本部・開発者限定 棚卸ロック/解除ボタン */}
          {canLockToggle && (
            <button
              onClick={handleToggleLock}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                isMonthLocked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <i className={`fa-solid ${isMonthLocked ? 'fa-unlock' : 'fa-lock'}`} />
              <span>{isMonthLocked ? 'この月のロックを解除' : 'この月の棚卸をロック'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ロック警告アラートバナー */}
      {isMonthLocked && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-600 text-lg shrink-0" />
          <div className="text-xs">
            <span className="font-bold">「{formatMonthJP(selectedMonth)}」の棚卸データは確定ロックされています。</span>
            <p className="text-red-700 mt-0.5">数値の変更や品目追加は行えません。数値を修正する必要がある場合は本部または開発者にロック解除を依頼してください。</p>
          </div>
        </div>
      )}

      {/* 検索・フィルタ */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 w-full items-center">
          <div className="relative flex-1 w-full">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-neutral-400 text-xs" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="食材名・カテゴリで検索..."
              className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-900 outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-40 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-800 outline-none"
          >
            <option value="">全カテゴリ ({filteredItems.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedSupplierId}
            onChange={e => setSelectedSupplierId(e.target.value)}
            className="w-full sm:w-44 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-medium text-neutral-800 outline-none"
          >
            <option value="">全仕入先</option>
            {M_Supplier.map(sup => (
              <option key={sup.supplier_id} value={sup.supplier_id}>
                {sup.supplier_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowNewCountModal(true)}
          disabled={isMonthLocked}
          className="w-full md:w-auto px-3.5 py-2 bg-neutral-900 hover:bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium text-xs rounded-md shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors"
        >
          <i className="fa-solid fa-plus text-[10px]" />
          <span>臨時食材の棚卸追加</span>
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
              } ${isMonthLocked ? 'opacity-85' : ''}`}
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
                  <div className="text-xs font-bold font-mono mt-0.5">
                    {item.beginning_stock} {item.unit}
                  </div>
                </div>
                <div className="border-x border-neutral-200">
                  <div className="text-[10px] text-neutral-400">当月仕入</div>
                  <div className="text-xs font-bold font-mono mt-0.5">
                    +{item.monthly_purchase} {item.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">当月消費(自動)</div>
                  <div className="text-xs font-bold font-mono mt-0.5">
                    {consumptionVal} {item.unit}
                  </div>
                </div>
              </div>

              {/* 入力エリア */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    disabled={isMonthLocked}
                    value={draftVal}
                    onChange={e => setInventoryDraft(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                    placeholder="未入力(0扱い)"
                    className={`w-full p-2.5 text-center text-xl font-bold bg-white border rounded-lg shadow-sm outline-none font-mono ${
                      isMonthLocked
                        ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed'
                        : 'border-neutral-300 focus:border-neutral-900 text-neutral-900'
                    }`}
                  />
                  <span className="absolute right-3 top-3 text-xs font-medium text-neutral-400 pointer-events-none">
                    {item.unit}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => quickAdjust(item.item_id, 1)}
                      disabled={isMonthLocked}
                      className="w-9 h-7 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 border rounded text-xs font-semibold cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => quickAdjust(item.item_id, 5)}
                      disabled={isMonthLocked}
                      className="w-9 h-7 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 border rounded text-xs font-semibold cursor-pointer"
                    >
                      +5
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => quickAdjust(item.item_id, -1)}
                      disabled={isMonthLocked}
                      className="w-9 h-7 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 border rounded text-xs font-semibold cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => !isMonthLocked && setInventoryDraft(prev => ({ ...prev, [item.item_id]: '0' }))}
                      disabled={isMonthLocked}
                      className="w-9 h-7 bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50 border rounded text-[11px] font-bold cursor-pointer"
                    >
                      0
                    </button>
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
          対象食材: {filteredItems.length} 件中 <strong className="font-bold font-mono">{filledInventoryCount}</strong> 件入力済
        </div>
        <button
          onClick={saveInventoryCounts}
          disabled={isMonthLocked}
          className="px-6 py-2 bg-neutral-900 hover:bg-black disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-md shadow flex items-center gap-2 cursor-pointer transition-colors"
        >
          <i className="fa-solid fa-floppy-disk text-xs" />
          <span>{isMonthLocked ? '確定済みのため保存不可' : '実地棚卸データを保存する'}</span>
        </button>
      </div>

      {/* 臨時食材の棚卸追加モーダル */}
      {showNewCountModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">臨時食材の棚卸追加</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">食材名 *</label>
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
              <button
                onClick={() => setShowNewCountModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddNewCountItem}
                className="px-5 py-2 bg-neutral-950 hover:bg-black text-white text-xs font-bold rounded-lg"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};