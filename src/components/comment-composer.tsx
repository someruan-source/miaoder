'use client'

import { useRef, useState } from 'react'

const EMOJI_GROUPS = [
  {
    title: '常用',
    items: ['😀', '😁', '😂', '🤣', '😊', '🥹', '😍', '😘', '😎', '🤔', '🙄', '😭'],
  },
  {
    title: '情绪',
    items: ['😡', '😤', '😢', '😴', '😱', '🥳', '😇', '🤯', '😬', '🤗', '🫠', '🤡'],
  },
  {
    title: '互动',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '👍', '👎', '👏', '🙏', '👀', '🎉'],
  },
  {
    title: '宠物',
    items: ['🐶', '🐱', '🐾', '🦴', '🐕', '🐈', '😺', '😸', '😹', '🐕‍🦺', '🐈‍⬛', '🧸'],
  },
]

type CommentComposerProps = {
  postId: string
  action: (formData: FormData) => void
}

export default function CommentComposer({
  postId,
  action,
}: CommentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [activeGroup, setActiveGroup] = useState(0)

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const nextValue = el.value.slice(0, start) + emoji + el.value.slice(end)

    el.value = nextValue

    const nextPos = start + emoji.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextPos, nextPos)
    })
  }

  const currentGroup = EMOJI_GROUPS[activeGroup]

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="post_id" value={postId} />

      <div className="hint-card">
        <div className="flex flex-wrap gap-2">
          {EMOJI_GROUPS.map((group, index) => (
            <button
              key={group.title}
              type="button"
              onClick={() => setActiveGroup(index)}
              className={
                index === activeGroup
                  ? 'inline-flex items-center rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white'
                  : 'inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50'
              }
            >
              {group.title}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="hint-title">{currentGroup.title}表情</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentGroup.items.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-lg transition hover:bg-neutral-50 active:scale-[0.98]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        name="content"
        rows={4}
        placeholder="写下你的评论……也可以点上面的表情"
        className="textarea-base mt-4"
      />

      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary">
          发布评论
        </button>
      </div>
    </form>
  )
}