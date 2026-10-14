import React from 'react';
import { TabType, MUser, MStore, DataMode, RolePermissions } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: MUser;
  currentStore: MStore;
  unresolvedInvoicesCount: number;
  unlinkedMatchingCount: number;
  dataMode: DataMode;
  rolePermissions: RolePermissions;
  toggleDemoRole?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  currentStore,
  unresolvedInvoicesCount,
  unlinkedMatchingCount,
  dataMode,
  rolePermissions,
  toggleDemoRole,
}) => {
  const tabs = [
    { id: 'dashboard' as TabType, name: 'ダッシュボード・推移表', icon: 'fa-solid fa-chart-pie' },
    { id: 'ocr' as TabType, name: '仕入伝票登録・OCR', icon: 'fa-solid fa-file-invoice', badge: unresolvedInvoicesCount },
    { id: 'matching' as TabType, name: '棚卸・OCRマッチング', icon: 'fa-solid fa-link', badge: unlinkedMatchingCount },
    { id: 'inventory' as TabType, name: '月次実地棚卸入力', icon: 'fa-solid fa-clipboard-check' },
    { id: 'cost' as TabType, name: '原価計算・仕入集計', icon: 'fa-solid fa-calculator' },
    { id: 'master' as TabType, name: 'マスタ管理', icon: 'fa-solid fa-database' },
    { id: 'system' as TabType, name: 'システム管理', icon: 'fa-solid fa-gear' },
  ];

  // 権限マトリクスにより非表示(hidden)以外のタブを表示
  const visibleTabs = tabs.filter(tab => {
    const level = rolePermissions[tab.id]?.[currentUser.role] || 'hidden';
    return level !== 'hidden';
  });

  // デモデータ選択時かつ開発者または本部権限ユーザーのみUIプレビュー切替を許可
  const canSwitchDemoRole = dataMode === 'demo' && (currentUser.role === 'developer' || currentUser.role === 'hq') && toggleDemoRole;

  return (
    <aside className="w-60 bg-neutral-950 text-neutral-300 flex flex-col shrink-0 border-r border-neutral-800/80 z-20">
      <div className="h-16 flex items-center px-5 border-b border-neutral-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-100 text-sm">
          <i className="fa-solid fa-boxes-stacked" />
        </div>
        <div>
          <div className="font-bold text-white tracking-tight text-sm leading-tight">GENZONE</div>
          <div className="text-[10px] font-medium text-neutral-400 tracking-wider">在庫管理システム</div>
        </div>
      </div>

      <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/40 space-y-2">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center justify-center text-[10px] shrink-0">
              <i className={
                currentUser.role === 'developer' ? 'fa-solid fa-code' :
                currentUser.role === 'hq' ? 'fa-solid fa-building-flag' :
                currentUser.role === 'owner' ? 'fa-solid fa-user-shield' : 'fa-solid fa-user'
              } />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-neutral-200 truncate">{currentUser.user_name}</div>
              <div className="text-[10px] text-neutral-400">{currentStore.store_name}</div>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border border-neutral-700 bg-neutral-800 text-neutral-200">
            {currentUser.role === 'developer' ? '開発者' : currentUser.role === 'hq' ? '本部' : currentUser.role === 'owner' ? '責任者' : 'スタッフ'}
          </span>
        </div>

        {/* 【要件適用】デモデータモード時かつシステム管理者・本部権限者のみ表示されるUIプレビュー切替 */}
        {canSwitchDemoRole && (
          <button
            onClick={toggleDemoRole}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-eye text-neutral-400 text-xs" />
              <span>UI表示切替 (デモのみ)</span>
            </span>
            <i className="fa-solid fa-chevron-right text-[9px] text-neutral-400" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">機能一覧</div>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-xs font-medium relative group cursor-pointer ${
                isActive ? 'bg-neutral-100 text-neutral-950 font-bold shadow-sm' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <i className={`${tab.icon} w-4 text-center text-xs`} />
              <span className="flex-1 truncate">{tab.name}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0 ${
                  isActive ? 'bg-neutral-950 text-white' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-800/80 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
        <span>参照: {dataMode === 'demo' ? 'デモ' : 'スプシ本番'}</span>
        <span>最終仕入原価法</span>
      </div>
    </aside>
  );
};