"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SupportSessionDiagnosticSample } from "@/lib/sessions/types";

const networkConfig = {
  latency: { label: "Latency (ms)", color: "var(--primary)" },
  packetLoss: { label: "Packet loss (%)", color: "oklch(0.68 0.17 55)" },
} satisfies ChartConfig;

const bitrateConfig = {
  sendBitrate: { label: "Send (Kbps)", color: "var(--primary)" },
  receiveBitrate: { label: "Receive (Kbps)", color: "oklch(0.62 0.15 155)" },
} satisfies ChartConfig;

export function SessionDiagnosticsTimeline({
  samples,
}: {
  samples: SupportSessionDiagnosticSample[];
}) {
  if (!samples.length) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-5 py-10 text-center">
        <p className="font-medium">No timeline samples</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This session ended before samples were saved, or it was recorded
          before timelines were enabled.
        </p>
      </div>
    );
  }

  const firstSampleTime = new Date(samples[0].sampled_at).getTime();
  const points = samples.map((sample) => {
    const elapsedSeconds = Math.max(
      0,
      Math.round(
        (new Date(sample.sampled_at).getTime() - firstSampleTime) / 1000,
      ),
    );
    return {
      elapsedSeconds,
      elapsedLabel: formatElapsed(elapsedSeconds),
      latency: sample.latency_ms,
      packetLoss: sample.incoming_packet_loss_percent,
      sendBitrate: sample.send_bitrate_kbps,
      receiveBitrate: sample.receive_bitrate_kbps,
    };
  });
  const interruptions = samples.reduce((count, sample, index) => {
    const interrupted =
      sample.connection_state === "disconnected" ||
      sample.connection_state === "failed";
    const previous = index > 0 ? samples[index - 1].connection_state : null;
    return (
      count + (interrupted && previous !== sample.connection_state ? 1 : 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>
          <strong className="font-medium text-foreground">
            {samples.length}
          </strong>{" "}
          samples
        </span>
        <span>
          <strong className="font-medium text-foreground">
            {formatElapsed(points.at(-1)?.elapsedSeconds ?? 0)}
          </strong>{" "}
          observed
        </span>
        <span>
          <strong className="font-medium text-foreground">
            {interruptions}
          </strong>{" "}
          interruptions
        </span>
      </div>

      <TimelineChart
        title="Network health"
        description="Round-trip latency and incoming packet loss"
      >
        <ChartContainer
          config={networkConfig}
          className="h-64 w-full aspect-auto"
        >
          <LineChart
            data={points}
            margin={{ left: 0, right: 4, top: 8, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="elapsedSeconds"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={formatElapsed}
            />
            <YAxis
              yAxisId="latency"
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, "auto"]}
            />
            <YAxis
              yAxisId="loss"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={38}
              domain={[0, 100]}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.elapsedLabel ?? ""
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              yAxisId="latency"
              dataKey="latency"
              type="monotone"
              stroke="var(--color-latency)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="loss"
              dataKey="packetLoss"
              type="monotone"
              stroke="var(--color-packetLoss)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </TimelineChart>

      <TimelineChart
        title="Media throughput"
        description="Combined outgoing and incoming audio/video bitrate"
      >
        <ChartContainer
          config={bitrateConfig}
          className="h-64 w-full aspect-auto"
        >
          <LineChart
            data={points}
            margin={{ left: 0, right: 4, top: 8, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="elapsedSeconds"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={formatElapsed}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.elapsedLabel ?? ""
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="sendBitrate"
              type="monotone"
              stroke="var(--color-sendBitrate)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="receiveBitrate"
              type="monotone"
              stroke="var(--color-receiveBitrate)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </TimelineChart>
    </div>
  );
}

function TimelineChart({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
