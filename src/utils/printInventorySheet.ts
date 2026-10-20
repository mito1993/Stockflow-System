import { TCostCalculation, MStore } from '../types';
import { formatMonthJP, getNowDateTimeString } from './formatters';

interface PrintSheetParams {
  targetMonth: string;
  currentStore: MStore;
  items: TCostCalculation[];
  isLocked: boolean;
}

/**
 * 現場用「月次実地棚卸シート」を印刷用ウィンドウで表示
 */
export const openPrintInventorySheet = ({
  targetMonth,
  currentStore,
  items,
  isLocked,
}: PrintSheetParams) => {
  const printWindow = window.open('', '_blank', 'width=1150,height=900');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
    return;
  }

  // カテゴリ順 ➔ 品目名順でソート
  const sortedItems = [...items].sort((a, b) => {
    const catCompare = (a.category || '').localeCompare(b.category || '');
    if (catCompare !== 0) return catCompare;
    return (a.item_name || '').localeCompare(b.item_name || '');
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>実地棚卸表_${currentStore.store_name}_${targetMonth}</title>
  <style>
    /* ブラウザ依存の余白崩れを防ぐため @page のマージンを最小化し、コンテナのpaddingで余白を完全制御 */
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-size: 11px;
    }
    /* 画面プレビュー時の操作バー（印刷時は非表示） */
    .screen-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background-color: #111827;
      color: #ffffff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
    .screen-toolbar .title-text {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .print-button {
      background-color: #ffffff;
      color: #111827;
      border: 1px solid #d1d5db;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .print-button:hover {
      background-color: #e5e7eb;
    }

    /* 用紙コンテナ：画面プレビュー時も印刷時も確実に余白（左右18mm、上下12mm）をキープ */
    .paper-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto 40px auto;
      padding: 12mm 18mm;
      background-color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* 印刷・PDF出力用スタイル */
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
      }
      .screen-toolbar {
        display: none !important;
      }
      .paper-sheet {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        /* ここで印刷・PDF化時の上下12mm、左右18mmの余白を強制維持 */
        padding: 12mm 18mm !important;
        box-shadow: none !important;
        border: none !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
    }

    /* 帳票ヘッダー */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: bottom;
    }
    .main-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0;
      color: #111827;
    }
    .sub-meta {
      font-size: 11px;
      color: #4b5563;
      margin-top: 4px;
    }

    /* 承認印欄 */
    .stamp-table {
      border-collapse: collapse;
      margin-left: auto;
      text-align: center;
    }
    .stamp-table th, .stamp-table td {
      border: 1px solid #374151;
      width: 65px;
      padding: 2px 4px;
      font-size: 10px;
    }
    .stamp-table th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .stamp-table td {
      height: 40px;
    }

    /* サマリバー */
    .summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 10.5px;
      font-weight: 600;
    }

    /* 棚卸データテーブル */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #9ca3af;
      padding: 5px 6px;
      font-size: 10.5px;
      word-break: break-all;
    }
    table.data-table th {
      background-color: #e5e7eb;
      color: #111827;
      font-weight: 700;
      text-align: center;
    }
    table.data-table tbody tr:nth-child(even) {
      background-color: #fbfbfb;
    }
    .col-no { width: 32px; text-align: center; font-family: monospace; }
    .col-sup { width: 125px; }
    .col-cat { width: 65px; text-align: center; }
    .col-name { width: 175px; font-weight: 700; }
    .col-unit { width: 40px; text-align: center; font-family: monospace; }
    .col-prev { width: 70px; text-align: right; font-family: monospace; font-weight: 600; }
    .col-actual { width: 90px; background-color: #ffffff; }
    .col-memo { width: auto; background-color: #ffffff; }
    .lock-tag {
      display: inline-block;
      padding: 2px 6px;
      background-color: #ef4444;
      color: #ffffff;
      font-size: 10px;
      border-radius: 3px;
      font-weight: bold;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <!-- 画面プレビュー専用操作バー（印刷・PDF時は完全非表示） -->
  <div class="screen-toolbar">
    <span class="title-text">現場用実地棚卸シート（印刷プレビュー）</span>
    <button class="print-button" onclick="window.print()">
      印刷・PDFとして保存
    </button>
  </div>

  <!-- 用紙コンテナ -->
  <div class="paper-sheet">
    <table class="header-table">
      <tr>
        <td>
          <h1 class="main-title">
            月次実地棚卸記入表
            ${isLocked ? '<span class="lock-tag">棚卸ロック済</span>' : ''}
          </h1>
          <div class="sub-meta">
            店舗名: <strong>${currentStore.store_name}</strong> ／ 対象年月: <strong>${formatMonthJP(targetMonth)}</strong>
          </div>
        </td>
        <td style="text-align: right;">
          <table class="stamp-table">
            <tr>
              <th>棚卸担当</th>
              <th>責任者</th>
              <th>本部承認</th>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="summary-bar">
      <div>出力日時: ${getNowDateTimeString()}</div>
      <div>対象食材数: ${sortedItems.length} 品目</div>
      <div>※ 先月末在庫を参考に当月末の実地在庫数を太枠内に手書き記入してください。</div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-sup">仕入先</th>
          <th class="col-cat">分類</th>
          <th class="col-name">食材名 (品目)</th>
          <th class="col-unit">単位</th>
          <th class="col-prev">先月末在庫</th>
          <th class="col-actual" style="border: 2px solid #111827; background-color: #f3f4f6;">当月末実地在庫</th>
          <th class="col-memo">備考・ロット・保管場所</th>
        </tr>
      </thead>
      <tbody>
        ${sortedItems
          .map(
            (item, idx) => `
          <tr>
            <td class="col-no">${idx + 1}</td>
            <td class="col-sup">${item.supplier_name || '-'}</td>
            <td class="col-cat">${item.category || '-'}</td>
            <td class="col-name">${item.item_name}</td>
            <td class="col-unit">${item.unit}</td>
            <td class="col-prev">${item.beginning_stock}</td>
            <td class="col-actual" style="border-left: 2px solid #111827; border-right: 2px solid #111827;"></td>
            <td class="col-memo"></td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};