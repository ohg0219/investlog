import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('stocks').select('id').limit(1);
  if (error) {
    console.error('Supabase ping error:', error.message);
    return Response.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return Response.json({ ok: true, pinged_at: new Date().toISOString() });
}
