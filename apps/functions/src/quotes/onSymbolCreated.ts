import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getOrFetchQuote } from './fetchQuote';
import { symbolDocToQuoteTarget } from './symbolDocToQuoteTarget';
import { yahooProvider } from './yahooProvider';

const REGION = 'asia-east1';

/**
 * 事件驅動報價發現（ADR-0006 增補）：`symbols/{symbolId}` 被建立時（新標的首次進場，
 * 多由 mobile `ensureSymbol`→`fetchSymbolMeta` 寫入）自動抓**首筆報價**寫 `quotes/{symbolId}`，
 * 使該持倉首次檢視即有現價，不必等開頁才 lazy 觸發。事件驅動 / 非排程。
 * 抓取失敗 fail-soft（log、不擲，避免觸發器無限重試）；缺/非法欄位則略過。
 */
export const onSymbolCreatedFetchQuote = onDocumentCreated(
  { document: 'symbols/{symbolId}', region: REGION },
  async (event) => {
    const target = symbolDocToQuoteTarget(event.data?.data());
    if (!target) {
      logger.warn('onSymbolCreated: 略過（symbol 文件缺/非法 market/symbol/currency）', {
        symbolId: event.params.symbolId,
      });
      return;
    }
    try {
      await getOrFetchQuote(target, yahooProvider, Date.now());
    } catch (e) {
      // fail-soft：首抓失敗不擲（避免重試風暴）；後續使用者開頁仍可由 on-demand 補抓。
      logger.error('onSymbolCreated: 首抓報價失敗（fail-soft）', { target, error: String(e) });
    }
  },
);
