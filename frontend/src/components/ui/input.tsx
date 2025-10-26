import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2.5 text-base shadow-md hover:shadow-lg hover:border-white/30 transition-all duration-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-white/40 focus-visible:ring-purple-500/20 focus-visible:ring-[3px] focus-visible:shadow-lg focus-visible:shadow-purple-500/20 focus-visible:backdrop-blur-2xl focus-visible:bg-white/15",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
