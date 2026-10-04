import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { DatabaseState, TabType, ToastMessage, MUser, MStore } from './types';
import { fetchAllDatabaseSheets, updateSheetData } from './utils/googleSheets';

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

  // 現在のユーザー・店舗
  const currentUser: MUser = db.M_User[activeUserIndex] || db.M_User[0];
  const currentStore: MStore = db.M_Store.find(s => s.store_id === selectedStoreId) || db.M_Store[0] || {
    store_id: 'S001', store_name: '渋谷本店', address: '', fiscal_month: 3
  };

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

      {/* 画面構成仮置き (コンポーネント作成後に順次差し替え) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-tight text-neutral-900">StockFlow v4.0 (React + Sheets)</h1>
            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[10px] font-mono">
              {currentUser.user_name} ({currentUser.role})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!accessToken ? (
              <button onClick={() => googleLogin()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                <i className="fa-brands fa-google text-xs" />
                <span>スプレッドシート連携 (ログイン)</span>
              </button>
            ) : (
              <button onClick={() => loadAllSheets(accessToken)} disabled={isLoading} className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
                <span>スプシ同期</span>
              </button>
            )}

            <button onClick={toggleUserRole} className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md text-xs font-semibold">
              権限切替
            </button>

            <button onClick={() => setShowConfigModal(true)} className="px-2.5 py-1 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-semibold">
              ⚙️ 管理設定
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-neutral-900">スプレッドシート連携ステータス</h2>
            <div className="p-4 bg-neutral-50 border rounded-lg text-xs font-mono space-y-2">
              <div>スプレッドシートID: <strong className="text-neutral-900">{spreadsheetId}</strong></div>
              <div>Google OAuth トークン: <strong className={accessToken ? 'text-green-600' : 'text-neutral-400'}>{accessToken ? '認証済み' : '未認証'}</strong></div>
              <div>読み込み済み店舗数: <strong className="text-neutral-900">{db.M_Store.length} 件</strong></div>
              <div>読み込み済み品目数: <strong className="text-neutral-900">{db.M_Item.length} 件</strong></div>
            </div>
          </div>
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