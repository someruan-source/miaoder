import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PostCardProps {
  id: string
  title: string
  content: string
  category: string
  city?: string | null
  authorName?: string | null
}

export function PostCard({ id, title, content, category, city, authorName }: PostCardProps) {
  return (
    <Link href={`/community/${id}`}>
      <Card className="rounded-3xl transition hover:shadow-sm">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{category}</Badge>
            {city ? <Badge variant="outline">{city}</Badge> : null}
          </div>
          <CardTitle className="line-clamp-1 text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">{content}</p>
          {authorName ? <p className="text-xs text-muted-foreground">by {authorName}</p> : null}
        </CardContent>
      </Card>
    </Link>
  )
}
