// Tree-shaken ECharts wrapper — only the modules the dashboard needs are
// registered, so the bundle stays a few hundred KB instead of the full ~1MB.
import { useRef, useEffect } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, PieChart, LineChart } from "echarts/charts";
import {
  TooltipComponent, LegendComponent, GridComponent,
  ToolboxComponent, DatasetComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart, PieChart, LineChart,
  TooltipComponent, LegendComponent, GridComponent, ToolboxComponent, DatasetComponent,
  CanvasRenderer,
]);

// Shared base — keeps every dashboard chart visually consistent.
export const ECHART_FONT = "'Segoe UI', system-ui, sans-serif";

export default function EChart({ option, height = 220, style, onEvents }) {
  const ref = useRef(null);
  // Resize with the container (panels are responsive grid cells).
  useEffect(() => {
    const inst = ref.current && ref.current.getEchartsInstance && ref.current.getEchartsInstance();
    const onR = () => { try { inst && inst.resize(); } catch (_) {} };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return (
    <ReactEChartsCore
      ref={ref}
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: "100%", ...style }}
      onEvents={onEvents}
    />
  );
}
