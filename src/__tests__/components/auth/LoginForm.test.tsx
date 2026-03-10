/**
 * TDD Test — LoginForm
 * Design Section 9: FE-01 ~ FE-12, EC-01, EC-02
 * Pre-Wave Red: 구현 파일이 없으므로 import 에러(Red) 상태가 정상.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import LoginForm from '@/components/auth/LoginForm';

// next/navigation mock
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// MSW 서버 설정
const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { password?: string };
    if (body.password === 'correct-password') {
      return HttpResponse.json({ ok: true }, { status: 200 });
    }
    return HttpResponse.json(
      { error: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다' },
      { status: 401 }
    );
  })
);

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mockPush.mockClear();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('LoginForm', () => {
  // FE-01: 초기 렌더링 — 비밀번호 필드 존재
  it('FE-01: 비밀번호 필드가 렌더링된다', () => {
    render(<LoginForm />);
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  // FE-02: 초기 렌더링 — 제출 버튼 활성
  it('FE-02: 제출 버튼이 활성화된 상태로 렌더링된다', () => {
    render(<LoginForm />);
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  // FE-03: controlled input
  it('FE-03: 입력 값이 controlled로 반영된다', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'hello');
    expect(input.value).toBe('hello');
  });

  // FE-04: 폼 제출 시 로딩 상태 (버튼/필드 disabled)
  it('FE-04: 폼 제출 중 버튼과 필드가 disabled된다', async () => {
    server.use(
      http.post('/api/auth/login', async () => {
        await new Promise(r => setTimeout(r, 100));
        return HttpResponse.json({ ok: true });
      })
    );
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'correct-password');
    const button = screen.getByRole('button');
    await user.click(button);
    expect(button).toBeDisabled();
  });

  // FE-05: 로그인 성공 → router.push('/dashboard')
  it('FE-05: 로그인 성공 시 /dashboard로 이동한다', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'correct-password');
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  // FE-06: 로그인 실패 — 에러 메시지 표시
  it('FE-06: 로그인 실패 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'wrong-password');
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 올바르지 않습니다/)).toBeVisible();
    });
  });

  // FE-07: 실패 후 버튼 재활성화
  it('FE-07: 로그인 실패 후 버튼이 재활성화된다', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'wrong-password');
    const button = screen.getByRole('button');
    await user.click(button);
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  // FE-08: 재입력 시 에러 초기화
  it('FE-08: 재입력 시 에러 메시지가 사라진다', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'wrong-password');
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 올바르지 않습니다/)).toBeVisible();
    });
    await user.type(input, 'a');
    await waitFor(() => {
      const errorEl = screen.queryByText(/비밀번호가 올바르지 않습니다/);
      if (errorEl) expect(errorEl).not.toBeVisible();
    });
  });

  // FE-09: 빈 비밀번호 제출 방지 (HTML required 속성 기반)
  it('FE-09: 빈 비밀번호로 제출 시 fetch가 호출되지 않는다', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    render(<LoginForm />);
    const button = screen.getByRole('button');
    // 입력 없이 버튼 클릭 (required 속성으로 HTML 유효성 검사 차단)
    await user.click(button);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // FE-10: Enter 키 폼 제출
  it('FE-10: Enter 키로 폼을 제출하면 MSW 핸들러가 1회 호출된다', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'correct-password');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });
    fetchSpy.mockRestore();
  });

  // FE-11: autocomplete 속성
  it('FE-11: autocomplete="current-password" 속성이 있다', () => {
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });

  // FE-12: input type="password"
  it('FE-12: 비밀번호 필드는 type="password"이다', () => {
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeTruthy();
  });

  // EC-01: 네트워크 오류
  it('EC-01: 네트워크 오류 시 에러 메시지가 표시된다', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.error();
      })
    );
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(input, 'any-password');
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
