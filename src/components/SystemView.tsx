import React, { useState } from 'react';
import { MStore, MUser, TMonthlySales, DataMode } from '../types';

interface SystemViewProps {
  M_Store: MStore[];
  setM_Store: React.Dispatch<React.SetStateAction<MStore[]>>;
  M_User: MUser[];
  setM_User: React.Dispatch<React.SetStateAction<MUser[]>>;
  T_Monthly_Sales: TMonthlySales[];
  setT_Monthly_Sales: React.Dispatch<React.SetStateAction<TMonthlySales[]>>;
  showToast: (message: string, type?: any) => void;
  saveSheetToGoogle?: (sheetName: any, headers?: string[], records?: any[]) => void;
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  currentUser: MUser;
  clientId: string;
  setClientId: (id: string) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  accessToken?: string | null;
  googleLogin?: () => void;
  reloadSheets?: () => void;
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
  dataMode,
  setDataMode,
  currentUser,
  clientId,
  setClientId,
  spreadsheetId,
  setSpreadsheetId,
  geminiApiKey,
  setGeminiApiKey,
  accessToken,
  googleLogin,
  reloadSheets,
}) => {
  const [inputClientId, setInputClientId] = useState(clientId);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState(spreadsheetId);
  const [inputGeminiApiKey, setInputGeminiApiKey] = useState(geminiApiKey);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);

  const getStoreName = (id: string) => {
    if (id === 'HQ') return '本部 (全店舗)';
    return M_Store.find(s => s.store_id === id)?.store_name || id;
  };

  const handleFiscalMonthChange = (storeId: string, month: number) => {
    setM_Store(prev => {
      const updated = prev.map(s => s.store_id === storeId ? { ...s, fiscal_month: month } : s);
      if (saveSheetToGoogle) saveSheetToGoogle('M_Store', undefined, updated);
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
      if (saveSheetToGoogle) saveSheetToGoogle('M_User', undefined, updated);
      return updated;
    });

    showToast(`ユーザー「${email.trim()}」を追加しました`, 'success');
  };

  const handleSalesAmountChange = (salesId: number, amount: number) => {
    setT_Monthly_Sales(prev => {
      const updated = prev.map(s => s.sales_id === salesId ? { ...s, sales_amount: amount } : s);
      if (saveSheetToGoogle) saveSheetToGoogle('T_Monthly_Sales', undefined, updated);
      return updated;
    });
  };

  const isConfigEditable = currentUser.role === 'developer' || currentUser.role === 'hq' || currentUser.role === 'owner';

  const handleModeSwitch = (mode: DataMode) => {
    if (!isConfigEditable) {
      showToast('データモードの変更権限がありません（開発者/本部/オーナー限定）', 'error');
      return;
    }
    setDataMode(mode);
  };

  const handleSaveApiSettings = () => {
    if (!isConfigEditable) {
      showToast('API設定の変更権限がありません', 'error');
      return;
    }

    const trimmedSheetId = inputSpreadsheetId.trim();
    const trimmedClientId = inputClientId.trim();
    const trimmedApiKey = inputGeminiApiKey.trim();

    setClientId(trimmedClientId);
    setSpreadsheetId(trimmedSheetId);
    setGeminiApiKey(trimmedApiKey);

    localStorage.setItem('GOOGLE_CLIENT_ID', trimmedClientId);
    localStorage.setItem('SPREADSHEET_ID', trimmedSheetId);
    localStorage.setItem('GEMINI_API_KEY', trimmedApiKey);

    showToast('API・スプレッドシート設定を保存しました。データ再同期を開始します...', 'success');

    // スプレッドシート本番連携モードなら、保存した新しいスプシIDで即座にデータ読み込みを実行
    if (dataMode === 'sheets' && reloadSheets) {
      setTimeout(() => {
        reloadSheets();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Google 認証・同期ステート通知バー (スプシ本番モード時のみ強調表示) */}
      {dataMode === 'sheets' && (
        <div className="bg-neutral-900 text-white p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${accessToken ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
              <i className={`fa-solid ${accessToken ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                <span>Google スプレッドシート連携ステータス:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${accessToken ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {accessToken ? '認証済み (接続中)' : '未認証 (ログイン必要)'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {accessToken
                  ? '指定のスプレッドシートと双方向通信が可能です。データが更新されない場合は「最新データを再同期」を押してください。'
                  : 'スプレッドシートのデータを読み込むには、Googleアカウントでのログイン認証が必要です。'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {googleLogin && (
              <button
                onClick={() => googleLogin()}
                className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow"
              >
                <i className="fa-brands fa-google text-neutral-700" />
                <span>{accessToken ? '再認証・アカウント切替' : 'Googleでログイン'}</span>
              </button>
            )}
            {accessToken && reloadSheets && (
              <button
                onClick={() => reloadSheets()}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg text-xs transition-all border border-neutral-700 flex items-center gap-1.5"
              >
                <i className="fa-solid fa-rotate text-[10px]" />
                <span>最新データを再同期</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. API連携・各種キー設定カード */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-key text-neutral-700" />
            <span>API連携・スプレッドシート接続設定 (開発者/本部/オーナー権限)</span>
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-700 border border-neutral-200">
            {isConfigEditable ? '全権限オープン' : '閲覧のみ'}
          </span>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          Googleスプレッドシート連携およびOCR解析に使用するGemini APIキーを設定します。変更内容はブラウザに保存され即座に反映されます。
        </p>

        <div className="space-y-4 text-xs">
          {/* Google スプレッドシート ID */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Google スプレッドシート ID
            </label>
            <input
              type="text"
              value={inputSpreadsheetId}
              onChange={e => setInputSpreadsheetId(e.target.value)}
              disabled={!isConfigEditable}
              placeholder="例: 1wlmCcfzXir-ZbEMwbX96Db2rRwxt7SStWqOVKImFMTM"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono text-xs outline-none focus:border-neutral-900 focus:bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              ※ スプレッドシートURLの `/d/` と `/edit` の間にある文字列を指定します。
            </p>
          </div>

          {/* Google OAuth クライアント ID */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Google OAuth クライアント ID
            </label>
            <div className="relative">
              <input
                type={showClientId ? 'text' : 'password'}
                value={inputClientId}
                onChange={e => setInputClientId(e.target.value)}
                disabled={!isConfigEditable}
                placeholder="xxxxxx.apps.googleusercontent.com"
                className="w-full pl-3 pr-10 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono text-xs outline-none focus:border-neutral-900 focus:bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowClientId(!showClientId)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <i className={`fa-solid ${showClientId ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Gemini API Key (OCR解析用)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={inputGeminiApiKey}
                onChange={e => setInputGeminiApiKey(e.target.value)}
                disabled={!isConfigEditable}
                placeholder="AIzaSy..."
                className="w-full pl-3 pr-10 py-2 bg-neutral-50 border border-neutral-300 rounded-lg font-mono text-xs outline-none focus:border-neutral-900 focus:bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <i className={`fa-solid ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              ※ OCRによる伝票自動解析で使用するGoogle AI StudioのAPIキーを入力します。
            </p>
          </div>

          {isConfigEditable && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveApiSettings}
                className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <i className="fa-solid fa-floppy-disk text-xs" />
                <span>API・スプレッドシート設定を保存する</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. データ参照モード切り替え */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <i className="fa-solid fa-database text-neutral-700" />
            <span>データ参照モード設定 (管理者・開発者権限)</span>
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-700 border border-neutral-200">
            開発者 / 本部 / オーナー限定
          </span>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          システムで表示・参照するデータのソースを選択します。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* デモデータモード */}
          <div
            onClick={() => handleModeSwitch('demo')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'demo'
                ? 'border-neutral-900 bg-neutral-950 text-white shadow-md'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-vial text-xs" />
                <span>デモデータ表示モード</span>
              </div>
              {dataMode === 'demo' && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-white text-neutral-950">
                  選択中
                </span>
              )}
            </div>
            <p className={`text-xs ${dataMode === 'demo' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              システムの擬似モックデータを使用します。開発者および本部責任者(HQ)のみクイック権限切り替えが可能です。
            </p>
          </div>

          {/* スプレッドシート連携モード */}
          <div
            onClick={() => handleModeSwitch('sheets')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              dataMode === 'sheets'
                ? 'border-neutral-900 bg-neutral-950 text-white shadow-md'
                : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-excel text-xs" />
                <span>スプレッドシート本番連携モード</span>
              </div>
              {dataMode === 'sheets' && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-white text-neutral-950">
                  選択中
                </span>
              )}
            </div>
            <p className={`text-xs ${dataMode === 'sheets' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Googleスプレッドシートのマスタ・記録データとリアルタイムで直接連携・保存します。
            </p>
          </div>
        </div>
      </div>

      {/* 3. M_Store */}
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

      {/* 4. M_User */}
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
                      {user.role === 'developer' ? '開発者' : user.role === 'hq' ? '本部' : user.role === 'owner' ? 'オーナー' : 'スタッフ'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-neutral-600">{getStoreName(user.store_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. T_Monthly_Sales */}
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