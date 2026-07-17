import DashboardHeader from '@/components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardHeader />
      <main className="mx-auto max-w-[1560px] px-4 py-4">{children}</main>
    </div>
  )
}
