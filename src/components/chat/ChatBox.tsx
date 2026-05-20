import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isConfigured } from '@/lib/coze-api'
import { speechManager } from '@/lib/speech'
import { stripSignalsForDisplay } from '@/lib/strip-signals-for-display'
import { useDashboardStore } from '@/stores/dashboardStore'
import { ChatInput } from './ChatInput'
import type { Message } from '@/hooks/useCozeChat'

interface ChatBoxProps {
  messages: Message[]
  isLoading: boolean
  streamingText: string
  onSend: (text: string) => void
  title?: string
  accentColor?: string
  className?: string
}

export function ChatBox({
  messages,
  isLoading,
  streamingText,
  onSend,
  title = 'AI 故障导演',
  accentColor = 'var(--accent-cyan)',
  className,
}: ChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const configured = isConfigured()
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const lastSpokenIdRef = useRef<string | null>(null)
  const isGameOver = useDashboardStore((s) => s.scoreReport !== null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streamingText])

  // Auto-speak when a new AI message arrives
  useEffect(() => {
    if (!voiceEnabled) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'ai') return
    if (lastMsg.id === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = lastMsg.id
    speechManager.speak(lastMsg.content)
  }, [messages, voiceEnabled])

  const handleVoiceToggle = () => {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    speechManager.setEnabled(next)
  }

  const handleSend = (text: string) => {
    speechManager.stop()
    onSend(text)
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
        />
        <span className="text-xs font-mono tracking-wider truncate" style={{ color: accentColor }}>
          {title}
        </span>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {isLoading && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              AI 思考中
              <span className="animate-[blink_1s_step-end_infinite]">...</span>
            </span>
          )}
          {!configured && (
            <span className="text-xs font-mono" style={{ color: 'var(--warn-yellow)' }}>
              mock 模式
            </span>
          )}
          {/* Voice toggle */}
          <button
            onClick={handleVoiceToggle}
            className="p-1 rounded transition-colors"
            style={{ color: voiceEnabled ? accentColor : 'var(--text-tertiary)' }}
            title={voiceEnabled ? '关闭语音' : '开启语音'}
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* Not configured banner */}
      {!configured && (
        <div
          className="flex-shrink-0 px-3 py-2 text-xs font-mono border-b"
          style={{
            background: 'rgba(255,184,0,0.08)',
            borderColor: 'rgba(255,184,0,0.2)',
            color: 'var(--warn-yellow)',
          }}
        >
          ⚠ 未配置 API — 复制 <code>.env.example</code> 为 <code>.env</code> 并填入凭证后重启
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && !isLoading && (
          <div
            className="flex items-center justify-center h-full text-xs font-mono"
            style={{ color: 'var(--text-tertiary)' }}
          >
            等待对话开始...
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} accentColor={accentColor} />
        ))}

        {/* Streaming bubble */}
        {isLoading && (
          <div className="flex flex-col items-start gap-1">
            <span className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>
              AI 故障导演
            </span>
            <div
              className="max-w-[90%] px-3 py-2 rounded rounded-tl-none text-sm leading-relaxed"
              style={{
                background: 'var(--bg-elevated)',
                borderLeft: '2px solid var(--accent-cyan)',
                color: 'var(--text-primary)',
              }}
            >
              {streamingText ? (
                <MarkdownContent content={streamingText} />
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  <span className="animate-[pulse-led_1.5s_ease-in-out_infinite]">●</span>
                  <span className="animate-[pulse-led_1.5s_ease-in-out_infinite] [animation-delay:0.3s]"> ●</span>
                  <span className="animate-[pulse-led_1.5s_ease-in-out_infinite] [animation-delay:0.6s]"> ●</span>
                </span>
              )}
              {streamingText && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-[blink_1s_step-end_infinite]"
                  style={{ background: 'var(--accent-cyan)' }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading || isGameOver}
        placeholder={isGameOver ? '本局已结束，请点击"重玩"重新挑战' : undefined}
        accentColor={accentColor}
      />
    </div>
  )
}

function MessageItem({ message, accentColor }: { message: Message; accentColor: string }) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toTimeString().slice(0, 8)

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-1.5">
        {!isUser && (
          <span className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>
            AI 故障导演
          </span>
        )}
        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {time}
        </span>
        {isUser && (
          <span className="text-xs font-mono" style={{ color: accentColor }}>
            我
          </span>
        )}
        {/* Replay button for AI messages */}
        {!isUser && (
          <button
            onClick={() => speechManager.speak(message.content)}
            className="p-0.5 rounded transition-opacity opacity-40 hover:opacity-100"
            style={{ color: 'var(--accent-cyan)' }}
            title="重听"
          >
            <Volume2 size={12} />
          </button>
        )}
      </div>
      <div
        className={cn(
          'max-w-[90%] px-3 py-2 rounded text-sm leading-relaxed',
          isUser ? 'rounded-tr-none' : 'rounded-tl-none'
        )}
        style={{
          background: isUser ? 'var(--bg-surface)' : 'var(--bg-elevated)',
          borderLeft: isUser ? 'none' : '2px solid var(--accent-cyan)',
          borderRight: isUser ? `2px solid ${accentColor}` : 'none',
          color: 'var(--text-primary)',
        }}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const clean = stripSignalsForDisplay(content)
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{children}</strong>
        ),
        em: ({ children }) => <em style={{ color: 'var(--warn-yellow)' }}>{children}</em>,
        code: ({ children }) => (
          <code
            className="font-mono px-1 rounded text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--accent-cyan)' }}
          >
            {children}
          </code>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
        li: ({ children }) => <li style={{ color: 'var(--text-primary)' }}>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote
            className="border-l-2 pl-2 my-1 italic"
            style={{ borderColor: 'var(--warn-yellow)', color: 'var(--text-secondary)' }}
          >
            {children}
          </blockquote>
        ),
        h1: ({ children }) => (
          <h1 className="font-semibold text-base mb-1" style={{ color: 'var(--accent-cyan)' }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--accent-cyan)' }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{children}</h3>
        ),
        img: ({ alt }) => <span style={{ color: 'var(--text-secondary)' }}>{alt}</span>,
      }}
    >
      {clean}
    </ReactMarkdown>
  )
}
