/** 台銀 USD L6M CSV 解析結果（原始字串，formatting 交給呼叫端的 Money）。 */
export interface ParsedUsdRate {
  /** 牌告日 YYYY-MM-DD。 */
  boardDate: string;
  /** 即期賣出（本行賣出/即期）原始字串，例如 "31.68000"。 */
  spotSell: string;
}

/** 「本行賣出 / 即期」在 CSV 的欄位索引（0-indexed）。 */
const SPOT_SELL_COL = 14;

/** UTF-8 BOM（U+FEFF）。 */
const BOM = '﻿';

/**
 * 解析台銀 `/xrt/flcsv/0/L6M/USD` CSV，取最新一行（最上面的資料列）的牌告日與
 * 即期賣出。純函式、無 I/O、無 shared 依賴。格式異常一律 fail loud（拋錯），
 * 不得回傳半套資料（design D7 / ADR-0007）。
 */
export function parseBotUsdCsv(csv: string): ParsedUsdRate {
  const lines = (csv.startsWith(BOM) ? csv.slice(1) : csv)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');

  // 第 0 行為表頭；至少要有一筆資料列。
  if (lines.length < 2) {
    throw new Error(`BOT CSV：找不到資料列（lines=${lines.length}）`);
  }

  const dataRow = lines[1];
  if (dataRow === undefined) {
    throw new Error('BOT CSV：資料列缺失');
  }

  const cols = dataRow.split(',');
  const rawDate = cols[0];
  const rawSpotSell = cols[SPOT_SELL_COL];
  if (rawDate === undefined || rawSpotSell === undefined) {
    throw new Error(`BOT CSV：欄位數不足（cols=${cols.length}）`);
  }

  if (!/^\d{8}$/.test(rawDate)) {
    throw new Error(`BOT CSV：牌告日格式異常（${rawDate}）`);
  }

  const spotSell = rawSpotSell.trim();
  const n = Number(spotSell);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`BOT CSV：即期賣出非正數（${rawSpotSell}）`);
  }

  const boardDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  return { boardDate, spotSell };
}
