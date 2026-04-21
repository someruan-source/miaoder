'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '首页', icon: '⌂' },
  { href: '/discover', label: '发现', icon: '♡' },
  { href: '/matches', label: '配对', icon: '✿' },
  { href: '/messages', label: '消息', icon: '✉' },
  { href: '/community', label: '帮帮帮', icon: '✦' },
  { href: '/me', label: '我的', icon: '◉' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-black/10 bg-white/85 backdrop-blur-xl">
      <div className="grid grid-cols-6 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition duration-200',
                active
                  ? 'bg-neutral-900 text-white shadow-[0_8px_20px_rgba(17,17,17,0.16)]'
                  : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900',
              ].join(' ')}
            >
              <span
                className={[
                  'leading-none transition',
                  active ? 'scale-110 text-base' : 'text-[15px]',
                ].join(' ')}
              >
                {item.icon}
              </span>

              <span
                className={[
                  'text-[11px] font-medium transition',
                  active ? 'text-white' : 'text-current',
                ].join(' ')}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}