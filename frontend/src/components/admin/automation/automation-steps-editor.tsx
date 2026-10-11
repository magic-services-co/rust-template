'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { GameServerCommandField } from '@/components/game-server-command-field'
import type { AutomationPowerSignal, AutomationStep } from '@/types/automation'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

type Props = {
    serverId?: string
    steps: AutomationStep[]
    onChange: (steps: AutomationStep[]) => void
    hasPterodactyl?: boolean
    bmEnabled?: boolean
    disabled?: boolean
}

const stepLabels: Record<AutomationStep['type'], string> = {
    power: 'Power action',
    command: 'Console command',
    delay: 'Wait',
    apply_map_winner: 'Apply winning map',
}

export function AutomationStepsEditor({
    serverId,
    steps,
    onChange,
    hasPterodactyl = true,
    bmEnabled = true,
    disabled = false,
}: Props) {
    const updateStep = (index: number, step: AutomationStep) => {
        const next = [...steps]
        next[index] = step
        onChange(next)
    }

    const removeStep = (index: number) => {
        onChange(steps.filter((_, i) => i !== index))
    }

    const moveStep = (index: number, direction: -1 | 1) => {
        const target = index + direction
        if (target < 0 || target >= steps.length) return
        const next = [...steps]
        const tmp = next[index]
        next[index] = next[target]
        next[target] = tmp
        onChange(next)
    }

    const addStep = (type: AutomationStep['type']) => {
        let step: AutomationStep
        switch (type) {
            case 'power':
                step = { type: 'power', signal: 'stop' }
                break
            case 'command':
                step = { type: 'command', command: '', channel: hasPterodactyl ? 'ptero' : 'bm' }
                break
            case 'delay':
                step = { type: 'delay', seconds: 10 }
                break
            case 'apply_map_winner':
                step = { type: 'apply_map_winner', restartAfter: true }
                break
        }
        onChange([...steps, step])
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => addStep('power')}>
                    <Plus className="h-4 w-4 mr-1" /> Power
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => addStep('command')}>
                    <Plus className="h-4 w-4 mr-1" /> Command
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => addStep('delay')}>
                    <Plus className="h-4 w-4 mr-1" /> Delay
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || !hasPterodactyl}
                    onClick={() => addStep('apply_map_winner')}
                >
                    <Plus className="h-4 w-4 mr-1" /> Winning map
                </Button>
            </div>

            {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Add steps to define what runs when the trigger fires.</p>
            ) : (
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <div key={index} className="rounded-lg border p-4 space-y-3 bg-card">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">
                                    {index + 1}. {stepLabels[step.type]}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled || index === 0}
                                        onClick={() => moveStep(index, -1)}
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled || index === steps.length - 1}
                                        onClick={() => moveStep(index, 1)}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled}
                                        onClick={() => removeStep(index)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            {step.type === 'power' && (
                                <Select
                                    value={step.signal}
                                    onValueChange={(v) =>
                                        updateStep(index, {
                                            type: 'power',
                                            signal: v as AutomationPowerSignal,
                                        })
                                    }
                                    disabled={disabled || !hasPterodactyl}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[250]">
                                        <SelectItem value="start">Start</SelectItem>
                                        <SelectItem value="stop">Stop</SelectItem>
                                        <SelectItem value="restart">Restart</SelectItem>
                                        <SelectItem value="kill">Kill</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {step.type === 'command' && (
                                <GameServerCommandField
                                    serverId={serverId}
                                    value={{ command: step.command, channel: step.channel }}
                                    onChange={(v) =>
                                        updateStep(index, {
                                            type: 'command',
                                            command: v.command,
                                            channel: v.channel,
                                        })
                                    }
                                    hasPterodactyl={hasPterodactyl}
                                    bmEnabled={bmEnabled}
                                    disabled={disabled}
                                    label=""
                                    description=""
                                    commandPlaceholder="e.g. wipe or oxide.reload *"
                                />
                            )}

                            {step.type === 'delay' && (
                                <div>
                                    <Label className="text-xs">Seconds</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={600}
                                        value={step.seconds}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            updateStep(index, {
                                                type: 'delay',
                                                seconds: Math.max(1, Math.min(600, Number(e.target.value) || 1)),
                                            })
                                        }
                                    />
                                </div>
                            )}

                            {step.type === 'apply_map_winner' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Sets panel startup variables from the winning map vote option using the variable names configured on the linked panel (Server Management → panel settings).
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id={`restart-${index}`}
                                            checked={Boolean(step.restartAfter)}
                                            disabled={disabled}
                                            onCheckedChange={(checked) =>
                                                updateStep(index, { ...step, restartAfter: checked })
                                            }
                                        />
                                        <Label htmlFor={`restart-${index}`} className="text-sm font-normal">
                                            Restart server after updating variables
                                        </Label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
