// 日本円（JPY）フォーマット関数
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// 年月（YYYY-MM）を日本語表記（YYYY年M月）へ変換
export const formatMonthJP = (mStr: string): string => {
  if (!mStr) return '';
  const [year, month] = mStr.split('-');
  return `${year}年${Number(month)}月`;
};

// 現在日時の標準フォーマット文字列 (YYYY-MM-DD HH:mm:ss) 取得
export const getNowDateTimeString = (): string => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

// 現在日時の簡略フォーマット文字列 (YYYY-MM-DD HH:mm) 取得
export const getNowShortDateTimeString = (): string => {
  return new Date().toISOString().replace('T', ' ').substring(0, 16);
};