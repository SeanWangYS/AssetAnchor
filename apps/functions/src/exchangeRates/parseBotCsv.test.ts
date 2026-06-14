import { parseBotUsdCsv } from './parseBotCsv';

// 真實台銀 /xrt/flcsv/0/L6M/USD 結構：UTF-8 BOM + CRLF，欄位對稱
// （本行買入：現金/即期/遠期×7；本行賣出：現金/即期/遠期×7）。
// spot_sell = 「本行賣出」段的「即期」= 第 14 欄（0-indexed）。
const HEADER =
  '資料日期,幣別,匯率,現金,即期,遠期10天,遠期30天,遠期60天,遠期90天,遠期120天,遠期150天,遠期180天,匯率,現金,即期,遠期10天,遠期30天,遠期60天,遠期90天,遠期120天,遠期150天,遠期180天,';
const ROW_0612 =
  '20260612,USD,本行買入,31.23000,31.58000,31.56700,31.52500,31.46600,31.41000,31.35400,31.29600,31.24000,本行賣出,31.90000,31.68000,31.67100,31.63400,31.58300,31.53400,31.48400,31.43700,31.38400,';
const ROW_0611 =
  '20260611,USD,本行買入,31.23000,31.58000,31.56700,31.52500,31.46500,31.41000,31.35500,31.29600,31.24100,本行賣出,31.90000,31.68000,31.67100,31.63300,31.58000,31.53200,31.48400,31.43200,31.38200,';

const BOM = '﻿';
const sample = BOM + [HEADER, ROW_0612, ROW_0611].join('\r\n') + '\r\n';

describe('parseBotUsdCsv', () => {
  it('extracts board date and spot_sell from the top data row', () => {
    const r = parseBotUsdCsv(sample);
    expect(r.boardDate).toBe('2026-06-12');
    expect(r.spotSell).toBe('31.68000'); // 本行賣出 / 即期
  });

  it('uses the latest (top) row, not older rows', () => {
    const r = parseBotUsdCsv(sample);
    expect(r.boardDate).not.toBe('2026-06-11');
  });

  it('throws when there is no data row', () => {
    expect(() => parseBotUsdCsv(BOM + HEADER + '\r\n')).toThrow();
  });

  it('throws on the BOT "no data" sentinel', () => {
    expect(() => parseBotUsdCsv(BOM + '很抱歉，本次查詢找不到任何一筆資料！')).toThrow();
  });

  it('throws when the date column is malformed', () => {
    const bad = BOM + [HEADER, ROW_0612.replace('20260612', '2026/06/12')].join('\r\n');
    expect(() => parseBotUsdCsv(bad)).toThrow();
  });

  it('throws when spot_sell is not a positive number', () => {
    const bad = BOM + [HEADER, ROW_0612.replace(',31.68000,', ',abc,')].join('\r\n');
    expect(() => parseBotUsdCsv(bad)).toThrow();
  });
});
