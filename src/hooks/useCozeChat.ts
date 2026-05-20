import { useState, useCallback, useRef } from 'react'
import { streamMessage } from '@/lib/coze-api'
import { parseSignals } from '@/lib/signal-parser'
import { serializeFacts } from '@/lib/facts'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { ChatMessage, ScoreReportV2, PlayerActionLog } from '@/types/game-state'

/**
 * Try to extract a ScoreReportV2 from Bot free-text output.
 * Bot outputs a JSON block (no <<SCORE>> signal) after 【处置完毕】.
 * Handles field name variants: score_total/total, investigation_score/investigation, etc.
 */
function extractScoreFromText(text: string): ScoreReportV2 | null {
  // Match the first {...} block that contains "verdict"
  const jsonMatch = text.match(/\{[\s\S]*?"verdict"[\s\S]*?\}(?:\s*\])?/)
  if (!jsonMatch) return null
  // Find the outermost { } that contains verdict
  let braceDepth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (braceDepth === 0) start = i
      braceDepth++
    } else if (text[i] === '}') {
      braceDepth--
      if (braceDepth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1)
        if (candidate.includes('"verdict"')) {
          try {
            const raw = JSON.parse(candidate)
            return mapRawToScoreReport(raw)
          } catch { /* try next */ }
        }
        start = -1
      }
    }
  }
  return null
}

function mapRawToScoreReport(raw: Record<string, unknown>): ScoreReportV2 | null {
  const verdict = raw['verdict'] as string | undefined
  if (!verdict) return null

  const parseScore = (v: unknown): number | 'N/A' => {
    if (v === 'N/A' || v === null || v === undefined) return 'N/A'
    const n = typeof v === 'number' ? v : parseInt(String(v), 10)
    return isNaN(n) ? 'N/A' : n
  }

  // Field name variants: investigation_score / investigation, etc.
  const get = (keys: string[]): unknown => {
    for (const k of keys) if (raw[k] !== undefined) return raw[k]
    return undefined
  }

  const total = (() => {
    const v = get(['score_total', 'total'])
    if (typeof v === 'number') return v
    const n = parseInt(String(v ?? '0'), 10)
    return isNaN(n) ? 0 : n
  })()

  let playerActionsLog: PlayerActionLog[] | undefined
  const rawLog = get(['player_actions_log', 'actions_log', 'action_log'])
  if (Array.isArray(rawLog)) {
    playerActionsLog = (rawLog as Record<string, unknown>[]).map((entry) => ({
      time: String(entry['time'] ?? entry['phase'] ?? ''),
      action: String(entry['action'] ?? entry['操作'] ?? ''),
      result: String(entry['result'] ?? entry['结果'] ?? ''),
    }))
  }

  // Bot v2.6.0 nests five dimensions under raw.scores
  const scoresObj = (raw['scores'] ?? {}) as Record<string, unknown>
  const getScore = (keys: string[]): unknown => {
    // Try top-level first (legacy), then nested scores object
    for (const k of keys) if (raw[k] !== undefined) return raw[k]
    for (const k of keys) if (scoresObj[k] !== undefined) return scoresObj[k]
    return undefined
  }

  return {
    investigation: parseScore(getScore(['investigation', 'investigation_score', '调查充分度'])),
    decision:      parseScore(getScore(['decision', 'decision_score', '决策合理性'])),
    operation:     parseScore(getScore(['operation', 'operation_score', '操作准确性'])),
    communication: parseScore(getScore(['communication', 'communication_score', '调度沟通'])),
    safety:        parseScore(getScore(['safety', 'safety_score', '安全意识'])),
    total,
    verdict: verdict as ScoreReportV2['verdict'],
    mode:        raw['mode'] as string | undefined,
    human_roles: raw['human_roles'] as string | undefined,
    ai_roles:    raw['ai_roles'] as string | undefined,
    comments:    (raw['comments'] ?? raw['comment'] ?? raw['comment_path'] ?? raw['总评']) as string | undefined,
    player_actions_log: playerActionsLog,
  }
}

// Re-export so existing ChatBox import still works
export type { ChatMessage as Message }

// Stable empty array — avoids creating a new [] on every render when key is missing
const EMPTY_MESSAGES: ChatMessage[] = []

export interface UseCozeChatOptions {
  systemPrefix?: string
  userId?: string
  /** sessionStorage key for persisting conversation_id, e.g. "coze_conv_driver_F007" */
  storageKey?: string
  /** Prepended to every outgoing message (invisible to user) to anchor context */
  contextPrefix?: string
}

export function useCozeChat(options: UseCozeChatOptions = {}) {
  const storageKey = options.storageKey ?? 'coze_conv_default'

  // Messages live in the Zustand store so they survive view switches
  const messages = useDashboardStore(
    (state) => state.chatHistory[storageKey] ?? EMPTY_MESSAGES
  )
  const dispatch = useDashboardStore((state) => state.dispatch)

  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const userIdRef = useRef(
    options.userId ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  )
  const loadingRef = useRef(false)

  // Keep options in a ref so useCallback doesn't need them as deps (avoids re-render loop
  // caused by inline object literals at call sites creating new references every render)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Restore conversation_id from sessionStorage on first render
  const conversationIdRef = useRef<string | undefined>(
    sessionStorage.getItem(storageKey) ?? undefined
  )

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', storageKey, message: msg })
    },
    [dispatch, storageKey]
  )

  const send = useCallback(
    async (text: string, opts?: { silent?: boolean }) => {
      if (!text.trim() || loadingRef.current) return

      loadingRef.current = true
      setIsLoading(true)
      setStreamingText('')

      const { systemPrefix, contextPrefix } = optionsRef.current

      if (!opts?.silent) {
        const userMsg: ChatMessage = {
          id: `u_${Date.now()}`,
          role: 'user',
          content: text.trim(),
          timestamp: Date.now(),
        }
        addMessage(userMsg)
      }

      const prefixed = contextPrefix ? `${contextPrefix} ${text.trim()}` : text.trim()
      const finalText = systemPrefix ? `${systemPrefix}${prefixed}` : prefixed

      // Serialize current facts for Bot context injection (read at call time, not render time)
      const facts = useDashboardStore.getState().facts
      const factsBlock = serializeFacts(facts)

      console.log('实际发送给扣子的消息:', finalText)
      console.log('FACTS 块:', factsBlock)

      // Idempotent action types: safe to dispatch on every streaming chunk
      const IDEMPOTENT_TYPES = new Set([
        'SET_LED', 'SET_METER', 'SET_TASK', 'SET_TRAIN_STATE', 'SET_QUICK_ACTIONS',
      ])

      await streamMessage(finalText, {
        userId: userIdRef.current,
        conversationId: conversationIdRef.current,
        factsBlock,
        onConversationId: (id) => {
          if (conversationIdRef.current === id) return
          conversationIdRef.current = id
          sessionStorage.setItem(storageKey, id)
        },
        onChunk: (accumulated) => {
          const { cleanText: rawChunk, actions } = parseSignals(accumulated)
          const cleanText = rawChunk.replace(/\[FACTS\][\s\S]*?\[\/FACTS\]/g, '').trim()
          actions.filter((a) => IDEMPOTENT_TYPES.has(a.type)).forEach((action) => dispatch(action))
          setStreamingText(cleanText)
        },
        onDone: (fullText) => {
          const { cleanText: rawDone, actions } = parseSignals(fullText)
          // Strip FACTS echo block and raw score JSON block from displayed text
          const cleanText = rawDone
            .replace(/\[FACTS\][\s\S]*?\[\/FACTS\]/g, '')
            .replace(/【处置完毕[\s\S]*?】\s*\{[\s\S]*?\}[\s\S]*?(?=\n\n|\n[^{]|$)/g, '')
            .trim()

          // Dispatch non-score actions first (LED, meter, task, etc.)
          const scoreActions = actions.filter((a) => a.type === 'SHOW_SCORE_REPORT')
          const otherActions = actions.filter((a) => a.type !== 'SHOW_SCORE_REPORT')
          otherActions.forEach((action) => dispatch(action))

          const quickActionsAction = actions.find((a) => a.type === 'SET_QUICK_ACTIONS')
          const quickActions =
            quickActionsAction?.type === 'SET_QUICK_ACTIONS'
              ? quickActionsAction.actions
              : undefined

          // Detect narrative keywords to update facts (story text, not signals)
          if (cleanText.includes('主断成功合上') || cleanText.includes('主断路器合闸成功')
            || cleanText.includes('主断保持住') || cleanText.includes('主断路器保持合闸')) {
            dispatch({ type: 'UPDATE_FACT', key: 'gsResult', value: '成功' })
            dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T6_dispatch_comm' })
            dispatch({ type: 'SET_METER', meter: '电流', value: 850 })
            dispatch({ type: 'SET_LED', led: '主断分', state: 'off' })
          } else if (cleanText.includes('主断瞬间又跳') || cleanText.includes('主断路器再次跳闸')) {
            dispatch({ type: 'UPDATE_FACT', key: 'gsResult', value: '失败' })
          }
          if (cleanText.includes('允许开车') || cleanText.includes('准许开车')) {
            dispatch({ type: 'UPDATE_FACT', key: 'dispatchApproval', value: 'approved' })
            dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T7_scoring' })
          } else if (cleanText.includes('等待救援') || cleanText.includes('请求救援已受理')) {
            dispatch({ type: 'UPDATE_FACT', key: 'dispatchApproval', value: 'rescue' })
            dispatch({ type: 'UPDATE_FACT', key: 'phase', value: 'T7_scoring' })
          }

          // Dispatch score actions last — after facts are updated — so the guard in the reducer
          // can check the correct phase before accepting the score report
          scoreActions.forEach((action) => dispatch(action))

          // Fallback: if no <<SCORE>> signal, try to parse score JSON from Bot free text
          if (scoreActions.length === 0) {
            const jsonReport = extractScoreFromText(fullText)
            if (jsonReport) {
              console.log('[useCozeChat] JSON score extracted from text', jsonReport)
              dispatch({ type: 'SHOW_SCORE_REPORT', report: jsonReport })
            }
          }

          addMessage({
            id: `a_${Date.now()}`,
            role: 'ai',
            content: cleanText || '（无回复内容）',
            timestamp: Date.now(),
            quickActions,
          })
          setStreamingText('')
          setIsLoading(false)
          loadingRef.current = false
        },
        onError: (err) => {
          addMessage({
            id: `e_${Date.now()}`,
            role: 'ai',
            content: `❌ 对话出错：${err.message}\n\n请检查 \`.env\` 中的 \`VITE_COZE_API_TOKEN\` 和 \`VITE_COZE_BOT_ID\` 是否正确。`,
            timestamp: Date.now(),
          })
          setStreamingText('')
          setIsLoading(false)
          loadingRef.current = false
        },
      })
    },
    [addMessage, dispatch, storageKey]
  )

  const clear = useCallback(() => {
    setStreamingText('')
    conversationIdRef.current = undefined
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  return { messages, isLoading, streamingText, send, clear }
}
