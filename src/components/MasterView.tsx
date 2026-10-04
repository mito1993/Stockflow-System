import React from 'react';
import { MItem, MSupplier, TInvoiceLine } from '../types';

interface MasterViewProps {
  M_Item: MItem[];
  setM_Item: React.Dispatch<React.SetStateAction<MItem[]>>;
  M_Supplier: MSupplier[];
  setM_Supplier: React.Dispatch<React.SetStateAction<MSupplier[]>>;
  setT_Invoice_Line: React.Dispatch<React.SetStateAction<TInvoiceLine[]>>;
  selectedStoreId: string;
  showToast: (message: string, type?: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers: string[], records: any[]) => void;
}

export const MasterView: React.FC<MasterViewProps> = ({
  M_Item,
  setM_Item,
  M_Supplier,
  setM_Supplier,
  setT_Invoice_Line,
  selectedStoreId,
  showToast,
  saveSheetToGoogle,
}) => {
  const getSupplierName = (id: number) => M_Supplier.find(s => s.supplier_id === id)?.supplier_name || '不明';

  const toggleInventoryTarget = (item: MItem) => {
    setM_Item(prev => {
      const updated = prev.map(i => i.item_id === item.item_id ? { ...i, inventory_target: !i.inventory_target } : i);
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'], updated);
      return updated;
    });
    showToast(`「${item.item_name}」の棚卸対象フラグを変更しました`, 'info');
  };

  const handleEditItemName = (item: MItem) => {
    const oldName = item.item_name;
    const newName = prompt('品目名を変更します（過去データ・伝票へ自動引き継ぎ）:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;

    const trimmed = newName.trim();

    setM_Item(prev => {
      const updated = prev.map(i => i.item_id === item.item_id ? { ...i, item_name: trimmed } : i);
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'], updated);
      return updated;
    });

    setT_Invoice_Line(prev => {
      const updated = prev.map(l => l.item_id === item.item_id ? { ...l, converted_item_name: trimmed } : l);
      if (saveSheetToGoogle) saveSheetToGoogle('T_Invoice_Line', ['line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target', 'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price', 'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name', 'is_new_item', 'is_new_supplier'], updated);
      return updated;
    });

    showToast(`品目名を「${trimmed}」へ更新しました`, 'success');
  };

  const handleAddNewItem = () => {
    const name = prompt('追加する品目名を入力してください:', '豚バラ肉');
    if (!name || !name.trim()) return;

    const newId = Date.now();
    const newItem: MItem = {
      item_id: newId,
      supplier_id: 1,
      item_name: name.trim(),
      category: '肉類',
      unit: 'kg',
      inventory_target: true,
      store_id: selectedStoreId === 'HQ' ? 'S001' : selectedStoreId,
    };

    setM_Item(prev => {
      const updated = [...prev, newItem];
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'], updated);
      return updated;
    });

    showToast(`品目「${name.trim()}」を追加しました`, 'success');
  };

  const handleDeleteItem = (itemId: number) => {
    if (!confirm('この品目を削除しますか？')) return;
    setM_Item(prev => {
      const updated = prev.filter(i => i.item_id !== itemId);
      if (saveSheetToGoogle) saveSheetToGoogle('M_Item', ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'], updated);
      return updated;
    });
    showToast('品目を削除しました', 'warning');
  };

  const handleAddNewSupplier = () => {
    const name = prompt('仕入先名を入力してください:', '築地 水産問屋');
    if (!name || !name.trim()) return;

    const newId = Date.now();
    const newSup: MSupplier = {
      supplier_id: newId,
      supplier_name: name.trim(),
      contact: '03-0000-0000',
    };

    setM_Supplier(prev => {
      const updated = [...prev, newSup];
      if (saveSheetToGoogle) saveSheetToGoogle('M_Supplier', ['supplier_id', 'supplier_name', 'contact'], updated);
      return updated;
    });

    showToast(`仕入先「${name.trim()}」を追加しました`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* M_Item Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-cube text-neutral-700" />
              <span>取引先×品目マスタ (M_Item)</span>
            </h2>
          </div>
          <button
            onClick={handleAddNewItem}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]" />
            <span>新規品目追加</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">品目ID</th>
                <th className="p-3">仕入先名</th>
                <th className="p-3">品目名</th>
                <th className="p-3">カテゴリ</th>
                <th className="p-3">単位</th>
                <th className="p-3 text-center">棚卸対象(D列)</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {M_Item.map(item => (
                <tr key={item.item_id} className={`hover:bg-neutral-50 ${!item.inventory_target ? 'opacity-50' : ''}`}>
                  <td className="p-3 font-mono text-neutral-400">ITEM-{item.item_id}</td>
                  <td className="p-3 text-neutral-800">{getSupplierName(item.supplier_id)}</td>
                  <td className="p-3 font-bold text-neutral-900">
                    <div className="flex items-center gap-2">
                      <span>{item.item_name}</span>
                      <button onClick={() => handleEditItemName(item)} className="text-neutral-400 hover:text-black">
                        <i className="fa-solid fa-pen text-[9px]" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-mono">{item.category}</td>
                  <td className="p-3 font-mono">{item.unit}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleInventoryTarget(item)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${item.inventory_target ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'}`}
                    >
                      {item.inventory_target ? '対象(TRUE)' : '対象外(FALSE)'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleDeleteItem(item.item_id)} className="text-neutral-400 hover:text-black">
                      <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* M_Supplier Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-building text-neutral-700" />
            <span>仕入先マスタ (M_Supplier)</span>
          </h2>
          <button
            onClick={handleAddNewSupplier}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]" />
            <span>新規仕入先追加</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">仕入先ID</th>
                <th className="p-3">仕入先名</th>
                <th className="p-3">連絡先</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {M_Supplier.map(sup => (
                <tr key={sup.supplier_id} className="hover:bg-neutral-50">
                  <td className="p-3 font-mono text-neutral-400">SUP-{sup.supplier_id}</td>
                  <td className="p-3 font-semibold text-neutral-900">{sup.supplier_name}</td>
                  <td className="p-3 font-mono text-neutral-600">{sup.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};