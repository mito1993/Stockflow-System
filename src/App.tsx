import { useState, useEffect, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { DatabaseState, TabType, ToastMessage, MUser, MStore, TCostCalculation } from './types';
import { fetchAllDatabaseSheets, updateSheetData } from './utils/googleSheets';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { OcrView } from './components/OcrView';
import { MatchingView } from './components/MatchingView';
import { InventoryView } from './components/InventoryView';
import { CostView } from './components/CostView';
import { MasterView } from './components/MasterView';
import { SystemView } from './components/SystemView';

// 初期ダミーデータ (Googleスプレッドシート未接続時に使用)
const INITIAL_DATABASE: DatabaseState = {
  M_Store: [
    { store_id: 'S001', store_name: '渋谷本店', address: '東京都渋谷区道玄坂1-2-3', fiscal_month: 3 },
    { store_id: 'S002', store_name: '新宿店', address: '東京都新宿区西新宿2-8-1', fiscal_month: 12 },
  ],
  M_User: [
    { user_id: 'hq@example.com', password: 'password123', user_name: '本部 統括マネージャー', role: 'hq', store_id: 'HQ' },
    { user_id: 'owner@example.com', password: 'password123', user_name: '山田 太郎 (オーナー)', role: 'owner', store_id: 'S001' },
    { user_id: 'staff@example.com', password: 'password123', user_name: '佐藤 次郎 (現場スタッフ)', role: 'staff', store_id: 'S001' },
  ],
  M_Supplier: [
    { supplier_id: 1, supplier_name: '肉のハナマサ 精肉部', contact: '03-1111-2222' },
    { supplier_id: 2, supplier_name: '八百八青果 築地支店', contact: '03-3333-4444' },
    { supplier_id: 3, supplier_name: '業務用食品スーパー問屋', contact: '03-5555-6666' },
    { supplier_id: 4, supplier_name: 'サントリー酒類特約店', contact: '03-7777-8888' },
  ],
  M_Item: [
    { item_id: 1, supplier_id: 1, item_name: '牛バラ肉', category: '肉類', unit: 'kg', inventory_target: true, store_id: 'S001' },
    { item_id: 2, supplier_id: 2, item_name: 'キャベツ', category: '野菜類', unit: '玉', inventory_target: true, store_id: 'S001' },
    { item_id: 3, supplier_id: 3, item_name: '国産米(コシヒカリ)', category: '穀物', unit: 'kg', inventory_target: true, store_id: 'S001' },
    { item_id: 4, supplier_id: 3, item_name: '濃口醤油(1.8L)', category: '調味料', unit: '本', inventory_target: false, store_id: 'S001' },
    { item_id: 5, supplier_id: 4, item_name: '生ビール樽(10L)', category: '飲料・酒類', unit: '樽', inventory_target: true, store_id: 'S001' },
    { item_id: 6, supplier_id: 1, item_name: '鶏モモ肉', category: '肉類', unit: 'kg', inventory_target: true, store_id: 'S001' },
    { item_id: 7, supplier_id: 2, item_name: '玉ねぎ', category: '野菜類', unit: 'kg', inventory_target: true, store_id: 'S001' },
  ],
  T_Invoice: [
    { invoice_id: 101, supplier_id: 1, store_id: 'S001', invoice_date: '2026-09-02', status: '確定', file_url: '/dummy/inv101.pdf' },
    { invoice_id: 102, supplier_id: 2, store_id: 'S001', invoice_date: '2026-09-10', status: '確認待ち', file_url: '/dummy/inv102.pdf' },
  ],
  T_Invoice_Line: [
    { line_id: 1, invoice_id: 101, file_url: '/dummy/inv101.pdf', item_id: 1, item_name: '国産 牛ﾊﾞﾗ ｽﾗｲｽ', inventory_target: true, supplier_id: 1, supplier_name: '肉のﾊﾅﾏｻ', quantity: 20, unit_price: 1300, total_price: 26000, is_manual_edited: false, unit: 'kg', converted_item_name: '牛バラ肉', converted_supplier_name: '肉のハナマサ 精肉部', is_new_item: false, is_new_supplier: false, status: '確定', invoice_date: '2026-09-02', store_id: 'S001' },
    { line_id: 2, invoice_id: 102, file_url: '/dummy/inv102.pdf', item_id: 2, item_name: '群馬県産 キャベツ 1箱', inventory_target: true, supplier_id: 2, supplier_name: '八百八', quantity: 30, unit_price: 190, total_price: 5700, is_manual_edited: false, unit: '玉', converted_item_name: 'キャベツ', converted_supplier_name: '八百八青果 築地支店', is_new_item: false, is_new_supplier: false, status: '確認待ち', invoice_date: '2026-09-10', store_id: 'S001' },
  ],
  T_Inventory_Count: [
    { count_id: 1, store_id: 'S001', target_month: '2026-09', item_id: 1, item_name: '牛バラ肉', actual_quantity: 8, input_datetime: '2026-09-25 15:30:00', input_user_id: 'staff@example.com', is_new_count_flag: false },
    { count_id: 2, store_id: 'S001', target_month: '2026-09', item_id: 2, item_name: 'キャベツ', actual_quantity: 12, input_datetime: '2026-09-25 15:32:00', input_user_id: 'staff@example.com', is_new_count_flag: false },
  ],
  T_Monthly_Sales: [
    { sales_id: 1, store_id: 'S001', target_month: '2026-06', sales_amount: 1800000 },
    { sales_id: 2, store_id: 'S001', target_month: '2026-07', sales_amount: 2100000 },
    { sales_id: 3, store_id: 'S001', target_month: '2026-08', sales_amount: 2300000 },
    { sales_id: 4, store_id: 'S001', target_month: '2026-09', sales_amount: 2000000 },
  ],
  T_Cost_Calculation: []
};

export default function App() {
  // システム設定状態 (localStorage保持)
  const [clientId, setClientId] = useState(localStorage.getItem('GOOGLE_CLIENT_ID') || '');
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('SPREADSHEET_ID') || '1wlmCcfzXir-ZbEMwbX96Db2rRwxt7SStWqOVKImFMTM');
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('GOOGLE_ACCESS_TOKEN'));
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 全体データ状態
  const [db, setDb] = useState<DatabaseState>(INITIAL_DATABASE);
  const [isLoading, setIsLoading] = useState(false);

  // アクティブ操作状態
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('S001');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [activeUserIndex, setActiveUserIndex] = useState<number>(1); // デフォルト: オーナー
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [inventoryDraft, setInventoryDraft] = useState<Record<number, string>>({});

  // 選択可能な月リスト
  const availableMonths = ['2026-06', '2026-07', '2026-08', '2026-09'];

  // 現在のユーザー・店舗
  const currentUser: MUser = db.M_User[activeUserIndex] || db.M_User[0];
  const currentStore: MStore = db.M_Store.find(s => s.store_id === selectedStoreId) || db.M_Store[0] || {
    store_id: 'S001', store_name: '渋谷本店', address: '', fiscal_month: 3
  };

  // 閲覧可能店舗リスト
  const selectableStores = currentUser.role === 'hq'
    ? db.M_Store
    : db.M_Store.filter(s => s.store_id === currentUser.store_id);

  // 初期の棚卸ドラフトをセット
  useEffect(() => {
    const draft: Record<number, string> = {};
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    db.T_Inventory_Count.filter(c => c.store_id === targetStore && c.target_month === selectedMonth).forEach(c => {
      draft[c.item_id] = String(c.actual_quantity);
    });
    setInventoryDraft(draft);
  }, [selectedStoreId, selectedMonth, db.T_Inventory_Count]);

  // 通知トースト
  const showToast = (message: string, type: ToastMessage['type'] = 'success', icon?: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Google ログイン処理
  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      localStorage.setItem('GOOGLE_ACCESS_TOKEN', tokenResponse.access_token);
      showToast('Google認証に成功しました。スプレッドシートのデータを読み込みます...', 'info');
      loadAllSheets(tokenResponse.access_token);
    },
    onError: () => showToast('Googleログインに失敗しました', 'error')
  });

  // スプレッドシート全データのロード
  const loadAllSheets = async (token: string) => {
    if (!spreadsheetId) {
      showToast('スプレッドシートIDを設定してください', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchAllDatabaseSheets(token, spreadsheetId);
      setDb(prev => ({
        ...prev,
        ...data
      }));
      showToast('スプレッドシートの最新データと同期しました！', 'success');
    } catch (error) {
      console.error(error);
      showToast('データ取得エラー。IDと権限を確認してください', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 設定保存
  const saveSettings = () => {
    localStorage.setItem('GOOGLE_CLIENT_ID', clientId);
    localStorage.setItem('SPREADSHEET_ID', spreadsheetId);
    setShowConfigModal(false);
    showToast('システム設定を保存しました。反映のため再読み込みします。', 'info');
    setTimeout(() => window.location.reload(), 1000);
  };

  // 権限切替 (HQ -> Owner -> Staff)
  const toggleUserRole = () => {
    const nextIndex = (activeUserIndex + 1) % db.M_User.length;
    setActiveUserIndex(nextIndex);
    const nextUser = db.M_User[nextIndex];
    const roleLabels = { hq: '本部統括', owner: '店舗オーナー', staff: 'スタッフ' };
    showToast(`権限を「${roleLabels[nextUser.role]}」へ切替えました`, 'info');

    if (nextUser.role === 'staff' && ['master', 'system', 'matching'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  };

  // 特定シートの更新・スプレッドシート同期
  const saveSheetToGoogle = async (sheetName: keyof DatabaseState, headers: string[], records: any[]) => {
    if (!accessToken) {
      showToast('スプレッドシート同期にはGoogleログインが必要です（ローカルデータのみ更新）', 'warning');
      return;
    }
    try {
      await updateSheetData(accessToken, spreadsheetId, sheetName, headers, records);
      showToast(`シート「${sheetName}」をスプレッドシートに保存・同期しました！`, 'success');
    } catch (error) {
      showToast(`「${sheetName}」の同期に失敗しました`, 'error');
    }
  };

  // 現在の店舗の仕入伝票明細
  const currentStoreInvoiceLines = useMemo(() => {
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    return db.T_Invoice_Line.filter(l => (l.store_id || 'S001') === targetStore);
  }, [db.T_Invoice_Line, selectedStoreId]);

  // 未確定伝票数
  const unresolvedInvoicesCount = useMemo(() => {
    return currentStoreInvoiceLines.filter(l => l.status !== '確定').length;
  }, [currentStoreInvoiceLines]);

  // 未紐付け棚卸件数
  const unlinkedCountItems = useMemo(() => {
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    return db.T_Inventory_Count.filter(c => c.store_id === targetStore && c.is_new_count_flag);
  }, [db.T_Inventory_Count, selectedStoreId]);

  // 当月店舗別原価計算リアルタイム算出
  const currentStoreCostCalculations = useMemo<TCostCalculation[]>(() => {
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    const storeItems = db.M_Item.filter(i => i.store_id === targetStore || selectedStoreId === 'HQ');

    const [yearStr, monthStr] = selectedMonth.split('-');
    const currYear = parseInt(yearStr, 10);
    const currMonth = parseInt(monthStr, 10);
    const prevDate = new Date(currYear, currMonth - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    return storeItems.map(item => {
      const prevCount = db.T_Inventory_Count.find(c => c.store_id === targetStore && c.target_month === prevMonthStr && c.item_id === item.item_id);
      const beginning_stock = prevCount ? Number(prevCount.actual_quantity) : 10;

      const confirmedLines = db.T_Invoice_Line.filter(l => (l.store_id || 'S001') === targetStore && l.status === '確定' && l.item_id === item.item_id && (l.invoice_date || '').startsWith(selectedMonth));
      const monthly_purchase = confirmedLines.reduce((sum, l) => sum + Number(l.quantity), 0);

      const latestLine = [...confirmedLines].reverse()[0];
      const latest_unit_price = latestLine ? Number(latestLine.unit_price) : 1200;

      const draftVal = inventoryDraft[item.item_id];
      let ending_stock = 0;
      if (draftVal !== undefined && draftVal !== '') {
        ending_stock = Number(draftVal);
      } else {
        const currentCount = db.T_Inventory_Count.find(c => c.store_id === targetStore && c.target_month === selectedMonth && c.item_id === item.item_id);
        ending_stock = currentCount ? Number(currentCount.actual_quantity) : 0;
      }

      const consumption_qty = Math.max(0, beginning_stock + monthly_purchase - ending_stock);
      const consumption_cost = Math.round(consumption_qty * latest_unit_price);

      const supplier = db.M_Supplier.find(s => s.supplier_id === item.supplier_id);

      return {
        target_month: selectedMonth,
        store_id: targetStore,
        item_id: item.item_id,
        supplier_id: item.supplier_id,
        item_name: item.item_name,
        supplier_name: supplier?.supplier_name || '不明仕入先',
        category: item.category,
        unit: item.unit,
        inventory_target: item.inventory_target,
        beginning_stock,
        monthly_purchase,
        ending_stock,
        consumption_qty,
        latest_unit_price,
        consumption_cost,
      };
    });
  }, [db, selectedStoreId, selectedMonth, inventoryDraft]);

  // 当月原価合計・仕入合計
  const currentMonthCostTotal = currentStoreCostCalculations.reduce((sum, i) => sum + i.consumption_cost, 0);
  const confirmedLines = currentStoreInvoiceLines.filter(l => l.status === '確定');
  const currentMonthPurchaseTotal = confirmedLines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unit_price)), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 text-neutral-900 font-sans antialiased">
      {/* Toast Notification */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto px-4 py-3 rounded-lg shadow-xl border border-neutral-800 bg-neutral-950 text-neutral-100 flex items-center gap-3 text-xs font-semibold backdrop-blur-md">
            <i className={toast.icon || 'fa-solid fa-circle-info'} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-neutral-500 hover:text-neutral-200">✕</button>
          </div>
        ))}
      </div>

      {/* サイドバー */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        currentStore={currentStore}
        toggleUserRole={toggleUserRole}
        unresolvedInvoicesCount={unresolvedInvoicesCount}
        unlinkedMatchingCount={unlinkedCountItems.length}
      />

      {/* メインエリア */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          activeTab={activeTab}
          currentUser={currentUser}
          selectableStores={selectableStores}
          selectedStoreId={selectedStoreId}
          setSelectedStoreId={setSelectedStoreId}
          availableMonths={availableMonths}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          toggleUserRole={toggleUserRole}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              currentStore={currentStore}
              selectedMonth={selectedMonth}
              availableMonths={availableMonths}
              currentStoreInvoiceLines={currentStoreInvoiceLines}
              unresolvedInvoicesCount={unresolvedInvoicesCount}
              currentStoreCostCalculations={currentStoreCostCalculations}
              T_Monthly_Sales={db.T_Monthly_Sales}
              setT_Monthly_Sales={(val) => setDb(prev => ({ ...prev, T_Monthly_Sales: typeof val === 'function' ? val(prev.T_Monthly_Sales) : val }))}
              setActiveTab={setActiveTab}
              showToast={showToast}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}

          {activeTab === 'ocr' && (
            <OcrView
              currentStoreInvoiceLines={currentStoreInvoiceLines}
              setT_Invoice_Line={(val) => setDb(prev => ({ ...prev, T_Invoice_Line: typeof val === 'function' ? val(prev.T_Invoice_Line) : val }))}
              storeItems={db.M_Item}
              unresolvedInvoicesCount={unresolvedInvoicesCount}
              selectedMonth={selectedMonth}
              selectedStoreId={selectedStoreId}
              showToast={showToast}
              setActiveTab={setActiveTab}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}

          {activeTab === 'matching' && (
            <MatchingView
              unlinkedCountItems={unlinkedCountItems}
              unlinkedInvoiceLines={currentStoreInvoiceLines.filter(l => !l.item_id)}
              storeItems={db.M_Item}
              M_Supplier={db.M_Supplier}
              currentStoreInvoiceLines={currentStoreInvoiceLines}
              setT_Invoice_Line={(val) => setDb(prev => ({ ...prev, T_Invoice_Line: typeof val === 'function' ? val(prev.T_Invoice_Line) : val }))}
              setT_Inventory_Count={(val) => setDb(prev => ({ ...prev, T_Inventory_Count: typeof val === 'function' ? val(prev.T_Inventory_Count) : val }))}
              setM_Item={(val) => setDb(prev => ({ ...prev, M_Item: typeof val === 'function' ? val(prev.M_Item) : val }))}
              showToast={showToast}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              currentStoreCostCalculations={currentStoreCostCalculations}
              storeInventoryItems={db.M_Item.filter(i => i.store_id === (selectedStoreId === 'HQ' ? 'S001' : selectedStoreId))}
              M_Supplier={db.M_Supplier}
              inventoryDraft={inventoryDraft}
              setInventoryDraft={setInventoryDraft}
              selectedStoreId={selectedStoreId}
              selectedMonth={selectedMonth}
              currentUserId={currentUser.user_id}
              setT_Inventory_Count={(val) => setDb(prev => ({ ...prev, T_Inventory_Count: typeof val === 'function' ? val(prev.T_Inventory_Count) : val }))}
              setM_Item={(val) => setDb(prev => ({ ...prev, M_Item: typeof val === 'function' ? val(prev.M_Item) : val }))}
              showToast={showToast}
              setActiveTab={setActiveTab}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}

          {activeTab === 'cost' && (
            <CostView
              currentStoreCostCalculations={currentStoreCostCalculations}
              currentStoreInvoiceLines={currentStoreInvoiceLines}
              M_Supplier={db.M_Supplier}
              currentMonthCostTotal={currentMonthCostTotal}
              currentMonthPurchaseTotal={currentMonthPurchaseTotal}
              showToast={showToast}
            />
          )}

          {activeTab === 'master' && (
            <MasterView
              M_Item={db.M_Item}
              setM_Item={(val) => setDb(prev => ({ ...prev, M_Item: typeof val === 'function' ? val(prev.M_Item) : val }))}
              M_Supplier={db.M_Supplier}
              setM_Supplier={(val) => setDb(prev => ({ ...prev, M_Supplier: typeof val === 'function' ? val(prev.M_Supplier) : val }))}
              setT_Invoice_Line={(val) => setDb(prev => ({ ...prev, T_Invoice_Line: typeof val === 'function' ? val(prev.T_Invoice_Line) : val }))}
              selectedStoreId={selectedStoreId}
              showToast={showToast}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}

          {activeTab === 'system' && (
            <SystemView
              M_Store={db.M_Store}
              setM_Store={(val) => setDb(prev => ({ ...prev, M_Store: typeof val === 'function' ? val(prev.M_Store) : val }))}
              M_User={db.M_User}
              setM_User={(val) => setDb(prev => ({ ...prev, M_User: typeof val === 'function' ? val(prev.M_User) : val }))}
              T_Monthly_Sales={db.T_Monthly_Sales}
              setT_Monthly_Sales={(val) => setDb(prev => ({ ...prev, T_Monthly_Sales: typeof val === 'function' ? val(prev.T_Monthly_Sales) : val }))}
              showToast={showToast}
              saveSheetToGoogle={saveSheetToGoogle}
            />
          )}
        </main>
      </div>

      {/* システム初期設定・API設定モーダル */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-neutral-700" />
              <span>システム管理・API連携設定</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">Google OAuth クライアントID</label>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono" />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">スプレッドシートID</label>
                <input type="text" value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="1wlmCcfzXir..." className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-semibold">
                キャンセル
              </button>
              <button onClick={saveSettings} className="px-5 py-2 bg-neutral-950 hover:bg-black text-white rounded-lg text-xs font-bold">
                設定を保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}