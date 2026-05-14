"use client";

import dynamic from "next/dynamic";
import type { AnalyticsPoint } from "@sentinelai/shared";

const AnalyticsChart = dynamic(() => import("./analytics-chart"), { ssr: false });

export function DashboardChart({ data }: { data?: AnalyticsPoint[] }) {
  return <AnalyticsChart data={data} />;
}
