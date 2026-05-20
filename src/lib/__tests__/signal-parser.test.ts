import { describe, it, expect } from 'vitest'
import { parseSignals } from '../signal-parser'

describe('parseSignals', () => {
  it('解析 LED 信号并剥离标记', () => {
    const { cleanText, actions } = parseSignals('<<LED:接地:on>>列车停车了')
    expect(cleanText).toBe('列车停车了')
    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({ type: 'SET_LED', led: '接地', state: 'on' })
  })

  it('解析多个信号', () => {
    const { actions } = parseSignals(
      '<<LED:接地:on>><<LED:主断分:blink>><<METER:网压:25>>场景设定...'
    )
    expect(actions).toHaveLength(3)
    expect(actions[0]).toEqual({ type: 'SET_LED', led: '接地', state: 'on' })
    expect(actions[1]).toEqual({ type: 'SET_LED', led: '主断分', state: 'blink' })
    expect(actions[2]).toEqual({ type: 'SET_METER', meter: '网压', value: 25 })
  })

  it('剥离 Markdown 图片占位', () => {
    const { cleanText } = parseSignals('![列车已停车](recall slice 1)')
    expect(cleanText).toBe('列车已停车')
  })

  it('剥离 (recall slice X) 残留', () => {
    const { cleanText } = parseSignals('处置建议(recall slice 1)如下')
    expect(cleanText).toBe('处置建议如下')
  })

  it('解析 ACTIONS 信号（JSON 数组）', () => {
    const { actions } = parseSignals('<<ACTIONS:["报调度","呼叫应急台"]>>')
    expect(actions[0]).toEqual({ type: 'SET_QUICK_ACTIONS', actions: ['报调度', '呼叫应急台'] })
  })

  it('解析无参数信号 TASK_DONE', () => {
    const { actions } = parseSignals('任务完成<<TASK_DONE>>')
    expect(actions).toEqual([{ type: 'TASK_DONE' }])
  })

  it('解析 TASK 进度信号', () => {
    const { actions } = parseSignals('<<TASK:1/3:向调度报告停车>>')
    expect(actions[0]).toEqual({
      type: 'SET_TASK',
      current: 1,
      total: 3,
      description: '向调度报告停车',
    })
  })

  it('解析 TRAIN_STATE 信号', () => {
    const { actions } = parseSignals('<<TRAIN_STATE:emergency_stop>>')
    expect(actions[0]).toEqual({ type: 'SET_TRAIN_STATE', state: 'emergency_stop' })
  })

  it('忽略无效 LED 状态', () => {
    const { actions } = parseSignals('<<LED:接地:unknown>>')
    expect(actions).toHaveLength(0)
  })

  it('无信号时原样返回文本', () => {
    const { cleanText, actions } = parseSignals('正常的 AI 回复内容')
    expect(cleanText).toBe('正常的 AI 回复内容')
    expect(actions).toHaveLength(0)
  })

  it('FAULT_CODE 信号', () => {
    const { actions } = parseSignals('<<FAULT_CODE:E0612:CI1变流柜IGBT过温>>')
    expect(actions[0]).toMatchObject({
      type: 'ADD_FAULT_CODE',
      faultCode: { code: 'E0612', description: 'CI1变流柜IGBT过温' },
    })
  })

  it('解析 DISPATCH 信号（不进 actions，进 dispatches）', () => {
    const { actions, dispatches } = parseSignals(
      '<<DISPATCH:codriver:前往机械室检查 CI1 变流柜>>'
    )
    expect(actions).toHaveLength(0)
    expect(dispatches).toEqual([{ role: 'codriver', task: '前往机械室检查 CI1 变流柜' }])
  })

  it('解析 SCORE 信号', () => {
    const { actions } = parseSignals('<<SCORE:18,17,16,18,16:85>>')
    expect(actions[0]).toEqual({
      type: 'SHOW_SCORE_REPORT',
      report: { diagnosis: 18, procedure: 17, decision: 16, safety: 18, teamwork: 16, total: 85 },
    })
  })

  it('SCORE 信号 total 缺失时自动求和', () => {
    const { actions } = parseSignals('<<SCORE:18,17,16,18,16:>>')
    const report = (actions[0] as any).report
    expect(report.total).toBe(85)
  })

  it('SCORE 信号剥离后文本干净', () => {
    const { cleanText } = parseSignals('本次训练结束。<<SCORE:18,17,16,18,16:85>>感谢参与！')
    expect(cleanText).toBe('本次训练结束。感谢参与！')
  })

  it('解析 CI_PANEL 信号', () => {
    const { actions } = parseSignals(
      '<<CI_PANEL:CI1:normal:850:68;CI2:normal:845:70;CI3:fault:0:95;CI4:normal:840:69;CI5:normal:855:67;CI6:normal:848:71>>'
    )
    expect(actions[0]).toMatchObject({ type: 'SET_CI_PANEL' })
    const units = (actions[0] as any).units
    expect(units).toHaveLength(6)
    expect(units[2]).toEqual({ id: 'CI3', status: 'fault', current: 0, temperature: 95 })
    expect(units[0]).toEqual({ id: 'CI1', status: 'normal', current: 850, temperature: 68 })
  })

  it('CI_PANEL 容错中文分号和冒号', () => {
    const { actions } = parseSignals(
      '<<CI_PANEL:CI1：normal：850：68；CI3：fault：0：95>>'
    )
    const units = (actions[0] as any).units
    expect(units).toHaveLength(2)
    expect(units[1]).toMatchObject({ id: 'CI3', status: 'fault' })
  })

  it('CI_PANEL 剥离后文本干净', () => {
    const { cleanText } = parseSignals('请查看各单元状态。<<CI_PANEL:CI1:normal:850:68>>操作完毕。')
    expect(cleanText).toBe('请查看各单元状态。操作完毕。')
  })
})

