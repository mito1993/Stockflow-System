// ==========================================
// 1. データテーブル型定義 (9シート構成)
// ==========================================

// M_Store (店舗マスタ)
export interface MStore {
  store_id: string;      // 主キー (例: S001, HQ)
  store_name: string;    // 店舗名
  address: string;       // 住所
  fiscal_month: number;  // 決算月 (1〜12)
}

// M_User (ユーザーマスタ)
export interface MUser {
  user_id: string;       // メールアドレス / 主キー
  password: string;      // パスワード
  user_name: string;     // 氏名
  role: 'hq' | 'owner' | 'staff'; // 役割
  store_id: string;      // 所属店舗ID
}

// M_Supplier (取引先マスタ)
export interface MSupplier {
  supplier_id: number;   // 仕入先ID / 主キー
  supplier_name: string; // 仕入先名称
  contact: string;       // 連絡先
}

// M_Item (取引先・品目マスタ)
export interface MItem {
  item_id: number;          // 品目ID / 主キー
  supplier_id: number;      // 紐づく仕入先ID
  item_name: string;        // 品目名
  inventory_target: boolean;// 棚卸対象フラグ (TRUE/FALSE)
  category: string;         // カテゴリ
  unit: string;             // 単位
  store_id: string;         // 対象店舗ID
}

// T_Invoice (仕入伝票ヘッダ)
export interface TInvoice {
  invoice_id: number;    // 伝票ID / 主キー
  supplier_id: number;   // 仕入先ID
  store_id: string;      // 店舗ID
  invoice_date: string;  // 伝票日付
  status: '下書き' | '確認待ち' | '確定'; // ステータス
  file_url: string;      // 画像・PDF保存先URL
}

// T_Invoice_Line (仕入明細)
export interface TInvoiceLine {
  line_id: number;                 // 明細ID / 主キー
  invoice_id: number;              // 紐づく伝票ID
  file_url: string;                // 請求書/納品書URL
  item_id: number | null;          // 食材ID
  item_name: string;               // 食材名(生OCR)
  inventory_target: boolean;       // 棚卸対象
  supplier_id: number;             // 取引先ID
  supplier_name: string;           // 取引先名(生OCR)
  quantity: number;                // 個数・数量
  unit_price: number;              // 単価
  total_price: number;             // 総額
  is_manual_edited: boolean;       // 手動修正フラグ
  unit: string;                    // 単位
  converted_item_name: string;     // 変換後食材名
  converted_supplier_name: string; // 変換後取引先名
  is_new_item: boolean;            // 新規食材フラグ
  is_new_supplier: boolean;        // 新規取引先フラグ
  status?: string;                 // 伝票表示用ステータス
  invoice_date?: string;           // 伝票日付(結合用)
  store_id?: string;               // 店舗ID(結合用)
}

// T_Inventory_Count (棚卸記録)
export interface TInventoryCount {
  count_id: number;          // 棚卸ID / 主キー
  store_id: string;          // 店舗ID
  target_month: string;      // 対象月 (例: 2026-09)
  item_id: number;           // 品目ID
  actual_quantity: number;   // 実地数量
  item_name: string;         // 品目名
  input_datetime: string;    // 入力日時
  input_user_id: string;     // 入力ユーザーID
  is_new_count_flag: boolean;// 現場先行新規棚卸フラグ
}

// T_Monthly_Sales (月次売上マスタ)
export interface TMonthlySales {
  sales_id: number;      // 売上記録ID / 主キー
  store_id: string;      // 店舗ID
  target_month: string;  // 対象月
  sales_amount: number;  // 売上金額 (円)
}

// T_Cost_Calculation (原価計算・サマリ)
export interface TCostCalculation {
  target_month: string;     // 対象月
  store_id: string;         // 店舗ID
  item_id: number;          // 品目ID
  supplier_id: number;      // 取引先ID
  beginning_stock: number;  // 期首在庫数量
  monthly_purchase: number; // 当月仕入数量
  ending_stock: number;     // 期末在庫数量
  consumption_qty: number;  // 消費数量
  latest_unit_price: number;// 最新取得単価
  consumption_cost: number; // 消費金額 (原価)
  item_name?: string;       // 表示用
  supplier_name?: string;   // 表示用
  category?: string;        // 表示用
  unit?: string;            // 表示用
  inventory_target?: boolean;// 表示用
}

// 全テーブルの統合オブジェクト
export interface DatabaseState {
  M_Store: MStore[];
  M_User: MUser[];
  M_Supplier: MSupplier[];
  M_Item: MItem[];
  T_Invoice: TInvoice[];
  T_Invoice_Line: TInvoiceLine[];
  T_Inventory_Count: TInventoryCount[];
  T_Monthly_Sales: TMonthlySales[];
  T_Cost_Calculation: TCostCalculation[];
}

// ==========================================
// 2. アプリケーション共通UIステート型定義
// ==========================================
export type TabType = 'dashboard' | 'ocr' | 'matching' | 'inventory' | 'cost' | 'master' | 'system';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  icon?: string;
}

export interface MatchingHistoryItem {
  history_id: number;
  matched_at: string;
  supplier_name: string;
  raw_item_name: string;
  target_item_name: string;
  item_id: number;
  line_id?: number;
  count_id?: number;
  quantity?: number;
  actual_quantity?: number | null;
  unit: string;
  unit_price: number;
  operator: string;
}