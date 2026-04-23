import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface ScoreData {
  coaching_month: number;
  coaching_year: number;
  overall_score: number | null;
  station_score?: number | null;
  general_score?: number | null;
}

interface ScoreEvolutionChartProps {
  data: ScoreData[];
  height?: number;
  showLabels?: boolean;
}

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function ScoreEvolutionChart({
  data,
  height = 120,
  showLabels = true,
}: ScoreEvolutionChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      label: `${MONTH_LABELS[d.coaching_month - 1]} ${String(d.coaching_year).slice(-2)}`,
      score: d.overall_score,
      station: d.station_score,
      general: d.general_score,
    }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        Necesita al menos 2 coachings para mostrar evolución
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          hide={!showLabels}
        />
        <YAxis
          domain={[1, 5]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          ticks={[1, 2, 3, 4, 5]}
          hide={!showLabels}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [value?.toFixed(1), 'Score']}
        />
        <ReferenceLine
          y={3}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="3 3"
          opacity={0.3}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Cálculo de tendencia
export function calculateTrend(data: ScoreData[]): 'up' | 'down' | 'stable' | null {
  if (data.length < 2) return null;

  const recent = data.slice(-3); // Últimos 3 meses
  if (recent.length < 2) return null;

  const first = recent[0].overall_score;
  const last = recent[recent.length - 1].overall_score;

  if (first === null || last === null) return null;

  const diff = last - first;

  if (diff > 0.2) return 'up';
  if (diff < -0.2) return 'down';
  return 'stable';
}
