const API_BASE = import.meta.env.VITE_COZE_API_BASE || 'https://api.coze.cn'
const TOKEN = import.meta.env.VITE_COZE_API_TOKEN as string | undefined
const BOT_ID = import.meta.env.VITE_COZE_BOT_ID as string | undefined

if (!TOKEN || TOKEN === 'pat_your_token_here') {
  console.warn('⚠️ 未配置扣子 API Token，对话功能将使用 mock 模式。请编辑 .env 文件填入 VITE_COZE_API_TOKEN')
}
if (!BOT_ID || BOT_ID === 'your_bot_id_here') {
  console.warn('⚠️ 未配置 Bot ID，对话功能将使用 mock 模式。请编辑 .env 文件填入 VITE_COZE_BOT_ID')
}

export function isConfigured(): boolean {
  return (
    !!TOKEN &&
    TOKEN !== 'pat_your_token_here' &&
    !!BOT_ID &&
    BOT_ID !== 'your_bot_id_here'
  )
}

export interface StreamOptions {
  conversationId?: string
  userId?: string
  /** FACTS block to inject as a system message before the user message */
  factsBlock?: string
  onChunk: (accumulatedText: string) => void
  onDone: (fullText: string) => void
  onError: (err: Error) => void
  onConversationId?: (id: string) => void
}

// Mock fallback responses when API is not configured
const MOCK_REPLIES = [
  '收到，正在分析故障代码。建议立即降速至60km/h，同时通知副司机检查机械室。\n\n**当前处置步骤：**\n1. 降速至60km/h\n2. 通知副司机检查CI1变流柜\n3. 联系调度报告情况',
  '根据微机显示，故障定位在**1号变流柜**。请副司机确认变流柜状态指示灯颜色。\n\n> 注意：切除故障单元前需确认制动系统正常',
  '已联系调度，获准在前方站停车检查。预计**5分钟**后到达，请做好停车准备。\n\n救援车辆已待命，无需担心。',
  '故障已隔离，切除1号牵引单元后，列车可以**限速45km/h**继续运行。请确认制动系统正常后方可起车。',
]
let mockIdx = 0

export async function streamMessage(message: string, options: StreamOptions): Promise<void> {
  if (!isConfigured()) {
    // Mock mode: simulate streaming with a delay
    await new Promise((r) => setTimeout(r, 600))
    const reply = MOCK_REPLIES[mockIdx % MOCK_REPLIES.length]
    mockIdx++
    // Simulate character-by-character streaming
    let accumulated = ''
    for (let i = 0; i < reply.length; i++) {
      accumulated += reply[i]
      options.onChunk(accumulated)
      await new Promise((r) => setTimeout(r, 18))
    }
    options.onDone(reply)
    return
  }

  try {
    const response = await fetch(`${API_BASE}/v3/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: BOT_ID,
        user_id: options.userId ?? `user_${Date.now()}`,
        stream: true,
        auto_save_history: true,
        ...(options.conversationId ? { conversation_id: options.conversationId } : {}),
        additional_messages: [
          {
            role: 'user',
            content: options.factsBlock ? `${options.factsBlock}\n\n${message}` : message,
            content_type: 'text',
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API 错误 ${response.status}: ${errText}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let currentEvent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Track the current event type
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
          continue
        }

        if (!trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        // Extract conversation_id from any event that carries it
        try {
          const anyParsed = JSON.parse(data)
          if (anyParsed.conversation_id && options.onConversationId) {
            options.onConversationId(anyParsed.conversation_id)
          }
        } catch {
          // ignore parse errors for this pre-check
        }

        // Only process delta events for content accumulation
        // completed events are full-text duplicates — use them only to trigger onDone
        if (currentEvent === 'conversation.message.completed') {
          // Ignore content; onDone is called after the stream ends
          continue
        }

        if (currentEvent !== 'conversation.message.delta') continue

        try {
          const parsed = JSON.parse(data)

          if (parsed.role !== 'assistant' || parsed.type !== 'answer') continue

          const chunk: string = parsed.content ?? ''
          if (!chunk) continue

          // Coze sends incremental fragments (1-3 chars each) — accumulate
          console.log('delta event | chunk:', JSON.stringify(chunk), '| total so far:', fullText.length + chunk.length)
          fullText += chunk
          options.onChunk(fullText)
        } catch {
          // Malformed JSON — skip
        }
      }
    }

    options.onDone(fullText)
  } catch (err) {
    options.onError(err instanceof Error ? err : new Error(String(err)))
  }
}
