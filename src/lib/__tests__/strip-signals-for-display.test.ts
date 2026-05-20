import { describe, it, expect } from 'vitest'
import { stripSignalsForDisplay } from '../strip-signals-for-display'

describe('stripSignalsForDisplay', () => {
  it('完整信号被剥离', () => {
    expect(stripSignalsForDisplay('<<LED:接地:on>>列车停车了')).toBe('列车停车了')
  })

  it('多个完整信号全部剥离', () => {
    const raw = '<<TRAIN_STATE:emergency_stop>><<FAULT_CODE:E0301:主接地保护动作>>\n调度收到报告。'
    expect(stripSignalsForDisplay(raw)).toBe('调度收到报告。')
  })

  it('未闭合的信号片段（流式中途）被截断', () => {
    // 流式中 >> 还没到，从 << 到末尾全部丢弃
    const raw = '<<FAULT_CODE:E0302:CI3 单元一次电流'
    expect(stripSignalsForDisplay(raw)).toBe('')
  })

  it('旁白在信号之后时，信号剥离后旁白保留', () => {
    const raw = '<<METER:网压:25>>\n\n调度已收到你的报告，请继续处置。'
    expect(stripSignalsForDisplay(raw)).toBe('调度已收到你的报告，请继续处置。')
  })

  it('流式中途：信号已闭合的部分剥离，未闭合的截断', () => {
    const raw = '<<LED:接地:on>>旁白开始。<<FAULT_CODE:E0302:CI3'
    expect(stripSignalsForDisplay(raw)).toBe('旁白开始。')
  })

  it('无信号时原样返回', () => {
    expect(stripSignalsForDisplay('正常的 AI 回复内容')).toBe('正常的 AI 回复内容')
  })

  it('单个 < 不被误伤（如 a < b）', () => {
    expect(stripSignalsForDisplay('速度 a < b 时触发保护')).toBe('速度 a < b 时触发保护')
  })

  it('空字符串返回空字符串', () => {
    expect(stripSignalsForDisplay('')).toBe('')
  })

  it('多余空行被折叠', () => {
    const raw = '<<SCORE:18,17,16,18,16:85>>\n\n\n\n本次训练结束。'
    expect(stripSignalsForDisplay(raw)).toBe('本次训练结束。')
  })

  it('末尾孤立 < 被丢弃（DeepSeek 跨 chunk 分割 <<）', () => {
    // Stream chunk ends with '<', next chunk will bring the second '<'
    expect(stripSignalsForDisplay('调度收到报告。<')).toBe('调度收到报告。')
  })

  it('末尾孤立 < 不影响正常文本', () => {
    // If next chunk turns out to be normal text, the dropped '<' is acceptable
    expect(stripSignalsForDisplay('a < b 时触发')).toBe('a < b 时触发')
  })
})

describe('stripDirectorMeta', () => {
  it('导演自检之后的内容全部截掉', () => {
    const raw = '列车已停车。导演自检：✓ 信号已发\n✓ 任务完成'
    expect(stripSignalsForDisplay(raw)).toBe('列车已停车。')
  })

  it('导演自检在开头时返回空字符串', () => {
    expect(stripSignalsForDisplay('导演自检：xxx')).toBe('')
  })

  it('连续3行含✓的行被移除', () => {
    const raw = '处置完毕。\n- 主断已合 ✓\n- 牵引恢复 ✓\n- 报告完成 ✓\n可以开车了。'
    const result = stripSignalsForDisplay(raw)
    expect(result).not.toContain('✓')
    expect(result).toContain('处置完毕')
    expect(result).toContain('可以开车了')
  })

  it('只有2行✓不被误删（少于阈值）', () => {
    const raw = '建议：\n- 检查 CI3 ✓\n- 报告调度 ✓\n完成。'
    const result = stripSignalsForDisplay(raw)
    // 2-line ✓ blocks are NOT stripped (below threshold of 3)
    expect(result).toContain('完成')
  })

  it('自我描述括注被移除', () => {
    const raw = '调度收到报告。（根据占位配置，调度方由 AI 扮演，直接回复）好的，明白。'
    const result = stripSignalsForDisplay(raw)
    expect(result).not.toContain('根据占位配置')
    expect(result).toContain('调度收到报告')
    expect(result).toContain('好的，明白')
  })
})

