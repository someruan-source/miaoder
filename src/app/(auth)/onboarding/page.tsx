'use client'

import { useActionState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { completeOnboardingAction, type OnboardingState } from './actions'

const personalityOptions = ['亲人', '慢热', '活泼', '安静', '胆小']
const activityOptions = ['散步', '室内陪玩', '追逐', '安静社交']

const initialState: OnboardingState = { ok: false }

function TagToggleGroup({
  name,
  options,
}: {
  name: 'personality_tags' | 'activity_tags'
  options: string[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => (
        <label key={tag} className="cursor-pointer">
          <input type="checkbox" name={name} value={tag} className="peer sr-only" />
          <Badge
            variant="secondary"
            className="peer-checked:bg-primary peer-checked:text-primary-foreground"
          >
            {tag}
          </Badge>
        </label>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialState
  )

  const profileErrors = useMemo(
    () => ({
      nickname: state.fieldErrors?.nickname?.[0],
      city: state.fieldErrors?.city?.[0],
      bio: state.fieldErrors?.bio?.[0],
    }),
    [state.fieldErrors]
  )

  const petErrors = useMemo(
    () => ({
      name: state.fieldErrors?.name?.[0],
      breed: state.fieldErrors?.breed?.[0],
      age_months: state.fieldErrors?.age_months?.[0],
      intro: state.fieldErrors?.intro?.[0],
    }),
    [state.fieldErrors]
  )

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <section>
        <p className="text-sm text-muted-foreground">miaoder 新手引导</p>
        <h1 className="text-3xl font-semibold">先为你和毛孩子建个档案</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          完成这一步后，你就可以开始配对、发帖和聊天了。
        </p>
      </section>

      <form action={formAction} className="space-y-6">
        <section className="rounded-3xl border p-5">
          <h2 className="text-lg font-semibold">主人信息</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">你的昵称</label>
              <Input name="nickname" placeholder="例如：小林" />
              {profileErrors.nickname ? (
                <p className="text-sm text-destructive">{profileErrors.nickname}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">所在城市</label>
              <Input name="city" placeholder="例如：杭州" />
              {profileErrors.city ? (
                <p className="text-sm text-destructive">{profileErrors.city}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">主人简介</label>
            <Textarea name="bio" placeholder="简单介绍一下你和你的养宠情况" className="min-h-24" />
            {profileErrors.bio ? (
              <p className="text-sm text-destructive">{profileErrors.bio}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border p-5">
          <h2 className="text-lg font-semibold">宠物信息</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">宠物名字</label>
              <Input name="pet_name" placeholder="例如：Momo" />
              {petErrors.name ? <p className="text-sm text-destructive">{petErrors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">宠物类型</label>
              <select name="pet_type" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="cat">猫咪</option>
                <option value="dog">狗狗</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">品种</label>
              <Input name="breed" placeholder="例如：英短 / 柯基" />
              {petErrors.breed ? <p className="text-sm text-destructive">{petErrors.breed}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">性别</label>
              <select name="gender" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="unknown">未知</option>
                <option value="male">公</option>
                <option value="female">母</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">年龄（月）</label>
              <Input name="age_months" type="number" min={0} max={600} placeholder="例如：18" />
              {petErrors.age_months ? (
                <p className="text-sm text-destructive">{petErrors.age_months}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">体型</label>
              <select name="size" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="small">
                <option value="small">小型</option>
                <option value="medium">中型</option>
                <option value="large">大型</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">所在区域</label>
              <Input name="district" placeholder="例如：西湖区" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="neutered" /> 已绝育</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="vaccinated" /> 已接种</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="friendly_to_humans" /> 亲人</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="friendly_to_pets" /> 亲其他宠物</label>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="meetup_ready" /> 适合线下见面</label>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">宠物简介</label>
            <Textarea
              name="pet_intro"
              placeholder="介绍一下你家毛孩子的性格、日常和喜欢的活动"
              className="min-h-28"
            />
            {petErrors.intro ? <p className="text-sm text-destructive">{petErrors.intro}</p> : null}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">性格标签</p>
              <div className="mt-2">
                <TagToggleGroup name="personality_tags" options={personalityOptions} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">活动偏好</p>
              <div className="mt-2">
                <TagToggleGroup name="activity_tags" options={activityOptions} />
              </div>
            </div>
          </div>
        </section>

        {state.formError ? <p className="text-sm text-destructive">{state.formError}</p> : null}

        <Button size="lg" className="h-12 rounded-2xl" disabled={isPending}>
          {isPending ? '保存中...' : '完成建档并进入 miaoder'}
        </Button>
      </form>
    </main>
  )
}
