import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth'
import { getStocks } from '@/lib/stocks'
import StocksClientShell from '@/components/stocks/StocksClientShell'

export default async function StocksPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const stocks = await getStocks()

  return <StocksClientShell stocks={stocks} />
}
