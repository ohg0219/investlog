import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth'
import DashboardClientShell from '@/components/dashboard/DashboardClientShell'
import type { DashboardSummary, TransactionWithStock } from '@/types'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const fetchOptions: RequestInit = {
    cache: 'no-store',
    headers: { Cookie: `token=${token}` },
  }

  const [summaryRes, transactionsRes] = await Promise.all([
    fetch(`${baseUrl}/api/dashboard/summary`, fetchOptions).catch(() => null),
    fetch(`${baseUrl}/api/transactions`, fetchOptions).catch(() => null),
  ])

  let summaryData: DashboardSummary | null = null
  if (summaryRes && summaryRes.ok) {
    try {
      summaryData = await summaryRes.json()
    } catch {
      summaryData = null
    }
  }

  let transactionsData: TransactionWithStock[] | null = null
  if (transactionsRes && transactionsRes.ok) {
    try {
      transactionsData = await transactionsRes.json()
    } catch {
      transactionsData = null
    }
  }

  return (
    <DashboardClientShell
      summary={summaryData}
      transactions={transactionsData}
    />
  )
}
