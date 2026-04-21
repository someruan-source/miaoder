import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "outline"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function getBadgeVariantClass(variant: BadgeVariant = "default") {
  switch (variant) {
    case "secondary":
      return "border-transparent bg-secondary text-secondary-foreground"
    case "outline":
      return "text-foreground"
    case "default":
    default:
      return "border-transparent bg-black text-white"
  }
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        getBadgeVariantClass(variant),
        className
      )}
      {...props}
    />
  )
}