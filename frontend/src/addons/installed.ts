"use client"

import { aimTrainFront } from "@/addons/teddys-addon/front"
import type { PublicFrontDefinition } from "@/lib/public-front-types"

/** Site-owned public fronts. Template updates keep this file and the addon folders it imports. */
export const installedFronts: PublicFrontDefinition[] = [aimTrainFront]
