import Link from 'next/link'

export default function HomePage() {
  const cards = [
    {
      title: '去发现',
      desc: '看看附近有哪些可爱的宠物，开始认识新朋友。',
      href: '/discover',
    },
    {
      title: '宠物帮帮帮',
      desc: '浏览铲屎官的经验分享、提问和互助内容。',
      href: '/community',
    },
    {
      title: '新增宠物',
      desc: '给你的毛孩子建立资料，方便展示和匹配。',
      href: '/pets/new',
    },
    {
      title: '我的主页',
      desc: '查看你的主人资料和已添加的宠物。',
      href: '/me',
    },
  ]

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border p-8 shadow-sm">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-gray-500">miaoder</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              让宠物先交朋友，
              <br />
              也让铲屎官找到同类。
            </h1>
            <p className="mt-4 text-base leading-7 text-gray-600">
              一个面向宠物社交、经验分享和线下结识的轻量网站。
              你现在已经完成了登录、社区、发现、我的页面和新增宠物的基础闭环。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/discover"
                className="rounded-xl bg-black px-4 py-2 text-white"
              >
                立即开始
              </Link>
              <Link
                href="/me"
                className="rounded-xl border px-4 py-2"
              >
                查看我的主页
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {card.desc}
              </p>
              <div className="mt-4 text-sm font-medium text-gray-900">
                进入 →
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">当前已完成</h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">登录 / 邮箱验证</div>
            <div className="rounded-xl bg-gray-50 p-4">主人资料 onboarding</div>
            <div className="rounded-xl bg-gray-50 p-4">社区帖子读取</div>
            <div className="rounded-xl bg-gray-50 p-4">发现页宠物展示</div>
            <div className="rounded-xl bg-gray-50 p-4">我的主页</div>
            <div className="rounded-xl bg-gray-50 p-4">新增宠物表单</div>
          </div>
        </section>
      </div>
    </main>
  )
}