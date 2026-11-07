import type { ReactNode } from "react"

import { BrandMark } from "@/components/Layout"
import { Card, CardContent } from "@/components/ui/card"

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto max-w-sm py-8 animate-fade-in sm:py-12">
      <div className="mb-7 flex flex-col items-center text-center">
        <BrandMark className="h-10 w-10 rounded-[11px]" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>

      <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
    </div>
  )
}
