'use client'

import { useMemo, useState, useTransition } from 'react'
import { Heart, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { swipeAction } from '@/lib/actions/swipes'

interface DiscoverPet {
  id: string
  name: string
  type: string
  age_months: number | null
  city: string | null
  district: string | null
  intro: string | null
  neutered: boolean
  vaccinated: boolean
  meetup_ready: boolean
  cover: string | null
  tags: string[]
}

function formatAge(ageMonths: number | null) {
  if (ageMonths == null) return '年龄未填写'
  if (ageMonths < 12) return `${ageMonths}个月`
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  return months === 0 ? `${years}岁` : `${years}岁${months}个月`
}

export function DiscoverClient({ pets, fromPetId }: { pets: DiscoverPet[]; fromPetId: string | null }) {
  const [index, setIndex] = useState(0)
  const [toast, setToast] = useState('')
  const [isPending, startTransition] = useTransition()

  const currentPet = useMemo(() => pets[index] ?? null, [pets, index])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }

  function handleAction(action: 'like' | 'skip') {
    if (!currentPet) return
    if (!fromPetId) {
      showToast('请先完成宠物建档')
      return
    }

    startTransition(async () => {
      const result = await swipeAction({
        from_pet_id: fromPetId,
        to_pet_id: currentPet.id,
        action,
      })

      if (!result.ok) {
        showToast(result.formError ?? '操作失败，请稍后再试')
        return
      }

      if (result.matched) {
        showToast(`已和 ${currentPet.name} 配对成功，快去打招呼吧`)
      } else {
        showToast(action === 'like' ? `已喜欢 ${currentPet.name}` : `已跳过 ${currentPet.name}`)
      }

      setIndex((prev) => prev + 1)
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">宠物配对</h1>
          <p className="text-sm text-muted-foreground">为你的毛孩子寻找合适玩伴</p>
        </div>
        <Button variant="outline" size="icon" aria-label="筛选条件">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </section>

      {currentPet ? (
        <Card className="overflow-hidden rounded-[32px] border shadow-sm">
          {currentPet.cover ? (
            <img src={currentPet.cover} alt={currentPet.name} className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="aspect-[4/5] w-full bg-muted" />
          )}

          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{currentPet.name}</h2>
                <p className="text-sm text-muted-foreground">{formatAge(currentPet.age_months)}</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[currentPet.city, currentPet.district].filter(Boolean).join(' · ') || '位置未填写'}
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              {currentPet.intro || '这位毛孩子还没有填写简介。'}
            </p>

            <div className="flex flex-wrap gap-2">
              {currentPet.neutered ? <Badge variant="secondary">已绝育</Badge> : null}
              {currentPet.vaccinated ? <Badge variant="secondary">已接种</Badge> : null}
              {currentPet.meetup_ready ? <Badge variant="secondary">可线下见面</Badge> : null}
              {currentPet.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-[32px] border p-8 text-center">
          <h2 className="text-xl font-semibold">今天已经看完啦</h2>
          <p className="mt-2 text-sm text-muted-foreground">先去宠物帮帮帮逛逛，或者稍后再回来看看新的毛孩子。</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 rounded-2xl"
          onClick={() => handleAction('skip')}
          disabled={!currentPet || isPending}
        >
          <X className="mr-2 h-5 w-5" /> 跳过
        </Button>
        <Button
          size="lg"
          className="h-14 rounded-2xl"
          onClick={() => handleAction('like')}
          disabled={!currentPet || isPending}
        >
          <Heart className="mr-2 h-5 w-5" /> {isPending ? '处理中...' : '喜欢'}
        </Button>
      </section>

      {toast ? (
        <div className="fixed left-1/2 top-6 -translate-x-1/2 rounded-full border bg-background px-4 py-2 text-sm shadow-sm">
          {toast}
        </div>
      ) : null}
    </main>
  )
}
