import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value)

  if (absValue < 1000) {
    return String(value)
  }

  const units = [
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ]
  const unit = units.find((item) => absValue >= item.value)!
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: absValue >= unit.value * 100 ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(value / unit.value)

  return `${formatted}${unit.suffix}`
}
