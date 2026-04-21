import BottomNav from '@/components/bottom-nav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto min-h-screen max-w-6xl">
        <div className="relative mx-auto min-h-screen max-w-md bg-transparent">
          <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-white/40 to-transparent" />
          <div className="relative z-10 page-shell">
            <div className="page-wrap">{children}</div>
          </div>
          <BottomNav />
        </div>
      </div>
    </div>
  )
}