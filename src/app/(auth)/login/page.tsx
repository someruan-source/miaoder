'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    setMessage(error ? error.message : '登录链接已发送，请检查邮箱')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <div>
        <h1 className="text-3xl font-semibold">登录 miaoder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          帮宠物找到玩伴，也帮铲屎官找到经验和互助。
        </p>
      </div>

      <Input
        type="email"
        placeholder="输入邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button onClick={handleLogin} disabled={loading || !email}>
        {loading ? '发送中...' : '邮箱验证码登录'}
      </Button>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </main>
  )
}
