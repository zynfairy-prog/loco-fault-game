import type { GameAction, CIUnit, HeatmapData, HeatmapPosition, GSPanelState, GSId, GSPosition, PlayerActionLog } from '@/types/game-state'
import { HEATMAP_POSITIONS, GS_IDS } from '@/types/game-state'

export interface ParseResult {
  cleanText: string
  actions: GameAction[]
  dispatches: Array<{ role: string; task: string }>
}

// 容错正则：接受 1-3 个尖括号、英文或中文冒号
const WITH_PARAMS_RE = /<{1,3}([A-Z_]+)[:：]([^<>]+)>{1,3}/g
const NO_PARAMS_RE = /<{1,3}([A-Z_]+)>{1,3}/g

export function parseSignals(rawText: string): ParseResult {
  const actions: GameAction[] = []
  const dispatches: Array<{ role: string; task: string }> = []

  // 有参数信号
  for (const match of rawText.matchAll(new RegExp(WITH_PARAMS_RE.source, 'g'))) {
    const [, type, params] = match
    if (type === 'DISPATCH') {
      const idx = params.indexOf(':')
      const idx2 = params.indexOf('：')
      const splitIdx = idx === -1 ? idx2 : idx2 === -1 ? idx : Math.min(idx, idx2)
      if (splitIdx !== -1) {
        dispatches.push({ role: params.slice(0, splitIdx).trim(), task: params.slice(splitIdx + 1).trim() })
      }
      continue
    }
    const action = signalToAction(type, params)
    if (action) actions.push(action)
    // Flush any extra actions queued by multi-action signals (e.g. INSTRUMENT)
    while (_pendingActions.length > 0) {
      actions.push(_pendingActions.shift()!)
    }
  }

  // 无参数信号（只处理已知无参数类型，避免重复触发有参数信号）
  for (const match of rawText.matchAll(new RegExp(NO_PARAMS_RE.source, 'g'))) {
    const type = match[1]
    if (type === 'TASK_DONE' || type === 'FAULT_CLEAR') {
      const action = signalToAction(type, '')
      if (action) actions.push(action)
    }
  }

  let cleanText = rawText
    .replace(new RegExp(WITH_PARAMS_RE.source, 'g'), '')
    .replace(new RegExp(NO_PARAMS_RE.source, 'g'), '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\(recall slice \d+\)/g, '')
    .replace(/\(slice \d+\)/g, '')
    .trim()

  return { cleanText, actions, dispatches }
}

function signalToAction(type: string, params: string): GameAction | null {
  // 按英文或中文冒号切分，并 trim 每段
  const parts = params.split(/[:：]/).map((p) => p.trim())

  switch (type) {
    case 'LED': {
      if (parts.length < 2) return null
      const [led, rawState] = parts
      const stateMap: Record<string, 'on' | 'off' | 'blink'> = {
        on: 'on', off: 'off', blink: 'blink',
        亮: 'on', 熄: 'off', 熄灭: 'off', 闪烁: 'blink', 闪: 'blink',
      }
      const state = stateMap[rawState.toLowerCase()] ?? stateMap[rawState]
      if (!state) return null
      return { type: 'SET_LED', led: led.trim(), state }
    }

    case 'METER': {
      if (parts.length < 2) return null
      const [meter, valueStr] = parts
      // 去掉数值中可能混入的单位字符（如 "25 kV" → "25"）
      const cleanValue = valueStr.replace(/[^\d.\-]/g, '')
      const value = parseFloat(cleanValue)
      if (isNaN(value)) return null
      return { type: 'SET_METER', meter: meter.trim(), value }
    }

    case 'FAULT_CODE': {
      if (parts.length < 2) return null
      const [code, ...descParts] = parts
      return {
        type: 'ADD_FAULT_CODE',
        faultCode: {
          code: code.trim(),
          description: descParts.join(':').trim(),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        },
      }
    }

    case 'FAULT_CLEAR':
      return { type: 'CLEAR_FAULT_CODES' }

    case 'TASK': {
      if (parts.length < 2) return null
      const progressMatch = parts[0].match(/(\d+)\s*\/\s*(\d+)/)
      if (!progressMatch) return null
      return {
        type: 'SET_TASK',
        current: Number(progressMatch[1]),
        total: Number(progressMatch[2]),
        description: parts.slice(1).join(':').trim(),
      }
    }

    case 'SCORE': {
      // New v2.5.2 format: <<SCORE:investigation:100;decision:100;operation:100;communication:100;safety:100;total:96;verdict:A;mode:1_player;human_roles:driver_main;ai_roles:driver_assist,dispatcher,coordinator;comments:"...">>
      // Legacy format: <<SCORE:18,17,16,18,16:85>>
      const normalized = params.replace(/；/g, ';').replace(/：/g, ':')

      // Detect new format by presence of 'investigation' or 'verdict' key
      if (normalized.includes('investigation') || normalized.includes('verdict')) {
        const fields: Record<string, string> = {}
        // Strip player_actions_log JSON before splitting on semicolons
        const actionsLogMatch = normalized.match(/player_actions_log:(\[[\s\S]*?\])/)
        const withoutActionsLog = actionsLogMatch
          ? normalized.replace(/;?player_actions_log:\[[\s\S]*?\]/, '')
          : normalized
        // Split on semicolons, but comments value may contain colons — handle carefully
        const commentsMatch = withoutActionsLog.match(/comments:"([^"]*)"/)
        const withoutComments = commentsMatch
          ? withoutActionsLog.replace(/;?comments:"[^"]*"/, '')
          : withoutActionsLog
        for (const seg of withoutComments.split(';').filter(Boolean)) {
          const colonIdx = seg.indexOf(':')
          if (colonIdx === -1) continue
          fields[seg.slice(0, colonIdx).trim()] = seg.slice(colonIdx + 1).trim()
        }
        if (commentsMatch) fields['comments'] = commentsMatch[1]

        let playerActionsLog: PlayerActionLog[] | undefined
        if (actionsLogMatch) {
          try {
            const parsed = JSON.parse(actionsLogMatch[1])
            if (Array.isArray(parsed)) playerActionsLog = parsed as PlayerActionLog[]
          } catch { /* ignore malformed JSON */ }
        }

        const parseScore = (v: string | undefined): number | 'N/A' => {
          if (!v || v === 'N/A') return 'N/A'
          const n = parseInt(v, 10)
          return isNaN(n) ? 'N/A' : n
        }
        const total = parseInt(fields['total'] ?? '0', 10)
        return {
          type: 'SHOW_SCORE_REPORT',
          report: {
            investigation: parseScore(fields['investigation']),
            decision: parseScore(fields['decision']),
            operation: parseScore(fields['operation']),
            communication: parseScore(fields['communication']),
            safety: parseScore(fields['safety']),
            total: isNaN(total) ? 0 : total,
            verdict: (fields['verdict'] as 'A' | 'B' | 'C' | 'D' | "D'") ?? 'A',
            mode: fields['mode'],
            human_roles: fields['human_roles'],
            ai_roles: fields['ai_roles'],
            comments: fields['comments'],
            player_actions_log: playerActionsLog,
          },
        }
      }

      // Legacy format: <<SCORE:diagnosis,procedure,decision,safety,teamwork:total>>
      if (parts.length < 2) return null
      const scores = parts[0].split(',').map((s) => parseInt(s.trim(), 10))
      if (scores.length < 5 || scores.some(isNaN)) return null
      const total = parseInt(parts[1], 10)
      return {
        type: 'SHOW_SCORE_REPORT',
        report: {
          diagnosis: scores[0],
          procedure: scores[1],
          decision: scores[2],
          safety: scores[3],
          teamwork: scores[4],
          total: isNaN(total) ? scores.reduce((a, b) => a + b, 0) : total,
        },
      }
    }

    case 'CI_PANEL': {
      // Format: <<CI_PANEL:CI1:normal:850:68;CI2:normal:845:70;CI3:fault:0:95;...>>
      // Tolerates full-width punctuation and extra whitespace
      const normalized = params
        .replace(/；/g, ';')
        .replace(/：/g, ':')
        .replace(/\s+/g, '')
      const units: CIUnit[] = []
      for (const seg of normalized.split(';').filter(Boolean)) {
        const p = seg.split(':')
        if (p.length < 4) continue
        const [id, status, currentStr, tempStr] = p
        if (!/^CI[1-6]$/.test(id)) continue
        units.push({
          id: id as CIUnit['id'],
          status: status === 'fault' ? 'fault' : 'normal',
          current: Number(currentStr) || 0,
          temperature: Number(tempStr) || 0,
        })
      }
      if (units.length === 0) return null
      if (units.length < 6) {
        console.warn('[signal-parser] CI_PANEL: only', units.length, 'units parsed')
      }
      return { type: 'SET_CI_PANEL', units }
    }

    case 'TASK_DONE':
      return { type: 'TASK_DONE' }

    case 'TRAIN_STATE': {
      const state = parts[0].trim()
      if (state !== 'idle' && state !== 'running' && state !== 'emergency_stop') return null
      return { type: 'SET_TRAIN_STATE', state }
    }

    case 'ACTIONS': {
      // 重新合并（split 可能把 JSON 内容切坏），用原始 params
      return parseActionsParam(params)
    }

    case 'HEATMAP': {
      // Format: <<HEATMAP:CI1:5;CI2:0;CI3:75;CI4:0;CI5:0;CI6:0;CABLE_TR_CI:60;CABLE_CI_MOTOR:0;TRANSFORMER:0;MOTOR_BOX:10>>
      const normalized = params.replace(/；/g, ';').replace(/：/g, ':').replace(/\s+/g, '')
      const data: Partial<HeatmapData> = {}
      for (const seg of normalized.split(';').filter(Boolean)) {
        const colonIdx = seg.indexOf(':')
        if (colonIdx === -1) continue
        const key = seg.slice(0, colonIdx) as HeatmapPosition
        const val = parseInt(seg.slice(colonIdx + 1), 10)
        if (HEATMAP_POSITIONS.includes(key) && !isNaN(val)) {
          data[key] = Math.max(0, Math.min(100, val))
        }
      }
      // Fill missing positions with 0
      const full = {} as HeatmapData
      for (const pos of HEATMAP_POSITIONS) {
        full[pos] = data[pos] ?? 0
      }
      return { type: 'SET_HEATMAP', data: full }
    }

    case 'GS_PANEL': {
      // Format: <<GS_PANEL:GS1:run;GS2:run;GS3:ground;...>>
      const normalized = params.replace(/；/g, ';').replace(/：/g, ':').replace(/\s+/g, '')
      const states: Partial<GSPanelState> = {}
      for (const seg of normalized.split(';').filter(Boolean)) {
        const colonIdx = seg.indexOf(':')
        if (colonIdx === -1) continue
        const id = seg.slice(0, colonIdx) as GSId
        const pos = seg.slice(colonIdx + 1) as GSPosition
        if (GS_IDS.includes(id) && (pos === 'run' || pos === 'disconnect' || pos === 'ground')) {
          states[id] = pos
        }
      }
      const full = {} as GSPanelState
      for (const id of GS_IDS) {
        full[id] = states[id] ?? 'run'
      }
      return { type: 'SET_GS_PANEL', states: full }
    }

    case 'INSTRUMENT': {
      // Format: <<INSTRUMENT:FIELD:VALUE>> or <<INSTRUMENT:FIELD1:VAL1;FIELD2:VAL2>>
      // Maps instrument fields to existing LED/METER actions
      const normalized = params.replace(/；/g, ';').replace(/：/g, ':').replace(/\s+/g, '')
      const actions: GameAction[] = []
      for (const seg of normalized.split(';').filter(Boolean)) {
        const colonIdx = seg.indexOf(':')
        if (colonIdx === -1) continue
        const field = seg.slice(0, colonIdx).trim()
        const value = seg.slice(colonIdx + 1).trim()
        const mapped = instrumentFieldToAction(field, value)
        if (mapped) actions.push(mapped)
      }
      // Return the first action for the single-return interface;
      // multi-action case handled by the caller through the wrapper below.
      // Store extra actions in a module-level queue flushed by parseSignals.
      if (actions.length === 0) return null
      if (actions.length === 1) return actions[0]
      // Flush extras into pending queue
      _pendingActions.push(...actions.slice(1))
      return actions[0]
    }

    case 'MFD': {
      // Format: <<MFD:fault_code:E0301;fault_name:主接地;fault_unit:CI3>>
      // or:     <<MFD:CI3_status:isolated;tractive_units:5/6>>
      const normalized = params.replace(/；/g, ';').replace(/：/g, ':')
      const fields: Record<string, string> = {}
      for (const seg of normalized.split(';').filter(Boolean)) {
        const colonIdx = seg.indexOf(':')
        if (colonIdx === -1) continue
        fields[seg.slice(0, colonIdx).trim()] = seg.slice(colonIdx + 1).trim()
      }

      // Fault code display
      if (fields['fault_code'] && fields['fault_name']) {
        const desc = fields['fault_unit']
          ? `${fields['fault_name']} (${fields['fault_unit']})`
          : fields['fault_name']
        return {
          type: 'ADD_FAULT_CODE',
          faultCode: {
            code: fields['fault_code'],
            description: desc,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          },
        }
      }

      // CI isolation status — currently stored as fault code annotation
      if (fields['CI3_status'] === 'isolated' || fields['CI_status'] === 'isolated') {
        const unit = Object.keys(fields).find((k) => k.endsWith('_status'))?.replace('_status', '') ?? 'CI'
        const tractive = fields['tractive_units'] ? `，牵引单元 ${fields['tractive_units']}` : ''
        return {
          type: 'ADD_FAULT_CODE',
          faultCode: {
            code: 'ISOLATED',
            description: `${unit} 已切除${tractive}`,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          },
        }
      }

      console.warn('[signal-parser] MFD: unrecognized fields', fields)
      return null
    }

    default:
      return null
  }
}

