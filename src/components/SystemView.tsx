import React, { useState, useEffect } from 'react';
import { MStore, MUser, TMonthlySales, DataMode, RolePermissions, PermissionLevel, TabType } from '../types';

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
  rolePermissions: RolePermissions;
  setRolePermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
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
  rolePermissions,
  setRolePermissions,
}) => {
  const [inputClientId, setInputClientId] = useState(clientId);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState(spreadsheetId);
  const [inputGeminiApiKey, setInputGeminiApiKey] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  // 外部からのProps更新を同期
  useEffect(() => {
    setInputClientId(clientId);
  }, [clientId]);

  useEffect(() => {
    setInputSpreadsheetId(spreadsheetId);
  }, [spreadsheetId]);

  useEffect(() => {
    setInputGeminiApiKey(geminiApiKey);
  }, [geminiApiKey]);

  // ユーザー招待モーダルステート
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MUser['role']>('staff');
  const [inviteStoreId, setInviteStoreId] = useState('S001');

  // 階層比較用の重み (developer:4 > hq:3 > owner:2 > staff:1)
  const roleHierarchy: Record<MUser['role'], number> = {
    developer: 4,
    hq: 3,
    owner: 2,
    staff: 1,
  };

  const isDeveloper = currentUser.role === 'developer';
  const isHqOrDeveloper = currentUser.role === 'developer' || currentUser.role === 'hq';
  const isConfigEditable = currentUser.role === 'developer' || currentUser.role === 'hq' || currentUser.role === 'owner';

  // 自分より下位の階層のみ招待可能な役割リストを生成
  const allowedInviteRoles = (['hq', 'owner', 'staff'] as MUser['role'][]).filter(r => {
    return roleHierarchy[r] < roleHierarchy[currentUser.role];
  });

  // データモード変更処理 (開発者・本部のみ実行可能)
  const handleDataModeSwitch = (mode: DataMode) => {
    if (!isHqOrDeveloper) {
      showToast('データモードの切替は開発者または本部権限が必要です', 'error');
      return;
    }
    setDataMode(mode);
  };

  // 設定保存ハンドラー
  const handleSaveApiConfigs = () => {
    const trimmedClientId = inputClientId.trim();
    const trimmedSpreadsheetId = inputSpreadsheetId.trim();
    const trimmedGeminiKey = inputGeminiApiKey.trim();

    setClientId(trimmedClientId);
    setSpreadsheetId(trimmedSpreadsheetId);
    setGeminiApiKey(trimmedGeminiKey);

    localStorage.setItem('GOOGLE_CLIENT_ID', trimmedClientId);
    localStorage.setItem('SPREADSHEET_ID', trimmedSpreadsheetId);
    localStorage.setItem('GEMINI_API_KEY', trimmedGeminiKey);

    showToast('API連携・接続設定を保存しました', 'success');
  };

  const handleInviteUser = () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      showToast('メールアドレスと氏名を入力してください', 'error');
      return;
    }

    if (M_User.some(u => u.user_id === inviteEmail.trim())) {
      showToast('指定のメールアドレスは既に登録されています', 'error');
      return;
    }

    const newUser: MUser = {
      user_id: inviteEmail.trim(),
      password: 'password123',
      user_name: inviteName.trim(),
      role: inviteRole,
      store_id: inviteStoreId,
    };

    setM_User(prev => {
      const updated = [...prev, newUser];
      if (saveSheetToGoogle) saveSheetToGoogle('M_User', undefined, updated);
      return updated;
    });

    setShowInviteModal(false);
    showToast(`ユーザー「${inviteName.trim()}」(${inviteEmail.trim()}) を招待・登録しました`, 'success');
    setInviteEmail('');
    setInviteName('');
  };

  // 権限マトリクス変更 (開発者のみ操作可能)
  const handlePermissionChange = (tab: TabType, role: MUser['role'], level: PermissionLevel) => {
    if (!isDeveloper) {
      showToast('権限マトリクスの変更はシステム開発者のみ可能です', 'error');
      return;
    }

    setRolePermissions(prev => {
      const updated = {
        ...prev,
        [tab]: {
          ...prev[tab],
          [role]: level,
        },
      };
      localStorage.setItem('ROLE_PERMISSIONS', JSON.stringify(updated));
      return updated;
    });

    showToast('機能別アクセス権限設定を更新しました', 'info');
  };

  const getStoreName = (id: string) => {
    if (id === 'HQ') return '本部 (全店舗)';
    return M_Store.find(s => s.store_id === id)?.store_name || id;
  };

  const tabNames: Record<TabType, string> = {
    dashboard: 'ダッシュボード・推移表',
    ocr: '仕入伝票登録・OCR',
    matching: '棚卸・OCRマッチング',
    inventory: '月次実地棚卸入力',
    cost: '原価計算・仕入集計',
    master: 'マスタ管理',
    system: 'システム管理',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 0. データ連携モード切替カード (開発者・本部専用) */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-database text-neutral-700" />
              <span>データ参照モード設定</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              デモデータ（検証用ローカルデータ）とGoogleスプレッドシート（本番リアルタイム連携）を切り替えます。
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border self-start sm:self-auto">
            {isHqOrDeveloper ? '切替権限: 開発者・本部 (変更可能)' : '切替権限: 閲覧のみ'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* デモデータモード選択ボタン */}
          <div
            onClick={() => isHqOrDeveloper && handleDataModeSwitch('demo')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              dataMode === 'demo'
                ? 'border-neutral-950 bg-neutral-50 ring-2 ring-neutral-950 shadow-sm'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            } ${!isHqOrDeveloper ? 'cursor-not-allowed opacity-75' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-box text-sm text-neutral-700" />
                <span className="font-bold text-xs text-neutral-900">📦 デモデータモード</span>
              </div>
              {dataMode === 'demo' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-white">
                  現在有効
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              内蔵されたダミーデータを使用します。Google認証が不要で、動作確認やUI検証に最適です。
            </p>
          </div>

          {/* スプレッドシート連携モード選択ボタン */}
          <div
            onClick={() => isHqOrDeveloper && handleDataModeSwitch('sheets')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              dataMode === 'sheets'
                ? 'border-neutral-950 bg-neutral-50 ring-2 ring-neutral-950 shadow-sm'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            } ${!isHqOrDeveloper ? 'cursor-not-allowed opacity-75' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-excel text-sm text-emerald-600" />
                <span className="font-bold text-xs text-neutral-900">📊 スプレッドシート連携モード</span>
              </div>
              {dataMode === 'sheets' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white">
                  現在有効
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              指定したGoogleスプレッドシートの全9シートと直接読み書き同期します。（Googleアカウント認証が必要）
            </p>
          </div>
        </div>

        {/* スプシモード有効時の接続・認証ステータス */}
        {dataMode === 'sheets' && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-lg border">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${accessToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="text-xs">
                <span className="text-neutral-500">Google認証状態: </span>
                <strong className={accessToken ? 'text-emerald-700' : 'text-amber-700'}>
                  {accessToken ? '接続完了 (スプシ同期有効)' : '未認証 (ログインが必要です)'}
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {accessToken && reloadSheets && (
                <button
                  onClick={reloadSheets}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-md text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <i className="fa-solid fa-rotate text-[10px]" />
                  <span>最新データを再読み込み</span>
                </button>
              )}
              {googleLogin && (
                <button
                  onClick={() => googleLogin()}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <i className="fa-brands fa-google text-[11px]" />
                  <span>{accessToken ? 'アカウント再認証' : 'Googleでログイン'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1. API連携・各種キー設定カード */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-key text-neutral-700" />
              <span>API連携・スプレッドシート接続設定</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Google Cloud Consoleで取得したOAuthクライアントID、APIキー、対象スプレッドシートIDを設定します。
            </p>
          </div>
          {isConfigEditable && (
            <button
              onClick={handleSaveApiConfigs}
              className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-md shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <i className="fa-solid fa-floppy-disk text-[11px]" />
              <span>設定を保存</span>
            </button>
          )}
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Google OAuth 2.0 クライアント ID
            </label>
            <input
              type="text"
              value={inputClientId}
              onChange={e => setInputClientId(e.target.value)}
              disabled={!isConfigEditable}
              placeholder="例: 36049065092-xxxxxxxxxxxx.apps.googleusercontent.com"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg font-mono text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400 mt-1">※ クライアントIDを変更して保存した場合、反映のためにブラウザのリロードを行ってください。</p>
          </div>

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
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg font-mono text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400 mt-1">※ スプレッドシートのURL（`/d/` と `/edit` の間）にある英数字文字列です。</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-neutral-800">
                Gemini API Key (OCR解析用)
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
              >
                <i className={`fa-solid ${showApiKey ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`} />
                <span>{showApiKey ? '非表示' : '表示'}</span>
              </button>
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={inputGeminiApiKey}
              onChange={e => setInputGeminiApiKey(e.target.value)}
              disabled={!isConfigEditable}
              placeholder="例: AIzaSy..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg font-mono text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400 mt-1">※ 伝票画像/PDFのOCR解析に適用されます。</p>
          </div>
        </div>
      </div>

      {/* 2. ユーザー招待・権限管理 (M_User) */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-users text-neutral-700" />
              <span>ユーザー管理 & 招待 (M_User)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              自分より下位の権限階層のユーザーをメールアドレスで招待・追加できます。
            </p>
          </div>
          {allowedInviteRoles.length > 0 && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-md shadow-sm flex items-center gap-1.5"
            >
              <i className="fa-solid fa-user-plus text-[10px]" />
              <span>新規ユーザーを招待</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">ユーザーID (メールアドレス)</th>
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
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      user.role === 'developer' ? 'bg-neutral-900 text-white' :
                      user.role === 'hq' ? 'bg-neutral-100 text-neutral-800' : 'bg-neutral-50 text-neutral-600'
                    }`}>
                      {user.role === 'developer' ? '開発者' : user.role === 'hq' ? '本部' : user.role === 'owner' ? '店舗責任者' : 'スタッフ'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-neutral-600">{getStoreName(user.store_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 機能別アクセス権限マトリクス表 */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-neutral-700" />
              <span>機能別アクセス権限マトリクス (システム開発者限定編集)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              各ロールにおける「編集」「閲覧」「非表示」の権限を制御します。開発者権限でのみリアルタイム変更が可能です。
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-700 border">
            {isDeveloper ? '開発者モード: 編集可' : '閲覧のみ'}
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                <th className="p-3">機能 (サイドバータブ)</th>
                <th className="p-3 text-center">開発者 (developer)</th>
                <th className="p-3 text-center">本部 (hq)</th>
                <th className="p-3 text-center">店舗責任者 (owner)</th>
                <th className="p-3 text-center">店舗スタッフ (staff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(Object.keys(tabNames) as TabType[]).map(tabKey => (
                <tr key={tabKey} className="hover:bg-neutral-50">
                  <td className="p-3 font-bold text-neutral-900">{tabNames[tabKey]}</td>
                  {(['developer', 'hq', 'owner', 'staff'] as MUser['role'][]).map(roleKey => {
                    const currentLevel = rolePermissions[tabKey]?.[roleKey] || 'hidden';
                    return (
                      <td key={roleKey} className="p-2 text-center">
                        {isDeveloper ? (
                          <select
                            value={currentLevel}
                            onChange={(e) => handlePermissionChange(tabKey, roleKey, e.target.value as PermissionLevel)}
                            className="px-2 py-1 bg-white border border-neutral-300 rounded font-bold text-xs outline-none cursor-pointer"
                          >
                            <option value="edit">編集</option>
                            <option value="view">閲覧</option>
                            <option value="hidden">非表示</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            currentLevel === 'edit' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            currentLevel === 'view' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-neutral-100 text-neutral-400'
                          }`}>
                            {currentLevel === 'edit' ? '編集' : currentLevel === 'view' ? '閲覧' : '非表示'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー招待モーダル */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user-plus text-neutral-700" />
              <span>新規ユーザー招待</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">メールアドレス *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">氏名 *</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">権限 (下位権限のみ)</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as MUser['role'])}
                    className="w-full px-2.5 py-2 bg-neutral-50 border rounded-lg font-bold"
                  >
                    {allowedInviteRoles.map(r => (
                      <option key={r} value={r}>
                        {r === 'hq' ? '本部権限' : r === 'owner' ? '店舗責任者' : '店舗スタッフ'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">所属店舗</label>
                  <select
                    value={inviteStoreId}
                    onChange={e => setInviteStoreId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-neutral-50 border rounded-lg"
                  >
                    {M_Store.map(s => (
                      <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 bg-neutral-100 text-xs font-semibold rounded-lg">キャンセル</button>
              <button onClick={handleInviteUser} className="px-5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg">招待・登録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};