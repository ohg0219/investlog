import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth'
import { getTransactions } from '@/lib/transactions'
import { getStocks } from '@/lib/stocks'
import TransactionsClientShell from '@/components/transactions/TransactionsClientShell'

export default async function TransactionsPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) redirect('/login')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')

  const [transactions, stocks] = await Promise.all([
    getTransactions(),
    getStocks(),
  ])

  return (
    <TransactionsClientShell
      initialTransactions={transactions}
      stocks={stocks}
    />
  )
}