// Module-level queue for multi-action signals (INSTRUMENT with multiple fields)
const _pendingActions: GameAction[] = []

function instrumentFieldToAction(field: string, value: string): GameAction | null {
  switch (field) {
    case 'GROUND_LED':
      return { type: 'SET_LED', led: '接地', state: value === 'on' ? 'on' : 'off' }
    case 'MAIN_BREAKER':
      return { type: 'SET_LED', led: '主断分', state: value === 'open' ? 'on' : 'off' }
    case 'TRACTION_FORCE': {
      if (value === '0') {
        return { type: 'SET_METER', meter: '电流', value: 0 }
      }
      if (value === 'limited_5/6') {
        _pendingActions.push({ type: 'SET_METER', meter: '电流', value: 700 })
        return { type: 'SET_TRAIN_STATE', state: 'running' }
      }
      if (value === 'available') {
        _pendingActions.push({ type: 'SET_METER', meter: '电流', value: 850 })
        return { type: 'SET_TRAIN_STATE', state: 'running' }
      }
      return null
    }
    case 'CATENARY_VOLTAGE': {
      const numMatch = value.match(/(\d+(?:\.\d+)?)/)
      if (!numMatch) return null
      return { type: 'SET_METER', meter: '网压', value: parseFloat(numMatch[1]) }
    }
    default:
      console.warn('[signal-parser] INSTRUMENT: unknown field', field)
      return null
  }
}

function parseActionsParam(rawParams: string): GameAction | null {
  // 1. 直接尝试 JSON
  try {
    const parsed = JSON.parse(rawParams)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return { type: 'SET_QUICK_ACTIONS', actions: parsed }
    }
  } catch { /* fall through */ }

  // 2. 替换中文符号后再试
  const normalized = rawParams
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[，]/g, ',')
    .replace(/[【]/g, '[')
    .replace(/[】]/g, ']')
  try {
    const parsed = JSON.parse(normalized)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return { type: 'SET_QUICK_ACTIONS', actions: parsed }
    }
  } catch { /* fall through */ }

  // 3. 正则兜底：提取所有 "..." 内容
  const matches = normalized.match(/"([^"]+)"/g)
  if (matches && matches.length > 0) {
    return { type: 'SET_QUICK_ACTIONS', actions: matches.map((m) => m.slice(1, -1)) }
  }

  return null
}
