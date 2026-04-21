# miaoder 本地文件包

这是根据当前讨论整理出的 miaoder MVP 本地代码与 SQL 文件包。

## 建议使用方式
1. 用 `create-next-app` 创建一个 Next.js App Router 项目
2. 把 `src/` 和 `supabase/` 目录里的文件复制进去
3. 安装依赖：
   - `@supabase/supabase-js`
   - `@supabase/ssr`
   - `zod`
   - `lucide-react`
   - `shadcn/ui` 相关组件
4. 在 Supabase SQL Editor 里先执行：
   - `supabase/schema.sql`
   - `supabase/policies.sql`
5. 配置 `.env.local`

## 依赖建议
```bash
pnpm add @supabase/supabase-js @supabase/ssr zod lucide-react
```

## 环境变量
复制 `.env.example` 为 `.env.local` 后填写：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 注意
- 这是一套可启动的 MVP scaffold，不是完整商业级项目。
- UI 依赖于 shadcn/ui 的 Button、Input、Textarea、Card、Badge 等组件。
- `src/proxy.ts` 使用的是 Next.js 新的 `proxy` 约定。
