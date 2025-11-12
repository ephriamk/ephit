import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#4A90E2]/30 via-[#4A90E2]/20 to-[#2E66B5]/15 text-primary-foreground liquid-glass backdrop-blur-xl border border-white/20 shadow-lg shadow-[#4A90E2]/30 hover:shadow-xl hover:shadow-[#4A90E2]/40 transition-all duration-300 hover:scale-105 active:scale-100 liquid-glass-button",
        destructive:
          "bg-gradient-to-br from-red-500/20 via-red-500/15 to-pink-500/10 text-white liquid-glass backdrop-blur-xl border border-white/20 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 active:scale-100 transition-all duration-300",
        outline:
          "border-2 border-white/30 bg-white/5 backdrop-blur-xl liquid-glass hover:bg-white/10 hover:border-white/40 transition-all duration-300 hover:scale-[1.02] liquid-glass-button",
        secondary:
          "bg-gradient-to-br from-[#2E66B5]/15 via-[#2E66B5]/10 to-[#1C3E75]/8 backdrop-blur-xl liquid-glass text-secondary-foreground border border-white/15 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        ghost:
          "hover:bg-white/10 hover:text-accent-foreground backdrop-blur-sm hover:scale-105 transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-all duration-300",
      },
      size: {
        default: "h-11 px-6 py-3 has-[>svg]:px-5",
        sm: "h-10 rounded-xl gap-2 px-4 has-[>svg]:px-3.5",
        lg: "h-14 rounded-2xl px-10 has-[>svg]:px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
