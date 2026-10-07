import { DatabaseState } from '../types';

// 初期ダミーデータ (Googleスプレッドシート未接続・デモモード時に使用)
export const INITIAL_DATABASE: DatabaseState = {
  M_Store: [
    { store_id: 'S001', store_name: '渋谷本店', address: '東京都渋谷区道玄坂1-2-3', fiscal_month: 3 },
    { store_id: 'S002', store_name: '新宿店', address: '東京都新宿区西新宿2-8-1', fiscal_month: 12 },
  ],
  M_User: [
    { user_id: 'dev@example.com', password: 'password123', user_name: '開発者 (全権限デベロッパー)', role: 'developer', store_id: 'HQ' },
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
    { line_id: 1, invoice_id: 101, file_url: '/dummy/inv101.pdf', item_id: 1, item_name: '国産 牛ﾊﾞﾗ ｽﾗｲｽ', inventory_target: true, supplier_id: 1, supplier_name: '肉のﾊﾅマサ', quantity: 20, unit_price: 1300, total_price: 26000, is_manual_edited: false, unit: 'kg', converted_item_name: '牛バラ肉', converted_supplier_name: '肉のハナマサ 精肉部', is_new_item: false, is_new_supplier: false, status: '確定', invoice_date: '2026-09-02', store_id: 'S001' },
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