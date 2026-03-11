import YahooFinance from 'yahoo-finance2';
import type { Quote } from 'yahoo-finance2/modules/quote';
import { PriceQuote, HistoricalData, SearchResult, PriceMap, LookupResult } from '@/types';

// yahoo-finance2 v3: 클래스 인스턴스 사용 (static 메서드는 deprecated)
const yf = new YahooFinance();

export async function getQuote(ticker: string): Promise<PriceQuote> {
  const result: Quote = await yf.quote(ticker);
  return {
    price: result.regularMarketPrice ?? 0,
    currency: result.currency ?? '',
    changePercent: result.regularMarketChangePercent ?? 0,
    name: result.shortName ?? result.longName ?? ticker,
  };
}

export async function getHistorical(
  ticker: string,
  from: string,
  to: string,
  interval: '1d' | '1mo'
): Promise<HistoricalData[]> {
  try {
    const results = await yf.historical(ticker, {
      period1: from,
      period2: to,
      interval,
    });

    return results.map((item) => ({
      date:
        item.date instanceof Date
          ? item.date.toISOString().slice(0, 10)
          : String(item.date).slice(0, 10),
      open: item.open ?? 0,
      high: item.high ?? 0,
      low: item.low ?? 0,
      close: item.adjClose ?? item.close ?? 0,
      volume: item.volume ?? 0,
    }));
  } catch {
    return [];
  }
}

// exchange 코드에서 국가 코드를 추출하는 헬퍼
function inferCountryFromExchange(exchange: string): string {
  const exchangeCountryMap: Record<string, string> = {
    KSC: 'KR', KOE: 'KR',  // 한국 KOSPI / KOSDAQ
    NMS: 'US', NYQ: 'US', NGM: 'US', PCX: 'US', ASE: 'US', // 미국
    TYO: 'JP', OSA: 'JP',  // 일본
    LSE: 'GB',              // 영국
    HKG: 'HK',              // 홍콩
    SHH: 'CN', SHZ: 'CN',  // 중국
  };
  return exchangeCountryMap[exchange] ?? '';
}

// exchange 코드에서 기본 통화를 추출하는 헬퍼
function inferCurrencyFromExchange(exchange: string): string {
  const exchangeCurrencyMap: Record<string, string> = {
    KSC: 'KRW', KOE: 'KRW',
    NMS: 'USD', NYQ: 'USD', NGM: 'USD', PCX: 'USD', ASE: 'USD',
    TYO: 'JPY', OSA: 'JPY',
    LSE: 'GBP',
    HKG: 'HKD',
    SHH: 'CNY', SHZ: 'CNY',
  };
  return exchangeCurrencyMap[exchange] ?? '';
}

export async function searchTicker(query: string): Promise<SearchResult[]> {
  try {
    const result = await yf.search(query);
    const quotes = result.quotes ?? [];

    return quotes
      .filter((q) => 'isYahooFinance' in q && (q as Record<string, unknown>)['isYahooFinance'] === true)
      .map((q) => {
        const raw = q as Record<string, unknown>;
        const exchange = typeof raw['exchange'] === 'string' ? raw['exchange'] : '';
        return {
          ticker: String(raw['symbol'] ?? ''),
          name:
            (typeof raw['shortname'] === 'string' ? raw['shortname'] : undefined) ??
            (typeof raw['longname'] === 'string' ? raw['longname'] : undefined) ??
            String(raw['symbol'] ?? ''),
          exchange,
          market: typeof raw['exchDisp'] === 'string' ? raw['exchDisp'] : '',
          country:
            (typeof raw['country'] === 'string' && raw['country'] !== '' ? raw['country'] : undefined) ??
            inferCountryFromExchange(exchange),
          currency:
            (typeof raw['currency'] === 'string' && raw['currency'] !== '' ? raw['currency'] : undefined) ??
            inferCurrencyFromExchange(exchange),
        };
      });
  } catch {
    return [];
  }
}

// ============================================================
// 03-stocks: 추가 함수
// ============================================================

/**
 * 여러 티커의 현재가를 일괄 조회한다.
 * 개별 실패 시 해당 티커 값을 null로 설정 (전체 실패가 아님).
 */
export async function getQuotes(tickers: string[]): Promise<PriceMap> {
  const results = await Promise.allSettled(
    tickers.map((ticker) => yf.quote(ticker))
  );

  const priceMap: PriceMap = {};
  results.forEach((result, index) => {
    const ticker = tickers[index];
    if (result.status === 'fulfilled') {
      const q: Quote = result.value;
      priceMap[ticker] = {
        price: q.regularMarketPrice ?? 0,
        currency: q.currency ?? '',
        changePercent: q.regularMarketChangePercent ?? 0,
        name: q.shortName ?? q.longName ?? ticker,
      };
    } else {
      priceMap[ticker] = null;
    }
  });

  return priceMap;
}

/**
 * 티커 자동완성 검색.
 * EQUITY 유형만 필터링하여 상위 5개를 LookupResult[] 형태로 반환한다.
 * yahoo-finance2 search() 예외 시 502용 에러를 throw한다.
 */
export async function lookupTickers(q: string): Promise<LookupResult[]> {
  const result = await yf.search(q); // 예외 시 호출자(route handler)에서 502로 처리
  const quotes = result.quotes ?? [];

  return quotes
    .filter((item) => {
      const raw = item as Record<string, unknown>;
      return (
        raw['typeDisp'] === 'Equity' ||
        raw['quoteType'] === 'EQUITY'
      );
    })
    .slice(0, 5)
    .map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        ticker: String(raw['symbol'] ?? ''),
        name:
          (typeof raw['shortname'] === 'string' ? raw['shortname'] : undefined) ??
          (typeof raw['longname'] === 'string' ? raw['longname'] : undefined) ??
          String(raw['symbol'] ?? ''),
        exchange: typeof raw['exchange'] === 'string' ? raw['exchange'] : '',
        type: 'EQUITY',
      };
    });
}
