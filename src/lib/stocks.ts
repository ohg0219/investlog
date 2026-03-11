import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { Stock, StockInput } from '@/types';

export async function getStocks(): Promise<Stock[]> {
  const { data, error } = await supabaseAdmin
    .from('stocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[stocks.getStocks]', error.message);
    throw new Error('Failed to fetch stocks');
  }

  return (data ?? []) as Stock[];
}

export async function createStock(input: StockInput): Promise<Stock> {
  const { data, error } = await supabaseAdmin
    .from('stocks')
    .insert({
      ticker: input.ticker,
      name: input.name,
      market: input.market,
      country: input.country,
      currency: input.currency,
      sector: input.sector ?? null,
      memo: input.memo ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[stocks.createStock]', error.message);
    throw error;
  }

  return data as Stock;
}

export async function updateStock(
  id: string,
  data: Partial<StockInput>
): Promise<Stock> {
  // id, created_at, updated_at은 서버에서 제외
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } =
    data as Partial<StockInput & { id?: string; created_at?: string; updated_at?: string }>;

  const { data: updated, error } = await supabaseAdmin
    .from('stocks')
    .update(rest)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[stocks.updateStock]', error.message);
    throw error;
  }

  if (!updated) {
    const notFound = new Error('Stock not found');
    (notFound as Error & { code: string }).code = 'NOT_FOUND';
    throw notFound;
  }

  return updated as Stock;
}

export async function deleteStock(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stocks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[stocks.deleteStock]', error.message);
    throw error;
  }
}
