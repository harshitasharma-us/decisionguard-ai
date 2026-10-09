import React from 'react';
import { InventoryItem } from '../types/inventory';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

interface DemandStockChartProps {
  item: InventoryItem;
}

export const DemandStockChart: React.FC<DemandStockChartProps> = ({ item }) => {
  const history = item.recent_demand_history_7d || [10, 12, 14, 15, 13, 16, 15];
  
  const chartData = history.map((val, idx) => ({
    day: `Day 0${idx + 1}`,
    demand: val,
    safety: item.safety_stock,
    reorder: item.reorder_point,
  }));

  return (
    <div className="dg-panel rounded-panel p-5 sm:p-6 border border-dg-violet/25 shadow-panel space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dg-violet/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-dg-cyan" />
            <h3 className="font-space font-bold text-xs uppercase tracking-widest text-dg-text">
              7-Day Demand Volatility & Threshold Telemetry
            </h3>
          </div>
          <p className="text-[11px] font-space text-dg-muted mt-0.5">
            Historical consumption curve vs safety stock threshold ({item.safety_stock} units)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-dg-cyan" />
            <span className="text-dg-dim">Daily Demand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-[2px] bg-dg-danger" />
            <span className="text-dg-dim">Safety Stock ({item.safety_stock})</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-48 sm:h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#35D6FF" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="#6D6A8F"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(124, 92, 255, 0.15)' }}
            />
            <YAxis
              stroke="#6D6A8F"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(124, 92, 255, 0.15)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#11102D',
                borderColor: 'rgba(124, 92, 255, 0.3)',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                color: '#F8F7FF',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              itemStyle={{ color: '#35D6FF' }}
            />
            <ReferenceLine
              y={item.safety_stock}
              stroke="#FF5577"
              strokeDasharray="3 3"
              label={{
                value: 'Safety Buffer',
                fill: '#FF5577',
                fontSize: 9,
                position: 'insideBottomRight',
              }}
            />
            <Area
              type="monotone"
              dataKey="demand"
              stroke="#35D6FF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#demandGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-dg-dim pt-2 border-t border-dg-violet/10">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-dg-cyan" />
          Average Velocity: <strong className="text-white">{item.daily_velocity} units/day</strong>
        </span>
        <span>
          Lead Time Runway: <strong className="text-dg-lavender">{item.supplier_lead_time_days} days</strong>
        </span>
      </div>
    </div>
  );
};