describe('parseSignals - 容错性测试（针对 DeepSeek 格式漂移）', () => {
  it('应该容错单尖括号 LED 信号', () => {
    const { actions } = parseSignals('<LED:接地:on>')
    expect(actions).toContainEqual({ type: 'SET_LED', led: '接地', state: 'on' })
  })

  it('应该容错单尖括号 + 中文冒号 + 多余空格的 METER 信号', () => {
    const { actions } = parseSignals('<METER: 网压：25>')
    expect(actions).toContainEqual({ type: 'SET_METER', meter: '网压', value: 25 })
  })

  it('应该容错 LED 状态用中文（亮/熄/闪烁）', () => {
    const { actions } = parseSignals('<<LED:接地:亮>>')
    expect(actions).toContainEqual({ type: 'SET_LED', led: '接地', state: 'on' })
  })

  it('应该容错 METER 数值带单位（如 "25 kV"）', () => {
    const { actions } = parseSignals('<<METER:网压:25 kV>>')
    expect(actions).toContainEqual({ type: 'SET_METER', meter: '网压', value: 25 })
  })

  it('应该容错 ACTIONS 含中文符号', () => {
    const { actions } = parseSignals('<ACTIONS:["立即报告","呼叫应急台"]>')
    const qa = actions.find((a) => a.type === 'SET_QUICK_ACTIONS')
    expect((qa as any).actions).toEqual(['立即报告', '呼叫应急台'])
  })

  it('应该容错多个连续问题信号（DeepSeek 实测样本）', () => {
    const text = `<<TRAIN_STATE:emergency_stop>>
<LED: 接地:on>
<LED: 主断分:on>
<METER: 网压：25>
<METER: 电流：0>
<METER: 速度：0>
<METER: 总风压：0.85>
<METER: 管压：0.50>
<<FAULT_CODE:E0301: 主接地保护动作>>
<TASK:1/6: 向调度报告停车情况>
<ACTIONS:["立即报告调度（自动填表）","呼叫应急台请求 CMD 协助","派副司机去机械室检查","尝试软复位"]>`

    const { actions, cleanText } = parseSignals(text)

    expect(actions.filter((a) => a.type === 'SET_TRAIN_STATE')).toHaveLength(1)
    expect(actions.filter((a) => a.type === 'SET_LED')).toHaveLength(2)
    expect(actions.filter((a) => a.type === 'SET_METER')).toHaveLength(5)
    expect(actions.filter((a) => a.type === 'ADD_FAULT_CODE')).toHaveLength(1)
    expect(actions.filter((a) => a.type === 'SET_TASK')).toHaveLength(1)
    expect(actions.filter((a) => a.type === 'SET_QUICK_ACTIONS')).toHaveLength(1)

    const meter网压 = actions.find((a) => a.type === 'SET_METER' && (a as any).meter === '网压')
    expect((meter网压 as any).value).toBe(25)

    const taskAction = actions.find((a) => a.type === 'SET_TASK')
    expect((taskAction as any).current).toBe(1)
    expect((taskAction as any).total).toBe(6)
    expect((taskAction as any).description).toBe('向调度报告停车情况')

    expect(cleanText).not.toContain('<<')
    expect(cleanText).not.toContain('<LED')
    expect(cleanText).not.toContain('METER:')
    expect(cleanText).not.toContain('TASK:')
  })
})
