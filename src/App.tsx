import { useState, useEffect, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { DatabaseState, TabType, ToastMessage, MUser, MStore, TCostCalculation, DataMode } from './types';
import { fetchAllDatabaseSheets, updateSheetData } from './utils/googleSheets';
import { INITIAL_DATABASE } from './data/initialDemoData';
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

export default function App() {
  // システム設定状態 (localStorage保持)
  const [clientId, setClientId] = useState(
    localStorage.getItem('GOOGLE_CLIENT_ID') || ''
  );
  const [spreadsheetId, setSpreadsheetId] = useState(
    localStorage.getItem('SPREADSHEET_ID') || '1wlmCcfzXir-ZbEMwbX96Db2rRwxt7SStWqOVKImFMTM'
  );
  const [geminiApiKey, setGeminiApiKey] = useState(
    localStorage.getItem('GEMINI_API_KEY') || (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
  );
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('GOOGLE_ACCESS_TOKEN')
  );

  // データソースモード ('demo' | 'sheets')
  const [dataMode, setDataMode] = useState<DataMode>(
    (localStorage.getItem('DATA_MODE') as DataMode) || 'demo'
  );

  // 全体データ状態
  const [db, setDb] = useState<DatabaseState>(INITIAL_DATABASE);

  // アクティブ操作状態
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('S001');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [activeUserIndex, setActiveUserIndex] = useState<number>(0); // デフォルト: 開発者
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
  const selectableStores = (currentUser.role === 'developer' || currentUser.role === 'hq')
    ? db.M_Store
    : db.M_Store.filter(s => s.store_id === currentUser.store_id);

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
  const loadAllSheets = async (token?: string, targetSheetId?: string) => {
    const activeToken = token || accessToken;
    const activeSheetId = targetSheetId || spreadsheetId;

    if (!activeSheetId) {
      showToast('スプレッドシートIDを設定してください（システム管理より変更可）', 'warning');
      return;
    }
    if (!activeToken) {
      showToast('スプレッドシートの読み込みにはGoogleログインが必要です', 'warning');
      return;
    }

    try {
      const data = await fetchAllDatabaseSheets(activeToken, activeSheetId);
      setDb(data);
      showToast('スプレッドシートの最新データと同期完了しました！', 'success');
    } catch (error) {
      console.error(error);
      showToast('データ取得エラー。スプレッドシートIDとアクセス権限を確認してください', 'error');
    }
  };

  // 本番連携モード切り替え時の制御
  const handleSetDataMode = (mode: DataMode) => {
    setDataMode(mode);
    localStorage.setItem('DATA_MODE', mode);

    if (mode === 'demo') {
      setDb(INITIAL_DATABASE);
      showToast('デモデータ表示モードに切り替えました', 'info');
    } else {
      if (accessToken) {
        loadAllSheets(accessToken);
      } else {
        showToast('スプレッドシート連携モードです。Googleログインを実行してください', 'warning');
      }
    }
  };

  // 【追加】本番モード有効かつトークン保持時に自動ロードするフック
  useEffect(() => {
    if (dataMode === 'sheets' && accessToken && spreadsheetId) {
      loadAllSheets(accessToken, spreadsheetId);
    }
  }, [dataMode, accessToken, spreadsheetId]);

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

  // 権限切替
  const toggleUserRole = () => {
    const isHighPrivilege = currentUser.role === 'developer' || currentUser.role === 'hq';

    if (dataMode === 'sheets' && !isHighPrivilege) {
      showToast('スプレッドシート連携モード中は一般権限の切り替えができません', 'warning');
      return;
    }

    if (!isHighPrivilege) {
      showToast('権限切替は開発者または本部責任者のみ実行可能です', 'warning');
      return;
    }

    const nextIndex = (activeUserIndex + 1) % db.M_User.length;
    setActiveUserIndex(nextIndex);
    const nextUser = db.M_User[nextIndex];
    const roleLabels = { developer: '開発者', hq: '本部統括', owner: '店舗オーナー', staff: 'スタッフ' };
    showToast(`権限を「${roleLabels[nextUser.role]}」へ切替えました`, 'info');

    if (nextUser.role === 'staff' && ['master', 'system', 'matching'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  };

  // スプレッドシート同期
  const saveSheetToGoogle = async (sheetName: keyof DatabaseState, headers?: string[], records?: any[]) => {
    if (dataMode === 'demo') {
      return;
    }
    if (!accessToken) {
      showToast('スプレッドシート同期にはGoogleログインが必要です', 'warning');
      return;
    }
    try {
      const targetHeaders = headers || SHEET_HEADERS[sheetName];
      const targetRecords = records || db[sheetName];
      await updateSheetData(accessToken, spreadsheetId, sheetName, targetHeaders, targetRecords);
      showToast(`シート「${sheetName}」を保存・同期しました！`, 'success');
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

  // 原価計算
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
        dataMode={dataMode}
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
            />
          )}
        </main>
      </div>
    </div>
  );
}