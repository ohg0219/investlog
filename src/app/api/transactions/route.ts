import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyJwt, comparePassword } from '@/lib/auth';
import { getTransactions, createTransaction } from '@/lib/transactions';
import { supabaseAdmin } from '@/lib/supabase';
import { WriteRequest, TransactionInput } from '@/types';

if (!process.env.AUTH_PASSWORD_HASH) {
  throw new Error('AUTH_PASSWORD_HASH is not set');
}
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;

// UUID v4 정규식
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// YYYY-MM-DD 정규식
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_TYPES = ['BUY', 'SELL', 'DIVIDEND'] as const;

export async function GET(request: Request): Promise<NextResponse> {
  try {
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

    const { searchParams } = new URL(request.url);
    const stockIdParam = searchParams.get('stock_id');

    // stock_id 파라미터가 제공된 경우 UUID 형식 검증
    if (stockIdParam !== null && !UUID_REGEX.test(stockIdParam)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'stock_id는 유효한 UUID여야 합니다' },
        { status: 400 }
      );
    }

    const stockId = stockIdParam ?? undefined;
    const transactions = await getTransactions(stockId);
    return NextResponse.json({ data: transactions }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
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

    // 필드 검증: stock_id (필수, UUID)
    if (
      typeof data.stock_id !== 'string' ||
      !UUID_REGEX.test(data.stock_id)
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'stock_id는 유효한 UUID여야 합니다' },
        { status: 400 }
      );
    }

    // 필드 검증: type (BUY|SELL|DIVIDEND)
    if (
      typeof data.type !== 'string' ||
      !VALID_TYPES.includes(data.type as (typeof VALID_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'type은 BUY, SELL, DIVIDEND 중 하나여야 합니다' },
        { status: 400 }
      );
    }

    // 필드 검증: date (YYYY-MM-DD)
    if (
      typeof data.date !== 'string' ||
      !DATE_REGEX.test(data.date)
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'date는 YYYY-MM-DD 형식이어야 합니다' },
        { status: 400 }
      );
    }

    // 필드 검증: amount (양수)
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      return NextResponse.json(
        { error: 'INVALID_AMOUNT', message: 'amount는 양수여야 합니다' },
        { status: 400 }
      );
    }

    // BUY/SELL: quantity, price 필수
    const txType = data.type as 'BUY' | 'SELL' | 'DIVIDEND';
    if (txType === 'BUY' || txType === 'SELL') {
      if (
        data.quantity === undefined ||
        data.quantity === null ||
        typeof data.quantity !== 'number'
      ) {
        return NextResponse.json(
          { error: 'MISSING_QUANTITY_PRICE', message: 'BUY/SELL 거래에는 quantity가 필요합니다' },
          { status: 400 }
        );
      }
      if (data.quantity <= 0) {
        return NextResponse.json(
          { error: 'INVALID_AMOUNT', message: 'quantity는 양수여야 합니다' },
          { status: 400 }
        );
      }
      if (
        data.price === undefined ||
        data.price === null ||
        typeof data.price !== 'number'
      ) {
        return NextResponse.json(
          { error: 'MISSING_QUANTITY_PRICE', message: 'BUY/SELL 거래에는 price가 필요합니다' },
          { status: 400 }
        );
      }
      if (data.price <= 0) {
        return NextResponse.json(
          { error: 'INVALID_AMOUNT', message: 'price는 양수여야 합니다' },
          { status: 400 }
        );
      }
    }

    // bcrypt 비밀번호 검증
    const isValid = await comparePassword(password, AUTH_PASSWORD_HASH);
    if (!isValid) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '비밀번호가 올바르지 않습니다' },
        { status: 403 }
      );
    }

    // stocks 존재 확인
    const { data: stockRow, error: stockError } = await supabaseAdmin
      .from('stocks')
      .select('id')
      .eq('id', data.stock_id)
      .single();

    if (stockError || !stockRow) {
      return NextResponse.json(
        { error: 'STOCK_NOT_FOUND', message: '해당 주식상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const txInput: TransactionInput = {
      stock_id: data.stock_id as string,
      type: txType,
      date: data.date as string,
      amount: data.amount as number,
      quantity: typeof data.quantity === 'number' ? data.quantity : undefined,
      price: typeof data.price === 'number' ? data.price : undefined,
      memo: typeof data.memo === 'string' ? data.memo : undefined,
    };

    const created = await createTransaction(txInput);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
