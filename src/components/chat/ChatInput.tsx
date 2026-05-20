import { useState, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  accentColor?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = '输入消息... (Enter 发送)',
  accentColor = 'var(--accent-cyan)',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  return (
    <div
      className="flex items-end gap-2 p-2 border-t"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-deep)' }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded px-3 py-2 text-sm font-mono outline-none transition-colors',
          'placeholder:text-[var(--text-tertiary)]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid var(--border-default)`,
          color: 'var(--text-primary)',
          minHeight: 36,
          maxHeight: 96,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = accentColor
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded transition-all"
        style={{
          background: disabled || !value.trim() ? 'var(--bg-surface)' : accentColor,
          color: disabled || !value.trim() ? 'var(--text-tertiary)' : 'var(--bg-deep)',
          border: `1px solid ${disabled || !value.trim() ? 'var(--border-default)' : accentColor}`,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
        }}
        aria-label="发送"
      >
        <Send size={14} />
      </button>
    </div>
  )
}
