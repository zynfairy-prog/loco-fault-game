import type { GameFacts } from '@/types/game-state'

export function serializeFacts(f: GameFacts): string {
  const factsObj = Object.fromEntries([
    ['phase', f.phase],
    ['hasDispatch (派副司机)', f.hasDispatch],
    ['hasReport (副司机回报)', f.hasReport],
    ['symptomReport (症状判定)', f.symptomReport ?? null],
    ['hasGSAction (扳GS动作)', f.hasGSAction],
    ['whichGS (扳的GS)', f.whichGS ?? null],
    ['gsResult (试合主断结果)', f.gsResult ?? null],
    ['hasIsolation (切除单元)', f.hasIsolation],
    ['whichCI (切除的CI)', f.whichCI ?? null],
    ['dispatchApproval (调度审批)', f.dispatchApproval ?? null],
    ['hasViewedMFD (查看微机)', f.hasViewedMFD],
  ])

  return [
    '=== AUTHORITATIVE FACTS - 不可编造其他事实,评分前必须逐字段回显 ===',
    JSON.stringify(factsObj, null, 2),
    '=== END AUTHORITATIVE FACTS ===',
  ].join('\n')
}
