'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    defaultPterodactylStartupVarKeys,
    type PterodactylStartupVarKeys,
} from '@/lib/pterodactyl-startup-vars'

type Props = {
    value: PterodactylStartupVarKeys
    onChange: (keys: PterodactylStartupVarKeys) => void
    disabled?: boolean
}

export function PterodactylStartupVarKeysFields({ value, onChange, disabled }: Props) {
    return (
        <div className="space-y-3 rounded-md border p-4 bg-muted/20">
            <div>
                <p className="text-sm font-medium">Rust startup variable names</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Environment variable keys from the Rust egg on this panel. Used when automations apply a winning map vote (seed/size or custom URL).
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <Label className="text-xs">Seed</Label>
                    <Input
                        value={value.seed}
                        disabled={disabled}
                        onChange={(e) => onChange({ ...value, seed: e.target.value })}
                        placeholder="WORLD_SEED"
                    />
                </div>
                <div>
                    <Label className="text-xs">Size</Label>
                    <Input
                        value={value.size}
                        disabled={disabled}
                        onChange={(e) => onChange({ ...value, size: e.target.value })}
                        placeholder="WORLD_SIZE"
                    />
                </div>
                <div>
                    <Label className="text-xs">Custom map URL</Label>
                    <Input
                        value={value.customMapUrl}
                        disabled={disabled}
                        onChange={(e) => onChange({ ...value, customMapUrl: e.target.value })}
                        placeholder="MAP_URL"
                    />
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange({ ...defaultPterodactylStartupVarKeys })}
            >
                Reset to defaults
            </Button>
        </div>
    )
}
