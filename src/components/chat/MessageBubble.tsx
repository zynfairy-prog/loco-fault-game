import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  message: ChatMessage
  roleColor?: string
}

export function MessageBubble({ message, roleColor = 'var(--accent-cyan)' }: MessageBubbleProps) {
  const time = message.timestamp instanceof Date
    ? message.timestamp.toTimeString().slice(0, 8)
    : new Date(message.timestamp).toTimeString().slice(0, 8)

  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span
          className="text-xs italic px-3 py-1 rounded-full border"
          style={{
            color: 'var(--text-tertiary)',
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          {message.content}
        </span>
      </div>
    )
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col gap-1 mb-3', isUser ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-1.5">
        {!isUser && (
          <span className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>
            {message.sender ?? 'AI'}
          </span>
        )}
        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {time}
        </span>
        {isUser && (
          <span className="text-xs font-mono" style={{ color: roleColor }}>
            {message.sender ?? '我'}
          </span>
        )}
      </div>
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 rounded text-sm leading-relaxed',
          isUser ? 'rounded-tr-none' : 'rounded-tl-none'
        )}
        style={{
          background: isUser ? 'var(--bg-surface)' : 'var(--bg-elevated)',
          borderLeft: isUser ? 'none' : `2px solid var(--accent-cyan)`,
          borderRight: isUser ? `2px solid ${roleColor}` : 'none',
          color: 'var(--text-primary)',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}
