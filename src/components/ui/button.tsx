import * as React from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "outline" | "secondary" | "ghost"
type ButtonSize = "default" | "sm" | "lg" | "icon"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

function getVariantClass(variant: ButtonVariant = "default") {
  switch (variant) {
    case "outline":
      return "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    case "secondary":
      return "bg-secondary text-secondary-foreground hover:opacity-90"
    case "ghost":
      return "hover:bg-accent hover:text-accent-foreground"
    case "default":
    default:
      return "bg-black text-white hover:opacity-90"
  }
}

function getSizeClass(size: ButtonSize = "default") {
  switch (size) {
    case "sm":
      return "h-9 rounded-md px-3"
    case "lg":
      return "h-11 rounded-md px-8"
    case "icon":
      return "h-10 w-10"
    case "default":
    default:
      return "h-10 px-4 py-2"
  }
}

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        getVariantClass(variant),
        getSizeClass(size),
        className
      )}
      {...props}
    />
  )
}