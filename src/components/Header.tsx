import React from 'react';
import { TabType, MUser, MStore } from '../types';

interface HeaderProps {
  activeTab: TabType;
  currentUser: MUser;
  selectableStores: MStore[];
  selectedStoreId: string;
  setSelectedStoreId: (storeId: string) => void;
  availableMonths: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  toggleUserRole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currentUser,
  selectableStores,
  selectedStoreId,
  setSelectedStoreId,
  availableMonths,
  selectedMonth,
  setSelectedMonth,
  toggleUserRole,
}) => {
  const tabTitles: Record<TabType, string> = {
    dashboard: 'ダッシュボード・原価推移表',
    ocr: '仕入伝票登録・OCR解析',
    matching: '棚卸・OCRマッチング',
    inventory: '月次実地棚卸入力',
    cost: '原価計算・仕入集計',
    master: 'マスタ管理',
    system: 'システム管理',
  };

  const formatMonthJP = (mStr: string) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    return `${year}年${Number(month)}月`;
  };

  return (
    <header className="h-14 bg-white border-b border-neutral-200/90 flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <span>{tabTitles[activeTab]}</span>
        </h1>
        {currentUser.role === 'hq' ? (
          <span className="hidden sm:inline-block px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[10px] font-mono font-medium">
            本部（全店舗閲覧）
          </span>
        ) : currentUser.role === 'owner' ? (
          <span className="hidden sm:inline-block px-2 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-[10px] font-mono font-medium">
            店舗責任者（管理者）
          </span>
        ) : (
          <span className="hidden sm:inline-block px-2 py-0.5 bg-neutral-100 text-neutral-500 border border-neutral-200 rounded text-[10px] font-mono">
            現場担当（閲覧制限中）
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* 店舗セレクター */}
        <div className="flex items-center bg-neutral-100 hover:bg-neutral-200/70 rounded-md px-2 py-1 border border-neutral-200 transition-colors">
          <i className="fa-solid fa-store text-neutral-400 text-[11px] mr-1.5" />
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-neutral-800 outline-none cursor-pointer"
          >
            {selectableStores.map((store) => (
              <option key={store.store_id} value={store.store_id}>
                {store.store_name} {store.fiscal_month ? `(決算:${store.fiscal_month}月)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 月セレクター */}
        <div className="flex items-center bg-neutral-100 hover:bg-neutral-200/70 rounded-md px-2 py-1 border border-neutral-200 transition-colors">
          <i className="fa-regular fa-calendar-days text-neutral-400 text-[11px] mr-1.5" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-semibold text-neutral-800 outline-none cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthJP(m)}
              </option>
            ))}
          </select>
        </div>

        {/* 権限切替クイックボタン */}
        <button
          onClick={toggleUserRole}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 shadow-sm active:scale-95"
        >
          <i className={
            currentUser.role === 'hq'
              ? 'fa-solid fa-building-flag text-neutral-700'
              : currentUser.role === 'owner'
              ? 'fa-solid fa-shield-halved text-neutral-700'
              : 'fa-solid fa-user text-neutral-500'
          } />
          <span>{currentUser.role === 'hq' ? '本部' : currentUser.role === 'owner' ? 'オーナー' : 'スタッフ'}</span>
        </button>
      </div>
    </header>
  );
};