import BottomNav from '@/components/bottom-nav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-transparent">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="pet-pattern pet-paw absolute left-4 top-24 h-12 w-12 opacity-80" />
        <div className="pet-pattern pet-icon pet-cat absolute right-6 top-44 h-14 w-14 opacity-80" />
        <div className="pet-pattern pet-icon pet-dog absolute bottom-40 left-6 h-16 w-16 opacity-75" />
        <div className="pet-pattern pet-paw absolute bottom-24 right-10 h-12 w-12 opacity-70" />
      </div>
      <div className="mx-auto min-h-screen max-w-6xl">
        <div className="relative mx-auto min-h-screen max-w-md bg-transparent">
          <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-white/40 to-transparent" />
          <div className="relative z-10 page-shell">
            <div className="page-wrap space-y-3">
              <div className="pet-chip w-fit">🐾 猫咪 & 小狗友好氛围</div>
              <div>{children}</div>
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
