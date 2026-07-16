import DashboardHeader from '@/components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  )
}
