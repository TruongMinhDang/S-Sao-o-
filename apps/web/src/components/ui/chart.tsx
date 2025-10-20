"use client"

import * as React from "react"
import {
  Label,
  Pie,
  PieChart as RechartsPieChart,
  Sector,
  Tooltip as RechartsTooltip,
} from "recharts"
import {
  Cell,
  type PieProps as RechartsPieProps,
} from "recharts"
import {
  type ChartConfig,
  type ChartContainerProps,
  ChartContainer as ChartContainerPrimitive,
  ChartContext,
} from "@/lib/tailwind-variants-chart"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/* -----------------------------------------------------------------------------
 * Chart Container
 * -------------------------------------------------------------------------- */

const ChartContainer = ChartContainerPrimitive

/* -----------------------------------------------------------------------------
 * Chart Tooltip
 * -------------------------------------------------------------------------- */

const ChartTooltip = RechartsTooltip

type ChartTooltipContentProps = Omit<
  React.ComponentProps<typeof RechartsTooltip>["content"],
  "ref"
> & {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  labelKey?: string
  nameKey?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const {
      config,
      variant,
    } = React.useContext(ChartContext)
    
    const valueFormatter = React.useCallback((value: number) => {
      return new Intl.NumberFormat("en-US").format(value);
    }, []);

    const formattedLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const item = payload[0]
      let name = label
      if (item.payload) {
        if (labelKey && labelKey in item.payload) {
          name = item.payload[labelKey] as string
        } else if (nameKey && nameKey in item.payload) {
          name = item.payload[nameKey] as string
        } else if (typeof label === "function") {
          name = label(item.payload)
        }
      }

      if (labelFormatter) {
        return labelFormatter(name, payload)
      }

      return String(name)
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelKey,
      nameKey,
      valueFormatter,
    ])

    if (!active || !payload || !payload.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-32 items-start gap-1.5 rounded-lg border bg-background/95 p-2.5 text-sm shadow-xl backdrop-blur-lg",
          className
        )}
      >
        {formattedLabel ? (
          <div className={cn("font-medium", labelClassName)}>
            {formattedLabel}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${item.name}-${item.value}-${index}`
            const itemConfig = config?.[item.name as keyof typeof config]

            const indicatorColor =
              color || (item.color as string | undefined) || itemConfig?.color

            return (
              <div
                key={key}
                className={cn("flex w-full items-center gap-2 [&>svg]:size-2.5")}
              >
                {hideIndicator ? null : (
                  <div
                    className={cn(
                      "shrink-0 rounded-sm border border-border/50",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-dashed": indicator === "dashed",
                        "border-border": !indicatorColor,
                      }
                    )}
                    style={{
                      backgroundColor: indicatorColor,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    variant === "pie" && "items-center"
                  )}
                >
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {itemConfig?.label || item.name}
                    </span>
                    {variant === "pie" && itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : null}
                  </div>
                  {item.value ? (
                    <span className="font-medium">
                      {formatter
                        ? formatter(item.value, item.name, item)
                        : valueFormatter(item.value as number)}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

/* -----------------------------------------------------------------------------
 * Chart Legend
 * -------------------------------------------------------------------------- */

const ChartLegend = RechartsTooltip

type ChartLegendContentProps = Omit<
  React.ComponentProps<"div">,
  "content" | "ref"
> &
  Pick<React.ComponentProps<typeof RechartsTooltip>, "payload"> & {
    content?: React.ComponentType<any>
    nameKey?: string
  }

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(({ className, ...props }, ref) => {
  const { config, variant } = React.useContext(ChartContext)

  if (!props.payload || !props.payload.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        variant === "pie" && "flex-wrap",
        className
      )}
      {...props}
    >
      {props.payload.map((item) => {
        const key = `${item.value}`
        const itemConfig = config?.[item.value as keyof typeof config]
        const color =
          (item.color as string | undefined) ||
          (itemConfig?.color as string | undefined)

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground"
            )}
          >
            <div
              className={cn("size-2.5 shrink-0 rounded-sm")}
              style={{
                backgroundColor: color,
              }}
            />
            {itemConfig?.label || (item.value as string)}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

/* -----------------------------------------------------------------------------
 * Pie Chart
 * -------------------------------------------------------------------------- */

const PieChart = React.forwardRef<
  HTMLDivElement,
  ChartContainerProps & {
    valueFormatter?: (value: number) => string
  }
>(({ children, className, style, config, valueFormatter, ...props }, ref) => {
  return (
    <ChartContext.Provider
      value={{
        config,
        style,
        variant: "pie",
        valueFormatter: valueFormatter || ((value) => value.toString()),
      }}
    >
      <ChartContainerPrimitive
        ref={ref}
        config={config}
        style={style}
        className={cn("flex aspect-square items-center justify-center", className)}
        {...props}
      >
        <RechartsPieChart>{children}</RechartsPieChart>
      </ChartContainerPrimitive>
    </ChartContext.Provider>
  )
})
PieChart.displayName = "PieChart"

/* -----------------------------------------------------------------------------
 * Pie Chart - Donut
 * -------------------------------------------------------------------------- */

type DonutChartProps = React.ComponentProps<typeof PieChart>

const DonutChart = React.forwardRef<
  React.ComponentProps<typeof PieChart>["ref"],
  DonutChartProps
>(({ children, ...props }, ref) => {
  return (
    <PieChart ref={ref} {...props}>
      {children}
    </PieChart>
  )
})
DonutChart.displayName = "DonutChart"

/* -----------------------------------------------------------------------------
 * Pie Chart - Cell
 * -------------------------------------------------------------------------- */

type ChartPieCell = React.ComponentProps<typeof Cell>

const PieChartCell = ({ ...props }: ChartPieCell) => {
  const { config, style } = React.useContext(ChartContext)
  return <Cell {...props} fill={props.fill || style.color?.fill} />
}
PieChartCell.displayName = "PieChartCell"

/* -----------------------------------------------------------------------------
 * Pie Chart - Label
 * -------------------------------------------------------------------------- */

type RechartsLabelProps = React.ComponentProps<typeof Label>

const PieChartLabel = ({ className, ...props }: RechartsLabelProps) => {
  const { config, style } = React.useContext(ChartContext)

  return (
    <Label
      {...props}
      className={cn(style.label, className)}
      fillOpacity={props.fillOpacity || style.label?.fillOpacity}
      stroke={props.stroke || style.label?.stroke}
      strokeWidth={props.strokeWidth || style.label?.strokeWidth}
      strokeOpacity={props.strokeOpacity || style.label?.strokeOpacity}
    />
  )
}

PieChartLabel.displayName = "PieChartLabel"

/* -----------------------------------------------------------------------------
 * Pie Chart - Label List
 * -------------------------------------------------------------------------- */

type PieLabelListProps = RechartsLabelProps & {
  nameKey: string
  labelKey?: string
}

const PieChartLabelList = ({
  className,
  nameKey,
  labelKey,
  ...props
}: PieLabelListProps) => {
  const { config, style, valueFormatter } = React.useContext(ChartContext)
  const [data, setData] = React.useState<any[]>([])

  return (
    <PieChartLabel
      {...props}
      valueAccessor={(d) => d.value}
      data={data}
      content={(props) => {
        return (
          <g transform={`translate(${props.x}, ${props.y})`}>
            <text
              x={0}
              y={0}
              textAnchor={props.textAnchor}
              dominantBaseline={props.dominantBaseline}
              className="text-sm"
              style={style.label}
              fill={style.label?.fill}
            >
              {valueFormatter(props.value as number)}
              <title>{props.payload[nameKey]}</title>
            </text>
          </g>
        )
      }}
    />
  )
}
PieChartLabelList.displayName = "PieChartLabelList"

/* -----------------------------------------------------------------------------
 * Pie Chart - Tooltip
 * -------------------------------------------------------------------------- */

type PieTooltipProps = React.ComponentProps<typeof Tooltip>

const PieChartTooltip = ({ ...props }: PieTooltipProps) => {
  const { config, style } = React.useContext(ChartContext)
  return <Tooltip {...props} />
}
PieChartTooltip.displayName = "PieChartTooltip"

/* -----------------------------------------------------------------------------
 * Pie Chart - Active Shape
 * -------------------------------------------------------------------------- */

type PieActiveShape = (
  props: any
) => React.ReactElement<SVGPathElement>

const PieChartActiveShape: PieActiveShape = (props) => {
  const { config, style } = React.useContext(ChartContext)
  return <Sector {...props} />
}
PieChartActiveShape.displayName = "PieChartActiveShape"

/* -----------------------------------------------------------------------------
 * Pie Chart - Sector
 * -------------------------------------------------------------------------- */

type RechartsPiePropsWithContext = Omit<RechartsPieProps, "data"> & {
  data: any[]
}

const PieChartSector = React.forwardRef<
  RechartsPieChart,
  RechartsPiePropsWithContext
>(({ className, data, ...props }, ref) => {
  const { config, style } = React.useContext(ChartContext)
  return (
    <Pie
      ref={ref}
      {...props}
      data={data}
      // @ts-ignore
      activeShape={
        props.activeShape
          ? props.activeShape
          : (props: any) => <Sector {...props} />
      }
    >
      {data.map((item, index) => (
        <Cell
          key={`cell-${index}`}
          fill={
            (config?.[item.name as keyof typeof config]?.color as string) ||
            style.color?.fill
          }
        />
      ))}
    </Pie>
  )
})
PieChartSector.displayName = "PieChartSector"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  PieChart,
  DonutChart,
  PieChartSector,
  PieChartLabel,
  PieChartLabelList,
  PieChartTooltip,
  PieChartActiveShape,
}