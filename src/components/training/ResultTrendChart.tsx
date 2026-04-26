import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

interface ResultTrendChartProps {
  seconds: string[];
  accuracy: number[];
  hits: number[];
  averageReaction: number[];
  accuracyLabel: string;
  hitsLabel: string;
  averageReactionLabel: string;
  className?: string;
}

export function ResultTrendChart({
  seconds,
  accuracy,
  hits,
  averageReaction,
  accuracyLabel,
  hitsLabel,
  averageReactionLabel,
  className = "h-[420px]",
}: ResultTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.EChartsType | null>(null);

  const option = useMemo<EChartsCoreOption>(
    () => ({
      backgroundColor: "transparent",
      color: ["#00d5ff", "#f5a524", "#a78bfa"],
      axisPointer: {
        link: [{ xAxisIndex: [0, 1, 2] }],
      },
      grid: [
        {
          left: 18,
          right: 42,
          top: 38,
          height: "23%",
        },
        {
          left: 18,
          right: 42,
          top: "39%",
          height: "23%",
        },
        {
          left: 18,
          right: 42,
          top: "70%",
          height: "23%",
        },
      ],
      legend: {
        left: 8,
        top: 2,
        textStyle: {
          color: "rgba(255,255,255,0.64)",
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,12,20,0.92)",
        borderColor: "rgba(255,255,255,0.12)",
        textStyle: {
          color: "#f8fafc",
        },
      },
      xAxis: [
        {
          type: "category",
          gridIndex: 0,
          data: seconds,
          boundaryGap: false,
          axisLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.12)",
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
        },
        {
          type: "category",
          gridIndex: 1,
          data: seconds,
          boundaryGap: false,
          axisLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.12)",
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
        },
        {
          type: "category",
          gridIndex: 2,
          data: seconds,
          boundaryGap: false,
          axisLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.14)",
            },
          },
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
            interval: 4,
          },
        },
      ],
      yAxis: [
        {
          type: "value",
          gridIndex: 0,
          min: 0,
          max: 100,
          position: "right",
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
          },
          splitLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.07)",
            },
          },
        },
        {
          type: "value",
          gridIndex: 1,
          min: 0,
          minInterval: 1,
          position: "right",
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
          },
          splitLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.07)",
            },
          },
        },
        {
          type: "value",
          gridIndex: 2,
          min: 0,
          position: "right",
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
          },
          splitLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.07)",
            },
          },
        },
      ],
      series: [
        {
          name: `${accuracyLabel}(%)`,
          type: "line",
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: false,
          symbol: "none",
          data: accuracy,
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.12,
          },
        },
        {
          name: `${hitsLabel}(hits)`,
          type: "line",
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: false,
          symbol: "none",
          data: hits,
          lineStyle: {
            width: 2,
          },
        },
        {
          name: `${averageReactionLabel}(ms)`,
          type: "line",
          xAxisIndex: 2,
          yAxisIndex: 2,
          smooth: false,
          symbol: "none",
          data: averageReaction,
          lineStyle: {
            width: 2,
          },
        },
      ],
    }),
    [accuracy, accuracyLabel, averageReaction, averageReactionLabel, hits, hitsLabel, seconds],
  );

  useEffect(() => {
    if (!chartRef.current || chartInstanceRef.current) {
      return;
    }

    chartInstanceRef.current = echarts.init(chartRef.current, "dark", { renderer: "canvas" });

    const handleResize = () => chartInstanceRef.current?.resize();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => chartInstanceRef.current?.resize());

    window.addEventListener("resize", handleResize);
    resizeObserver?.observe(chartRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartInstanceRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={chartRef} className={`${className} w-full`} />;
}
