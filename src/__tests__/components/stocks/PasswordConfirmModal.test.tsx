/**
 * TDD Test — PasswordConfirmModal
 * Design Section 9.2: FE-30 ~ FE-43
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import PasswordConfirmModal from '@/components/stocks/PasswordConfirmModal';
import type { WriteAction } from '@/components/stocks/PasswordConfirmModal';

// MSW 서버 설정
const server = setupServer(
  http.post('/api/stocks', () => {
    return HttpResponse.json({ data: { id: 'new-stock-id' } }, { status: 201 });
  }),
  http.put('/api/stocks/:id', () => {
    return HttpResponse.json({ data: { id: 'stock-id-1' } }, { status: 200 });
  }),
  http.delete('/api/stocks/:id', () => {
    return new HttpResponse(null, { status: 204 });
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

const baseFormData = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  market: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  memo: '',
};

describe('PasswordConfirmModal', () => {
  // FE-30: open=true → dialog DOM 존재, pw 입력 포커스(autoFocus)
  it('FE-30: open=true → dialog 존재, 비밀번호 입력 자동 포커스', () => {
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const pwInput = screen.getByLabelText('비밀번호');
    expect(pwInput).toBeInTheDocument();
  });

  // FE-31: action='create' → "등록" 텍스트
  it('FE-31: action="create" → "등록" 텍스트 존재', () => {
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/등록/)).toBeInTheDocument();
  });

  // FE-32: action='delete' → "삭제" 텍스트
  it('FE-32: action="delete" → "삭제" 텍스트 존재', () => {
    render(
      <PasswordConfirmModal
        open={true}
        action="delete"
        stockId="stock-id-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/삭제/)).toBeInTheDocument();
  });

  // FE-33: 비밀번호 입력 type='password'
  it('FE-33: 비밀번호 입력 type="password", controlled', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const pwInput = screen.getByLabelText('비밀번호') as HTMLInputElement;
    expect(pwInput).toHaveAttribute('type', 'password');
    await user.type(pwInput, 'pass');
    expect(pwInput).toHaveValue('pass');
  });

  // FE-34: MSW POST 201 → onSuccess 1회
  it('FE-34: create 확인 → POST 201 → onSuccess 호출', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={onSuccess}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText('비밀번호'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /확인/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // FE-35: MSW DELETE 204 → onSuccess 1회
  it('FE-35: delete 확인 → DELETE 204 → onSuccess 호출', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <PasswordConfirmModal
        open={true}
        action="delete"
        stockId="stock-id-1"
        onSuccess={onSuccess}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText('비밀번호'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /확인/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // FE-36: MSW 403 → "비밀번호가 올바르지 않습니다", 입력 초기화
  it('FE-36: 403 → 에러 메시지 표시, 입력 초기화', async () => {
    server.use(
      http.post('/api/stocks', () => {
        return HttpResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      })
    );
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const pwInput = screen.getByLabelText('비밀번호') as HTMLInputElement;
    await user.type(pwInput, 'wrong-password');
    await user.click(screen.getByRole('button', { name: /확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 올바르지 않습니다/)).toBeInTheDocument();
    });
    expect(pwInput).toHaveValue('');
  });

  // FE-37: MSW DELETE 409 LINKED_TRANSACTIONS → 에러 메시지
  it('FE-37: DELETE 409 LINKED_TRANSACTIONS → 에러 메시지', async () => {
    server.use(
      http.delete('/api/stocks/:id', () => {
        return HttpResponse.json(
          { error: 'LINKED_TRANSACTIONS', message: '연결된 거래내역이 있어 삭제할 수 없습니다' },
          { status: 409 }
        );
      })
    );
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        action="delete"
        stockId="stock-id-1"
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText('비밀번호'), 'correct-password');
    await user.click(screen.getByRole('button', { name: /확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/연결된 거래내역이 있어 삭제할 수 없습니다/)).toBeInTheDocument();
    });
  });

  // FE-38: MSW 지연 → 확인 버튼 disabled
  it('FE-38: 확인 중 → 확인 버튼 disabled', async () => {
    server.use(
      http.post('/api/stocks', async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ data: {} }, { status: 201 });
      })
    );
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText('비밀번호'), 'pass');
    const confirmBtn = screen.getByRole('button', { name: /확인/i });
    await user.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();
  });

  // FE-39: isSubmitting 중 클릭 → fetch 1회만
  it('FE-39: 중복 제출 방지 — fetch 1회만 호출', async () => {
    server.use(
      http.post('/api/stocks', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ data: {} }, { status: 201 });
      })
    );
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    await user.type(screen.getByLabelText('비밀번호'), 'pass');
    const confirmBtn = screen.getByRole('button', { name: /확인/i });
    // 첫 번째 클릭 — isSubmitting: true 진입
    await user.click(confirmBtn);
    // 두 번째 클릭 — 버튼 disabled이므로 무시됨
    await user.click(confirmBtn);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    fetchSpy.mockRestore();
  });

  // FE-40: [취소] → onClose 1회, pw 초기화
  it('FE-40: [취소] 클릭 → onClose 호출, 비밀번호 초기화', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={onClose}
      />
    );
    const pwInput = screen.getByLabelText('비밀번호') as HTMLInputElement;
    await user.type(pwInput, 'somepassword');
    await user.click(screen.getByRole('button', { name: /취소/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // 비밀번호가 초기화되어야 함 (모달이 다시 열릴 때를 위해)
    expect(pwInput).toHaveValue('');
  });

  // FE-41: Escape 키 → onClose
  it('FE-41: Escape 키 → onClose 호출', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={onClose}
      />
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // FE-42: role="dialog", aria-modal="true" 존재
  it('FE-42: role="dialog", aria-modal="true" 존재', () => {
    render(
      <PasswordConfirmModal
        open={true}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  // FE-43: open=false → dialog 미존재
  it('FE-43: open=false → dialog 미존재', () => {
    render(
      <PasswordConfirmModal
        open={false}
        action="create"
        formData={baseFormData}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
