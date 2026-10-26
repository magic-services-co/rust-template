"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const triggerClass =
  "h-9 rounded-[10px] border-[#1e2939] bg-[#0b1120] text-sm text-[#e2e8f0] shadow-none focus:ring-1 focus:ring-[#87369A] focus:ring-offset-0 data-[placeholder]:text-[#64748b]"

const menuClass = "border-[#1e2939] bg-[#0b1120] text-[#e2e8f0]"

const itemClass = "text-[#e2e8f0] focus:bg-[#87369A]/30 focus:text-white"

export function ThemeSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}) {
  const known = options.some((option) => option.value === value)

  return (
    <Select value={known ? value : undefined} onValueChange={onValueChange}>
      <SelectTrigger className={cn(triggerClass, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={menuClass}>
        {options
          .filter((option) => option.value !== "")
          .map((option) => (
            <SelectItem key={option.value} value={option.value} className={itemClass}>
              {option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
