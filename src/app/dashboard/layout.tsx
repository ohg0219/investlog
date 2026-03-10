import NavBar from '@/components/layout/NavBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-ink">
      <NavBar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
