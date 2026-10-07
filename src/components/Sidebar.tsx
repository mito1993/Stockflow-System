import React from 'react';
import { TabType, MUser, MStore, DataMode } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currentUser: MUser;
  currentStore: MStore;
  toggleUserRole: () => void;
  unresolvedInvoicesCount: number;
  unlinkedMatchingCount: number;
  dataMode: DataMode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  currentStore,
  toggleUserRole,
  unresolvedInvoicesCount,
  unlinkedMatchingCount,
  dataMode,
}) => {
  const tabs = [
    { id: 'dashboard' as TabType, name: 'ダッシュボード・推移表', icon: 'fa-solid fa-chart-pie', role: 'all' },
    { id: 'ocr' as TabType, name: '仕入伝票登録・OCR', icon: 'fa-solid fa-file-invoice', role: 'all', badge: unresolvedInvoicesCount },
    { id: 'matching' as TabType, name: '棚卸・OCRマッチング', icon: 'fa-solid fa-link', role: 'admin', badge: unlinkedMatchingCount },
    { id: 'inventory' as TabType, name: '月次実地棚卸入力', icon: 'fa-solid fa-clipboard-check', role: 'all' },
    { id: 'cost' as TabType, name: '原価計算・仕入集計', icon: 'fa-solid fa-calculator', role: 'all' },
    { id: 'master' as TabType, name: 'マスタ管理', icon: 'fa-solid fa-database', role: 'admin' },
    { id: 'system' as TabType, name: 'システム管理', icon: 'fa-solid fa-gear', role: 'admin' },
  ];

  // 開発者・本部・オーナーは全タブアクセス可能
  const visibleTabs = tabs.filter(tab => {
    if (tab.role === 'all') return true;
    return currentUser.role === 'developer' || currentUser.role === 'owner' || currentUser.role === 'hq';
  });

  const isRoleToggleDisabled = dataMode === 'sheets' && (currentUser.role !== 'developer' && currentUser.role !== 'hq');

  return (
    <aside className="w-60 bg-neutral-950 text-neutral-300 flex flex-col shrink-0 border-r border-neutral-800/80 z-20">
      <div className="h-16 flex items-center px-5 border-b border-neutral-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-100 text-sm">
          <i className="fa-solid fa-boxes-stacked" />
        </div>
        <div>
          <div className="font-bold text-white tracking-tight text-sm leading-tight">StockFlow</div>
          <div className="text-[10px] font-medium text-neutral-400 tracking-wider">在庫管理システム v4.0</div>
        </div>
      </div>

      <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/40">
        <div className="flex items-center justify-between gap-2 px-2 py-1 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center justify-center text-[10px] shrink-0">
              {currentUser.role === 'developer' ? (
                <i className="fa-solid fa-code" />
              ) : currentUser.role === 'hq' ? (
                <i className="fa-solid fa-building-flag" />
              ) : currentUser.role === 'owner' ? (
                <i className="fa-solid fa-user-shield" />
              ) : (
                <i className="fa-solid fa-user" />
              )}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-neutral-200 truncate">{currentUser.user_name}</div>
              <div className="text-[10px] text-neutral-400">{currentStore.store_name}</div>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border border-neutral-700 bg-neutral-800 text-neutral-200">
            {currentUser.role === 'developer' ? '開発者' : currentUser.role === 'hq' ? '本部' : currentUser.role === 'owner' ? '店舗責任者' : '現場担当'}
          </span>
        </div>

        <button
          onClick={toggleUserRole}
          disabled={isRoleToggleDisabled}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
            isRoleToggleDisabled
              ? 'bg-neutral-900/50 text-neutral-600 border-neutral-800/50 cursor-not-allowed'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-arrows-rotate text-neutral-400 text-xs" />
            <span>権限切替: {currentUser.role === 'developer' ? '開発者' : currentUser.role === 'hq' ? '本部統括' : currentUser.role === 'owner' ? '店舗オーナー' : 'スタッフ'}</span>
          </span>
          <i className="fa-solid fa-chevron-right text-[9px] text-neutral-400" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">機能一覧</div>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-xs font-medium relative group ${
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

        {currentUser.role === 'staff' && (
          <div className="pt-4 px-2">
            <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed">
              <div className="font-bold text-neutral-300 flex items-center gap-1.5 mb-1">
                <i className="fa-solid fa-lock text-neutral-400" /> スタッフ権限
              </div>
              マスタ管理・システム設定・棚卸/OCRマッチングは閲覧制限されています。
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-neutral-800/80 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
        <span>参照モード: {dataMode === 'demo' ? 'デモ' : 'スプシ本番'}</span>
        <span>最終仕入原価法</span>
      </div>
    </aside>
  );
};