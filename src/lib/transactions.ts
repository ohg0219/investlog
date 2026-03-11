import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { Transaction, TransactionInput, TransactionWithStock } from '@/types';

export async function getTransactions(
  stockId?: string
): Promise<TransactionWithStock[]> {
  let query = supabaseAdmin
    .from('transactions')
    .select('*, stock:stocks(ticker, name, currency)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (stockId) {
    query = query.eq('stock_id', stockId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[transactions.getTransactions]', error.message);
    throw new Error('Failed to fetch transactions');
  }

  return (data ?? []) as TransactionWithStock[];
}

export async function createTransaction(
  input: TransactionInput
): Promise<Transaction> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      stock_id: input.stock_id,
      type: input.type,
      date: input.date,
      quantity: input.quantity ?? null,
      price: input.price ?? null,
      amount: input.amount,
      memo: input.memo ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[transactions.createTransaction]', error.message);
    throw error;
  }

  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<Transaction> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update({
      stock_id: input.stock_id,
      type: input.type,
      date: input.date,
      quantity: input.quantity ?? null,
      price: input.price ?? null,
      amount: input.amount,
      memo: input.memo ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[transactions.updateTransaction]', error.message);
    throw error;
  }

  if (!data) {
    const notFound = new Error('Transaction not found');
    (notFound as Error & { code: string }).code = 'NOT_FOUND';
    throw notFound;
  }

  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[transactions.deleteTransaction]', error.message);
    throw error;
  }
}

export async function getTransactionsByStockId(
  stockId: string
): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('stock_id', stockId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[transactions.getTransactionsByStockId]', error.message);
    throw new Error('Failed to fetch transactions by stock');
  }

  return (data ?? []) as Transaction[];
}
