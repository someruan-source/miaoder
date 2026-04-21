import Link from 'next/link'

const quickLinks = [
  {
    title: '去发现',
    desc: '看看附近有哪些可爱的宠物，开始认识新朋友。',
    href: '/discover',
    badge: 'Discover',
  },
  {
    title: '宠物帮帮帮',
    desc: '浏览铲屎官的经验分享、提问和互助内容。',
    href: '/community',
    badge: 'Community',
  },
  {
    title: '新增宠物',
    desc: '给你的毛孩子建立资料，方便展示和配对。',
    href: '/pets/new',
    badge: 'Create',
  },
  {
    title: '我的主页',
    desc: '查看你的主人资料和已经添加的宠物。',
    href: '/me',
    badge: 'Profile',
  },
  {
    title: '我的配对',
    desc: '查看已经互相喜欢成功的宠物配对记录。',
    href: '/matches',
    badge: 'Matches',
  },
  {
    title: '消息中心',
    desc: '查看聊天列表、系统通知和后续互动消息。',
    href: '/messages',
    badge: 'Inbox',
  },
]

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="page-wrap">
        <section className="card-base overflow-hidden p-6">
          <div className="rounded-[24px] bg-gradient-to-br from-stone-100 via-white to-orange-50 p-6">
            <p className="page-kicker">miaoder</p>

            <h1 className="mt-3 text-5xl font-black tracking-tight text-neutral-900">
              让宠物先交朋友，
              <br />
              也让铲屎官找到同类。
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600">
              一个面向宠物社交、经验分享和线下结识的轻量网站。
              现在你已经拥有真实宠物资料、图片上传、社区发帖、发现配对和聊天消息这些完整能力。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/discover" className="btn-primary">
                立即开始
              </Link>
              <Link href="/matches" className="btn-secondary">
                查看我的配对
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="pill-soft">真实宠物资料</span>
              <span className="pill-soft">图片上传</span>
              <span className="pill-soft">社区发帖</span>
              <span className="pill-soft">配对聊天</span>
            </div>
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Navigation</div>
              <h2 className="section-title">快速入口</h2>
              <p className="section-desc">
                从这里进入你最常用的功能页面。
              </p>
            </div>

            <div className="section-meta">
              <span className="pill-soft">{quickLinks.length} 个入口</span>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 grid grid-cols-1 gap-4">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card-soft block p-5 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="section-head">
                  <div className="section-head-main">
                    <div className="section-kicker">{item.badge}</div>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-neutral-600">
                      {item.desc}
                    </p>
                  </div>

                  <div className="section-meta">
                    <span className="pill">进入</span>
                  </div>
                </div>

                <div className="section-head-divider" />

                <div className="mt-4 text-sm font-medium text-neutral-800">
                  进入 →
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}