import { useState, useEffect, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { DatabaseState, TabType, ToastMessage, MUser, MStore, TCostCalculation, DataMode, RolePermissions, TInventoryLock } from './types';
import { fetchAllDatabaseSheets, updateSheetData } from './utils/googleSheets';
import { INITIAL_DATABASE, DEFAULT_ROLE_PERMISSIONS } from './data/initialDemoData';
import { SHEET_HEADERS } from './constants/headers';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { OcrView } from './components/OcrView';
import { MatchingView } from './components/MatchingView';
import { InventoryView } from './components/InventoryView';
import { CostView } from './components/CostView';
import { MasterView } from './components/MasterView';
import { SystemView } from './components/SystemView';
import { LoginView } from './components/LoginView';

export default function App() {
  const [clientId, setClientId] = useState(localStorage.getItem('GOOGLE_CLIENT_ID') || '');
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('SPREADSHEET_ID') || '1wlmCcfzXir-ZbEMwbX96Db2rRwxt7SStWqOVKImFMTM');
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '');
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('GOOGLE_ACCESS_TOKEN'));

  const [dataMode, setDataMode] = useState<DataMode>((localStorage.getItem('DATA_MODE') as DataMode) || 'demo');
  const [db, setDb] = useState<DatabaseState>(INITIAL_DATABASE);

  // 月次棚卸ロック管理ステート（初期値: 過去月を例示ロック）
  const [inventoryLocks, setInventoryLocks] = useState<TInventoryLock[]>(() => {
    const saved = localStorage.getItem('INVENTORY_LOCKS');
    return saved
      ? JSON.parse(saved)
      : [
          { store_id: 'S001', target_month: '2026-06', is_locked: true, locked_at: '2026-07-01 00:00:00', locked_by: 'dev@example.com' },
          { store_id: 'S001', target_month: '2026-07', is_locked: true, locked_at: '2026-08-01 00:00:00', locked_by: 'dev@example.com' },
          { store_id: 'S001', target_month: '2026-08', is_locked: true, locked_at: '2026-09-01 00:00:00', locked_by: 'dev@example.com' },
          { store_id: 'S001', target_month: '2026-09', is_locked: false, locked_at: '', locked_by: '' },
        ];
  });

  useEffect(() => {
    localStorage.setItem('INVENTORY_LOCKS', JSON.stringify(inventoryLocks));
  }, [inventoryLocks]);

  // ログイン状態管理
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInUserId, setLoggedInUserId] = useState<string>('');

  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
    const saved = localStorage.getItem('ROLE_PERMISSIONS');
    return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('S001');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [inventoryDraft, setInventoryDraft] = useState<Record<number, string>>({});

  const availableMonths = ['2026-06', '2026-07', '2026-08', '2026-09'];

  const currentUser: MUser = useMemo(() => {
    return db.M_User.find(u => u.user_id === loggedInUserId) || db.M_User[0];
  }, [db.M_User, loggedInUserId]);

  const currentStore: MStore = useMemo(() => {
    return db.M_Store.find(s => s.store_id === selectedStoreId) || db.M_Store[0];
  }, [db.M_Store, selectedStoreId]);

  const selectableStores = (currentUser.role === 'developer' || currentUser.role === 'hq')
    ? db.M_Store
    : db.M_Store.filter(s => s.store_id === currentUser.store_id);

  // Google認証フック (スプレッドシート権限 ＋ Gmail送信権限を要求)
  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.send',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      localStorage.setItem('GOOGLE_ACCESS_TOKEN', tokenResponse.access_token);
      showToast('Google認証に成功しました。スプレッドシートとGmail送信が有効です', 'info');
      loadAllSheets(tokenResponse.access_token);
    },
    onError: () => showToast('Googleログインに失敗しました', 'error')
  });

  const loadAllSheets = async (token?: string, targetSheetId?: string) => {
    const activeToken = token || accessToken;
    const activeSheetId = targetSheetId || spreadsheetId;

    if (!activeSheetId || !activeToken) return;

    try {
      const data = await fetchAllDatabaseSheets(activeToken, activeSheetId);
      setDb(data);
      showToast('スプレッドシートの最新データと同期完了しました！', 'success');
    } catch (error) {
      console.error(error);
      showToast('データ取得エラー。スプレッドシートのアクセス権限を確認してください', 'error');
    }
  };

  const handleSetDataMode = (mode: DataMode) => {
    setDataMode(mode);
    localStorage.setItem('DATA_MODE', mode);
    if (mode === 'demo') {
      setDb(INITIAL_DATABASE);
      showToast('デモデータ表示モードに切り替えました', 'info');
    } else if (accessToken) {
      loadAllSheets(accessToken);
    }
  };

  useEffect(() => {
    if (dataMode === 'sheets' && accessToken && spreadsheetId) {
      loadAllSheets(accessToken, spreadsheetId);
    }
  }, [dataMode, accessToken, spreadsheetId]);

  useEffect(() => {
    const draft: Record<number, string> = {};
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    db.T_Inventory_Count.filter(c => c.store_id === targetStore && c.target_month === selectedMonth).forEach(c => {
      draft[c.item_id] = String(c.actual_quantity);
    });
    setInventoryDraft(draft);
  }, [selectedStoreId, selectedMonth, db.T_Inventory_Count]);

  const showToast = (message: string, type: ToastMessage['type'] = 'success', icon?: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const saveSheetToGoogle = async (sheetName: keyof DatabaseState, headers?: string[], records?: any[]) => {
    if (dataMode === 'demo' || !accessToken) return;
    try {
      const targetHeaders = headers || SHEET_HEADERS[sheetName];
      const targetRecords = records || db[sheetName];
      await updateSheetData(accessToken, spreadsheetId, sheetName, targetHeaders, targetRecords);
      showToast(`シート「${sheetName}」を保存・同期しました！`, 'success');
    } catch (error) {
      showToast(`「${sheetName}」の同期に失敗しました`, 'error');
    }
  };

  const handleLoginSuccess = (user: MUser) => {
    setLoggedInUserId(user.user_id);
    setIsLoggedIn(true);
    setSelectedStoreId(user.store_id === 'HQ' ? 'S001' : user.store_id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUserId('');
    showToast('ログアウトしました', 'info');
  };

  const toggleDemoRole = () => {
    if (dataMode === 'sheets') {
      showToast('スプレッドシート連携モード中は表示権限の切り替えができません', 'warning');
      return;
    }

    const roles: MUser['role'][] = ['developer', 'hq', 'owner', 'staff'];
    const currentIdx = roles.indexOf(currentUser.role);
    const nextRole = roles[(currentIdx + 1) % roles.length];

    setDb(prev => ({
      ...prev,
      M_User: prev.M_User.map(u => u.user_id === currentUser.user_id ? { ...u, role: nextRole } : u)
    }));

    showToast(`UI表示権限を「${nextRole}」へ切り替えました（デモ機能）`, 'info');
  };

  const currentStoreInvoiceLines = useMemo(() => {
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    return db.T_Invoice_Line.filter(l => (l.store_id || 'S001') === targetStore);
  }, [db.T_Invoice_Line, selectedStoreId]);

  const unresolvedInvoicesCount = useMemo(() => {
    return currentStoreInvoiceLines.filter(l => l.status !== '確定').length;
  }, [currentStoreInvoiceLines]);

  const unlinkedCountItems = useMemo(() => {
    const targetStore = selectedStoreId === 'HQ' ? 'S001' : selectedStoreId;
    return db.T_Inventory_Count.filter(c => c.store_id === targetStore && c.is_new_count_flag);
  }, [db.T_Inventory_Count, selectedStoreId]);

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

      const confirmedLines = db.T_Invoice_Line.filter(l => (l.store_id || 'S001') === targetStore && l.status === '確定' && l.item_id === item.item_id && (l.purchase_month === selectedMonth));
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

  const currentMonthCostTotal = currentStoreCostCalculations.reduce((sum, i) => sum + i.consumption_cost, 0);
  const confirmedLines = currentStoreInvoiceLines.filter(l => l.status === '確定');
  const currentMonthPurchaseTotal = confirmedLines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unit_price)), 0);

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto px-4 py-3 rounded-lg shadow-xl border border-neutral-800 bg-neutral-950 text-neutral-100 flex items-center gap-3 text-xs font-semibold backdrop-blur-md">
              <i className={toast.icon || 'fa-solid fa-circle-info'} />
              <span className="flex-1 leading-snug">{toast.message}</span>
            </div>
          ))}
        </div>
        <LoginView
          users={db.M_User}
          onLoginSuccess={handleLoginSuccess}
          showToast={showToast}
        />
      </>
    );
  }

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
        unresolvedInvoicesCount={unresolvedInvoicesCount}
        unlinkedMatchingCount={unlinkedCountItems.length}
        dataMode={dataMode}
        rolePermissions={rolePermissions}
        toggleDemoRole={toggleDemoRole}
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
          onLogout={handleLogout}
          dataMode={dataMode}
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
              availableMonths={availableMonths}
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
              setSelectedMonth={setSelectedMonth}
              availableMonths={availableMonths}
              currentUserId={currentUser.user_id}
              currentUser={currentUser}
              currentStore={currentStore}
              inventoryLocks={inventoryLocks}
              setInventoryLocks={setInventoryLocks}
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
              dataMode={dataMode}
              setDataMode={handleSetDataMode}
              currentUser={currentUser}
              clientId={clientId}
              setClientId={setClientId}
              spreadsheetId={spreadsheetId}
              setSpreadsheetId={setSpreadsheetId}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              accessToken={accessToken}
              googleLogin={googleLogin}
              reloadSheets={() => loadAllSheets(accessToken || undefined, spreadsheetId)}
              rolePermissions={rolePermissions}
              setRolePermissions={setRolePermissions}
            />
          )}
        </main>
      </div>
    </div>
  );
}