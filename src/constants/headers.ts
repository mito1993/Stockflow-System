import { DatabaseState } from '../types';

export const SHEET_HEADERS: Record<keyof DatabaseState, string[]> = {
  M_Store: ['store_id', 'store_name', 'address', 'fiscal_month'],
  M_User: ['user_id', 'password', 'user_name', 'role', 'store_id'],
  M_Supplier: ['supplier_id', 'supplier_name', 'contact'],
  M_Item: ['item_id', 'supplier_id', 'item_name', 'inventory_target', 'category', 'unit', 'store_id'],
  T_Invoice: ['invoice_id', 'supplier_id', 'store_id', 'invoice_date', 'status', 'file_url'],
  T_Invoice_Line: [
    'line_id', 'invoice_id', 'file_url', 'item_id', 'item_name', 'inventory_target',
    'supplier_id', 'supplier_name', 'quantity', 'unit_price', 'total_price',
    'is_manual_edited', 'unit', 'converted_item_name', 'converted_supplier_name',
    'is_new_item', 'is_new_supplier', 'status', 'invoice_date', 'store_id'
  ],
  T_Inventory_Count: [
    'count_id', 'store_id', 'target_month', 'item_id', 'actual_quantity',
    'item_name', 'input_datetime', 'input_user_id', 'is_new_count_flag'
  ],
  T_Monthly_Sales: ['sales_id', 'store_id', 'target_month', 'sales_amount'],
  T_Cost_Calculation: [
    'target_month', 'store_id', 'item_id', 'supplier_id', 'beginning_stock',
    'monthly_purchase', 'ending_stock', 'consumption_qty', 'latest_unit_price',
    'consumption_cost'
  ],
};