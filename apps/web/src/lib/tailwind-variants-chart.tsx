"use client"

import {
  createContext,
  forwardRef,
  useContext,
  type HTMLAttributes,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"

// Chart Style
// -----------------------------------------------------------------------------

const chartStyle = tv({
  slots: {
    root: "flex",
    title: "text-lg font-medium",
    description: "text-sm text-muted-foreground",
    header: "flex flex-col items-start gap-1.5",
    chart: "w-full",
    legend: "flex items-center gap-4",
    legendItem: "flex items-center gap-2 text-sm",
    legendIndicator: "h-2 w-2 rounded-full",
    tooltip:
      "rounded-lg border bg-background/95 p-2.5 text-sm shadow-xl backdrop-blur-lg",
    tooltipHeader: "font-medium",
    tooltipContent: "grid gap-1.5",
    tooltipItem: "flex items-center gap-2",
    tooltipIndicator: "h-2.5 w-2.5 shrink-0 rounded-sm border",
    tooltipValue: "font-medium",
  },
  variants: {
    variant: {
      line: {
        root: "flex flex-col gap-6",
      },
      bar: {
        root: "flex flex-col gap-6",
      },
      pie: {
        root: "flex aspect-square items-center justify-center",
      },
    },
  },
  defaultVariants: {
    variant: "line",
  },
})

export type ChartStyleProps = VariantProps<typeof chartStyle>
export type ChartStyleConfig = {
  [K in keyof typeof chartStyle.slots]: string
}

// Chart Container
// -----------------------------------------------------------------------------

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
>

interface ChartContextValue {
  config: ChartConfig
  style: ChartStyleConfig
  variant?: ChartStyleProps["variant"]
}

const ChartContext = createContext<ChartContextValue>({
  config: {},
  style: {} as ChartStyleConfig,
})

export type ChartContainerProps = HTMLAttributes<HTMLDivElement> &
  ChartStyleProps & {
    config: ChartConfig
    valueFormatter?: (value: number) => string
  }

const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      children,
      className,
      config,
      valueFormatter = (value) => value.toString(),
      variant,
      ...props
    },
    ref
  ) => {
    const style = chartStyle({ variant })

    return (
      <ChartContext.Provider value={{ config, style, variant }}>
        <div ref={ref} className={style.root({ className })} {...props}>
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "Chart"

export { ChartContainer, ChartContext, chartStyle }