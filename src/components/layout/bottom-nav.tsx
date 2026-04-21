'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, MessageCircle, User, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: '首页', icon: Home },
  { href: '/discover', label: '配对', icon: Heart },
  { href: '/community', label: '帮帮帮', icon: NotebookPen },
  { href: '/matches', label: '消息', icon: MessageCircle },
  { href: '/me', label: '我的', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs transition',
                active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
