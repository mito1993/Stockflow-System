import React from 'react';
import { MStore, MUser, TMonthlySales } from '../types';

interface SystemViewProps {
  M_Store: MStore[];
  setM_Store: React.Dispatch<React.SetStateAction<MStore[]>>;
  M_User: MUser[];
  setM_User: React.Dispatch<React.SetStateAction<MUser[]>>;
  T_Monthly_Sales: TMonthlySales[];
  setT_Monthly_Sales: React.Dispatch<React.SetStateAction<TMonthlySales[]>>;
  showToast: (message: string, type?: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers: string[], records: any[]) => void;
}

export const SystemView: React.FC<SystemViewProps> = ({
  M_Store,
  setM_Store,
  M_User,
  setM_User,
  T_Monthly_Sales,
  setT_Monthly_Sales,
  showToast,
  saveSheetToGoogle,
}) => {
  const getStoreName = (id: string) => {
    if (id === 'HQ') return '本部 (全店舗)';
    return M_Store.find(s => s.store_id === id)?.store_name || id;
  };

  const handleFiscalMonthChange = (storeId: string, month: number) => {
    setM_Store(prev => {
      const updated = prev.map(s => s.store_id === storeId ? { ...s, fiscal_month: month } : s);
      if (saveSheetToGoogle) saveSheetToGoogle('M_Store', ['store_id', 'store_name', 'address', 'fiscal_month'], updated);
      return updated;
    });
    showToast('店舗の決算月設定を更新しました', 'success');
  };

  const handleAddNewUser = () => {
    const email = prompt('ユーザーのメールアドレスを入力してください:', 'staff2@example.com');
    if (!email || !email.trim()) return;

    const newUser: MUser = {
      user_id: email.trim(),
      password: 'password123',
      user_name: '新規スタッフ',
      role: 'staff',
      store_id: 'S001',
    };

    setM_User(prev => {
      const updated = [...prev, newUser];
      if (saveSheetToGoogle) saveSheetToGoogle('M_User', ['user_id', 'password', 'user_name', 'role', 'store_id'], updated);
      return updated;
    });

    showToast(`ユーザー「${email.trim()}」を追加しました`, 'success');
  };

  const handleSalesAmountChange = (salesId: number, amount: number) => {
    setT_Monthly_Sales(prev => {
      const updated = prev.map(s => s.sales_id === salesId ? { ...s, sales_amount: amount } : s);
      if (saveSheetToGoogle) saveSheetToGoogle('T_Monthly_Sales', ['sales_id', 'store_id', 'target_month', 'sales_amount'], updated);
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* M_Store */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <h2 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <i className="fa-solid fa-shop text-neutral-700" />
          <span>店舗マスタ・決算月設定 (M_Store)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {M_Store.map(store => (
            <div key={store.store_id} className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="font-bold text-neutral-900 text-sm">{store.store_name}</div>
                <span className="text-xs font-mono text-neutral-400">ID: {store.store_id}</span>
              </div>
              <div className="text-xs text-neutral-500 mb-2.5">{store.address}</div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs font-medium">決算月:</span>
                <select
                  value={store.fiscal_month}
                  onChange={e => handleFiscalMonthChange(store.store_id, Number(e.target.value))}
                  className="px-2 py-1 bg-white border rounded text-xs font-bold"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月 決算</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* M_User */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-users text-neutral-700" />
            <span>ユーザー管理 (M_User)</span>
          </h2>
          <button
            onClick={handleAddNewUser}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-user-plus text-[10px]" />
            <span>新規ユーザー追加</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">ユーザーID (メール)</th>
                <th className="p-3">氏名</th>
                <th className="p-3">権限</th>
                <th className="p-3">所属店舗</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {M_User.map(user => (
                <tr key={user.user_id} className="hover:bg-neutral-50">
                  <td className="p-3 font-mono font-medium text-neutral-800">{user.user_id}</td>
                  <td className="p-3 font-bold text-neutral-900">{user.user_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 border text-[10px] font-bold">
                      {user.role === 'hq' ? '本部' : user.role === 'owner' ? 'オーナー' : 'スタッフ'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-neutral-600">{getStoreName(user.store_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* T_Monthly_Sales */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-yen-sign text-neutral-700" />
            <span>月次売上額一括管理 (T_Monthly_Sales)</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">対象店舗</th>
                <th className="p-3">対象月</th>
                <th className="p-3 text-right font-bold">売上高 (円)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {T_Monthly_Sales.map(sale => (
                <tr key={sale.sales_id} className="hover:bg-neutral-50">
                  <td className="p-3 font-semibold text-neutral-900">{getStoreName(sale.store_id)}</td>
                  <td className="p-3 font-mono text-neutral-600">{sale.target_month}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    <input
                      type="number"
                      value={sale.sales_amount}
                      onChange={e => handleSalesAmountChange(sale.sales_id, Number(e.target.value))}
                      className="w-32 p-1 text-right bg-white border rounded font-mono font-bold"
                    />
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