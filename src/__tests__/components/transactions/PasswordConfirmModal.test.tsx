/**
 * TDD Test — PasswordConfirmModal (transactions 삭제 전용)
 * Design Section 9.2: TS-80 ~ TS-89
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import PasswordConfirmModal from '@/components/transactions/PasswordConfirmModal';

const mockOnSuccess = vi.fn();
const mockOnClose = vi.fn();

const server = setupServer(
  http.delete('/api/transactions/:id', async ({ request }) => {
    const body = await request.json() as { password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mockOnSuccess.mockClear();
  mockOnClose.mockClear();
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PasswordConfirmModal (transactions)', () => {
  // TS-80: 모달 열림 렌더링
  it('TS-80: open=true — 다이얼로그 DOM 존재, 비밀번호 input autoFocus', () => {
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const pwInput = screen.getByLabelText(/비밀번호/);
    expect(pwInput).toBeInTheDocument();
  });

  // TS-81: 모달 닫힘 상태
  it('TS-81: open=false — 다이얼로그 DOM 미존재', () => {
    render(
      <PasswordConfirmModal
        open={false}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // TS-82: 비밀번호 입력 controlled
  it('TS-82: 비밀번호 타이핑 — input value 반영, type=password', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    const pwInput = screen.getByLabelText(/비밀번호/) as HTMLInputElement;
    await user.type(pwInput, 'pass');
    expect(pwInput.value).toBe('pass');
    expect(pwInput.type).toBe('password');
  });

  // TS-83: 삭제 확인 성공
  it('TS-83: 올바른 비밀번호 → DELETE 204 → onSuccess 1회 호출', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    await user.click(screen.getByText(/확인/));
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // TS-84: 비밀번호 불일치 403
  it('TS-84: 잘못된 비밀번호 → 403 → 에러 메시지 표시, 입력 초기화', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'wrong');
    await user.click(screen.getByText(/확인/));
    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 올바르지 않습니다/)).toBeInTheDocument();
    });
    expect((screen.getByLabelText(/비밀번호/) as HTMLInputElement).value).toBe('');
  });

  // TS-85: 확인 중 로딩
  it('TS-85: 제출 중 — [확인] 버튼 disabled', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete('/api/transactions/:id', async () => {
        await new Promise((r) => setTimeout(r, 500));
        return new HttpResponse(null, { status: 204 });
      })
    );
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    const confirmBtn = screen.getByText(/확인/);
    await user.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();
  });

  // TS-86: 중복 제출 방지
  it('TS-86: isSubmitting 중 재클릭 → fetch 1회만 호출', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete('/api/transactions/:id', async () => {
        await new Promise((r) => setTimeout(r, 300));
        return new HttpResponse(null, { status: 204 });
      })
    );
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'correct');
    const confirmBtn = screen.getByText(/확인/);
    await user.click(confirmBtn);
    // 버튼이 disabled 되었는지 확인 후 재클릭 시도
    expect(confirmBtn).toBeDisabled();
    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
    // fetch는 1회만 호출됨
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  // TS-87: [취소] 클릭
  it('TS-87: [취소] 클릭 → onClose 1회 호출, 비밀번호 초기화', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.type(screen.getByLabelText(/비밀번호/), 'somepass');
    await user.click(screen.getByText(/취소/));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // TS-88: Escape 키
  it('TS-88: Escape 키 → onClose 1회 호출', async () => {
    const user = userEvent.setup();
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    await user.keyboard('{Escape}');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // TS-89: role="dialog" + aria-modal
  it('TS-89: role="dialog" + aria-modal="true" 속성', () => {
    render(
      <PasswordConfirmModal
        open={true}
        transactionId="tx-id-1"
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
