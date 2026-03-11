import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt, comparePassword } from '@/lib/auth';
import { updateStock, deleteStock } from '@/lib/stocks';
import { supabaseAdmin } from '@/lib/supabase';
import { WriteRequest, DeleteRequest, StockInput } from '@/types';

if (!process.env.AUTH_PASSWORD_HASH) {
  throw new Error('AUTH_PASSWORD_HASH is not set');
}
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;

type RouteContext = { params: { id: string } };

export async function PUT(
  request: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // JWT 검증
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '요청 바디를 파싱할 수 없습니다' },
        { status: 400 }
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('password' in body) ||
      typeof (body as Record<string, unknown>).password !== 'string' ||
      (body as Record<string, unknown>).password === '' ||
      !('data' in body) ||
      typeof (body as Record<string, unknown>).data !== 'object' ||
      (body as Record<string, unknown>).data === null
    ) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    const { password, data } = body as WriteRequest<Record<string, unknown>>;

    // bcrypt 비밀번호 검증
    const isValid = await comparePassword(password, AUTH_PASSWORD_HASH);
    if (!isValid) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }

    // id, created_at, updated_at 제거
    const { id: _id, created_at: _ca, updated_at: _ua, ...updateData } = data as Record<string, unknown>;

    const partialInput: Partial<StockInput> = {};
    if (typeof updateData.ticker === 'string') partialInput.ticker = updateData.ticker;
    if (typeof updateData.name === 'string') partialInput.name = updateData.name;
    if (typeof updateData.market === 'string') partialInput.market = updateData.market;
    if (typeof updateData.country === 'string') partialInput.country = updateData.country;
    if (typeof updateData.currency === 'string') partialInput.currency = updateData.currency;
    if (typeof updateData.sector === 'string') partialInput.sector = updateData.sector;
    if (typeof updateData.memo === 'string') partialInput.memo = updateData.memo;

    const updated = await updateStock(params.id, partialInput);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    // NOT_FOUND
    const withCode = err as Error & { code?: string };
    if (withCode.code === 'NOT_FOUND' || withCode.message === 'Stock not found') {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '해당 주식상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    // PostgreSQL UNIQUE 위반 (23505)
    if (withCode.code === '23505') {
      return NextResponse.json(
        { error: 'DUPLICATE_TICKER', message: '이미 등록된 티커입니다' },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message.toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: 'DUPLICATE_TICKER', message: '이미 등록된 티커입니다' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // JWT 검증
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }
    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: '요청 바디를 파싱할 수 없습니다' },
        { status: 400 }
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('password' in body) ||
      typeof (body as Record<string, unknown>).password !== 'string' ||
      (body as Record<string, unknown>).password === ''
    ) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'password 필드가 필요합니다' },
        { status: 400 }
      );
    }

    const { password } = body as DeleteRequest;

    // bcrypt 비밀번호 검증
    const isValid = await comparePassword(password, AUTH_PASSWORD_HASH);
    if (!isValid) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }

    // 연결된 거래내역 존재 여부 확인
    const { data: linkedTx, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('stock_id', params.id)
      .limit(1);

    if (txError) {
      console.error('[stocks DELETE] transactions check error', txError.message);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (linkedTx && linkedTx.length > 0) {
      return NextResponse.json(
        {
          error: 'LINKED_TRANSACTIONS',
          message: '연결된 거래내역이 있어 삭제할 수 없습니다',
        },
        { status: 409 }
      );
    }

    // 대상 주식 존재 여부 확인 후 삭제
    const { data: existing, error: existError } = await supabaseAdmin
      .from('stocks')
      .select('id')
      .eq('id', params.id)
      .single();

    if (existError || !existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '해당 주식상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await deleteStock(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
