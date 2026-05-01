import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

interface TrainingAnalyticsChartProps {
  labels: string[];
  accuracy: number[];
  averageReaction: number[];
  accuracyLabel: string;
  averageReactionLabel: string;
  className?: string;
}

export function TrainingAnalyticsChart({
  labels,
  accuracy,
  averageReaction,
  accuracyLabel,
  averageReactionLabel,
  className = "h-[320px]",
}: TrainingAnalyticsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chart = echarts.init(chartRef.current, "dark", { renderer: "canvas" });
    const option: EChartsCoreOption = {
      backgroundColor: "transparent",
      color: ["#00d5ff", "#f5a524"],
      grid: {
        bottom: 24,
        left: 42,
        right: 34,
        top: 24,
      },
      legend: {
        show: false,
        top: 0,
        right: 16,
        textStyle: {
          color: "rgba(255,255,255,0.62)",
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,12,20,0.88)",
        borderColor: "rgba(255,255,255,0.12)",
        textStyle: {
          color: "#f8fafc",
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.12)",
          },
        },
        axisLabel: {
          color: "rgba(255,255,255,0.48)",
        },
      },
      yAxis: [
        {
          type: "value",
          min: 0,
          max: 100,
          axisLabel: {
            color: "rgba(255,255,255,0.48)",
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
          axisLabel: {
            color: "rgba(255,255,255,0.48)",
            formatter: "{value}ms",
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
          smooth: true,
          yAxisIndex: 0,
          data: accuracy,
          symbolSize: 7,
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.14,
          },
        },
        {
          name: averageReactionLabel,
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: averageReaction,
          symbolSize: 7,
          lineStyle: {
            width: 2,
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [accuracy, accuracyLabel, averageReaction, averageReactionLabel, labels]);

  return <div ref={chartRef} className={`${className} w-full`} />;
}
