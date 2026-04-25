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
}

export function ResultTrendChart({
  seconds,
  accuracy,
  hits,
  averageReaction,
  accuracyLabel,
  hitsLabel,
  averageReactionLabel,
}: ResultTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.EChartsType | null>(null);

  const option = useMemo<EChartsCoreOption>(
    () => ({
      backgroundColor: "transparent",
      color: ["#00d5ff", "#f5a524", "#a78bfa"],
      grid: {
        bottom: 38,
        left: 46,
        right: 48,
        top: 54,
      },
      legend: {
        right: 12,
        top: 4,
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
      xAxis: {
        type: "category",
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
      yAxis: [
        {
          type: "value",
          min: 0,
          max: 100,
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
            formatter: "{value}%",
          },
          splitLine: {
            lineStyle: {
              color: "rgba(255,255,255,0.07)",
            },
          },
        },
        {
          type: "value",
          min: 0,
          axisLabel: {
            color: "rgba(255,255,255,0.5)",
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: accuracyLabel,
          type: "line",
          yAxisIndex: 0,
          smooth: true,
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
          name: hitsLabel,
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "none",
          data: hits,
          lineStyle: {
            width: 2,
          },
        },
        {
          name: averageReactionLabel,
          type: "line",
          yAxisIndex: 1,
          smooth: true,
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
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartInstanceRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={chartRef} className="h-64 w-full" />;
}
