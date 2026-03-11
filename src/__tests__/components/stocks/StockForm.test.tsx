/**
 * TDD Test — StockForm
 * Design Section 9.2: FE-20 ~ FE-29
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import StockForm from '@/components/stocks/StockForm';
import type { Stock } from '@/types';
import { mockLookupResults } from '../../mocks/handlers/stocks';

// MSW 서버 설정
const server = setupServer(
  http.get('/api/prices/lookup', () => {
    return HttpResponse.json(mockLookupResults);
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const mockStock: Stock = {
  id: 'stock-id-1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  market: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  memo: '핵심 보유 종목',
  created_at: '2026-03-11T10:00:00.000+09:00',
  updated_at: '2026-03-11T10:00:00.000+09:00',
};

describe('StockForm', () => {
  // FE-20: 7개 필드 입력 요소 존재
  it('FE-20: 7개 필드(ticker/name/market/country/currency/sector/memo) 존재', () => {
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/티커/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/종목명/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/거래소/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/국가/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/통화/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/업종/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/메모/i)).toBeInTheDocument();
  });

  // FE-21: ticker input controlled
  it('FE-21: ticker input controlled', async () => {
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const tickerInput = screen.getByLabelText(/티커/i);
    await user.type(tickerInput, 'AAPL');
    expect(tickerInput).toHaveValue('AAPL');
  });

  // FE-22: [조회] → MSW lookup 성공 → name/market/currency 자동 채움
  it('FE-22: [조회] 클릭 → lookup 성공 → name/market/currency 자동 채움', async () => {
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const tickerInput = screen.getByLabelText(/티커/i);
    await user.type(tickerInput, 'AAPL');
    await user.click(screen.getByRole('button', { name: /조회/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/종목명/i)).toHaveValue('Apple Inc.');
    });
    // exchange NMS → NASDAQ 매핑
    expect(screen.getByLabelText(/거래소/i)).toHaveValue('NASDAQ');
    // currency USD
    expect(screen.getByLabelText(/통화/i)).toHaveValue('USD');
  });

  // FE-23: [조회] 중 → 버튼 disabled, 로딩 텍스트
  it('FE-23: [조회] 중 → 조회 버튼 disabled', async () => {
    server.use(
      http.get('/api/prices/lookup', async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(mockLookupResults);
      })
    );
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const tickerInput = screen.getByLabelText(/티커/i);
    await user.type(tickerInput, 'AAPL');
    const lookupBtn = screen.getByRole('button', { name: /조회/i });
    await user.click(lookupBtn);
    expect(lookupBtn).toBeDisabled();
  });

  // FE-24: [조회] 실패 에러 표시 — 빈 배열 반환 시 에러
  it('FE-24: lookup 빈 배열 → lookupError 메시지 표시', async () => {
    server.use(
      http.get('/api/prices/lookup', () => {
        return HttpResponse.json([]);
      })
    );
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/티커/i), 'UNKNOWN');
    await user.click(screen.getByRole('button', { name: /조회/i }));
    await waitFor(() => {
      expect(screen.getByText(/검색 결과가 없습니다|종목을 찾을 수 없습니다/i)).toBeInTheDocument();
    });
  });

  // FE-25: ticker='' → fetch 미호출, 인라인 에러
  it('FE-25: ticker 공백 → [조회] 클릭 시 fetch 미호출, 에러 표시', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /조회/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/티커를 입력하세요/i)).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  // FE-26: initialData 있으면 각 필드 채워짐
  it('FE-26: initialData(edit 모드) → 각 필드 채워짐', () => {
    render(<StockForm initialData={mockStock} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/티커/i)).toHaveValue('AAPL');
    expect(screen.getByLabelText(/종목명/i)).toHaveValue('Apple Inc.');
    expect(screen.getByLabelText(/거래소/i)).toHaveValue('NASDAQ');
    expect(screen.getByLabelText(/통화/i)).toHaveValue('USD');
    expect(screen.getByLabelText(/업종/i)).toHaveValue('Technology');
    expect(screen.getByLabelText(/메모/i)).toHaveValue('핵심 보유 종목');
  });

  // FE-27: 필수 필드 입력 후 [저장] → onSubmit(formState) 1회
  it('FE-27: 필수 필드 입력 후 [저장] → onSubmit 1회 호출', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<StockForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/티커/i), 'AAPL');
    await user.type(screen.getByLabelText(/종목명/i), 'Apple Inc.');
    await user.type(screen.getByLabelText(/거래소/i), 'NASDAQ');
    await user.type(screen.getByLabelText(/통화/i), 'USD');
    await user.click(screen.getByRole('button', { name: /저장/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        market: 'NASDAQ',
        currency: 'USD',
      })
    );
  });

  // FE-28: name='' [저장] → onSubmit 미호출, 유효성 메시지
  it('FE-28: name 공백 → [저장] 차단, 유효성 메시지', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<StockForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/티커/i), 'AAPL');
    // name 비워둠
    await user.click(screen.getByRole('button', { name: /저장/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/종목명을 입력하세요/i)).toBeInTheDocument();
  });

  // FE-29: country select 변경 → 값 반영
  it('FE-29: country select 변경 → 값 반영', async () => {
    const user = userEvent.setup();
    render(<StockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const countrySelect = screen.getByLabelText(/국가/i);
    await user.selectOptions(countrySelect, 'US');
    expect(countrySelect).toHaveValue('US');
  });

  // [취소] 클릭 → onCancel 호출
  it('[취소] 클릭 → onCancel 호출', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<StockForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /취소/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
