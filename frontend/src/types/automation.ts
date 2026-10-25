export type AutomationTriggerType = 'schedule' | 'map_vote_end' | 'map_start'

export type AutomationPowerSignal = 'start' | 'stop' | 'restart' | 'kill'

export type AutomationStep =
    | { type: 'power'; signal: AutomationPowerSignal }
    | { type: 'command'; command: string; channel: 'ptero' | 'bm' }
    | { type: 'delay'; seconds: number }
    | {
          type: 'apply_map_winner'
          mapVoteId?: string | null
          restartAfter?: boolean
      }

export type ServerAutomation = {
    id: string
    serverId: string
    name: string
    enabled: boolean
    triggerType: AutomationTriggerType
    triggerAt?: string | null
    mapVoteId?: string | null
    steps: AutomationStep[]
    lastExecutedTriggerKey?: string | null
    lastRunAt?: string | null
    lastRunStatus?: string | null
    lastRunError?: string | null
    lastRunNote?: string | null
    server?: { server_id: string; server_name: string } | null
    mapVote?: { id: string; vote_end?: string; map_start?: string } | null
}

export type MapVoteSummary = {
    id: string
    server_id: string
    vote_start: string
    vote_end: string
    map_start: string
    enabled: boolean
}

export type PterodactylStartupVariable = {
    key: string
    name: string
    value: string
    isEditable: boolean
}

export const wipeWorkflowTemplate: AutomationStep[] = [
    { type: 'power', signal: 'stop' },
    { type: 'delay', seconds: 15 },
    { type: 'apply_map_winner', restartAfter: false },
    { type: 'command', command: 'o.reload', channel: 'ptero' },
    { type: 'delay', seconds: 5 },
    { type: 'power', signal: 'start' },
]
