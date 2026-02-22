import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-0))] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md hover:bg-[hsl(var(--primary-light))] active:bg-[hsl(var(--primary-dark))]",
        destructive:
          "bg-[hsl(var(--danger))] text-white shadow-md hover:bg-[hsl(var(--danger-light))] active:bg-[hsl(var(--danger-dark))]",
        outline:
          "border border-[hsl(var(--border-1))] bg-transparent text-[hsl(var(--text-1))] shadow-sm hover:bg-[hsl(var(--hover))] hover:border-[hsl(var(--border-2))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-white shadow-md hover:bg-[hsl(var(--secondary-light))] active:bg-[hsl(var(--secondary-dark))]",
        ghost: "hover:bg-[hsl(var(--hover))] text-[hsl(var(--text-1))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }