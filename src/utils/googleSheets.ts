// =================================================================
// Google Sheets API 連携ユーティリティ
// 1行目: ヘッダー(Key), 2行目: 日本語説明, 3行目以降: データ
// =================================================================

// 1. スプレッドシートからの全データ取得
export const fetchSheetData = async <T>(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<T[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1:Z?valueRenderOption=UNFORMATTED_VALUE`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`シート '${sheetName}' の取得に失敗しました (Status: ${response.status})`);
    }

    const data = await response.json();
    if (!data.values || data.values.length < 3) {
      return []; // データ行(3行目以降)がない場合は空配列
    }

    const headers: string[] = data.values[0];   // 1行目: 英語キー
    const dataRows: any[][] = data.values.slice(2); // 3行目以降: 実データ

    return dataRows.map((row) => {
      const record: any = {};
      headers.forEach((key, index) => {
        let val = row[index] !== undefined ? row[index] : '';
        // ブール値文字の型変換 (TRUE / FALSE)
        if (val === 'TRUE' || val === true) val = true;
        if (val === 'FALSE' || val === false) val = false;
        record[key] = val;
      });
      return record as T;
    });
  } catch (error) {
    console.error(`fetchSheetData Error [${sheetName}]:`, error);
    throw error;
  }
};

// 2. スプレッドシートへの全行更新 (3行目以降の上書き同期)
export const updateSheetData = async <T extends Record<string, any>>(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  records: T[]
): Promise<boolean> => {
  try {
    // 既存の3行目以降をクリア
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A3:Z:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (records.length === 0) return true;

    // ヘッダー順に並べ替えた2次元配列データを作成
    const rows = records.map((record) =>
      headers.map((key) => {
        const val = record[key];
        if (val === undefined || val === null) return '';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return val;
      })
    );

    // 3行目以降へ一括更新
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A3:Z?valueInputOption=USER_ENTERED`;
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });

    if (!response.ok) {
      throw new Error(`シート '${sheetName}' の更新に失敗しました`);
    }

    return true;
  } catch (error) {
    console.error(`updateSheetData Error [${sheetName}]:`, error);
    throw error;
  }
};

// 3. 全9シートの一括読み込み関数
export const fetchAllDatabaseSheets = async (
  accessToken: string,
  spreadsheetId: string
) => {
  const [
    M_Store,
    M_User,
    M_Supplier,
    M_Item,
    T_Invoice,
    T_Invoice_Line,
    T_Inventory_Count,
    T_Monthly_Sales,
    T_Cost_Calculation
  ] = await Promise.all([
    fetchSheetData(accessToken, spreadsheetId, 'M_Store'),
    fetchSheetData(accessToken, spreadsheetId, 'M_User'),
    fetchSheetData(accessToken, spreadsheetId, 'M_Supplier'),
    fetchSheetData(accessToken, spreadsheetId, 'M_Item'),
    fetchSheetData(accessToken, spreadsheetId, 'T_Invoice'),
    fetchSheetData(accessToken, spreadsheetId, 'T_Invoice_Line'),
    fetchSheetData(accessToken, spreadsheetId, 'T_Inventory_Count'),
    fetchSheetData(accessToken, spreadsheetId, 'T_Monthly_Sales'),
    fetchSheetData(accessToken, spreadsheetId, 'T_Cost_Calculation')
  ]);

  return {
    M_Store,
    M_User,
    M_Supplier,
    M_Item,
    T_Invoice,
    T_Invoice_Line,
    T_Inventory_Count,
    T_Monthly_Sales,
    T_Cost_Calculation
  };
};