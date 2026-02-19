'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { PriceCandle, TradingSignal } from '@/lib/trading/types';

interface TradingChartProps {
  candles: PriceCandle[];
  signal: TradingSignal | null;
}

export default function TradingChart({ candles, signal }: TradingChartProps) {
  if (!candles || candles.length === 0) {
    return (
      <div className="w-full h-[400px] bg-black/20 rounded-xl flex items-center justify-center border border-white/5 animate-pulse">
        <span className="text-white/40">Loading chart data...</span>
      </div>
    );
  }

  // Format data for Recharts
  const data = candles.map((c) => ({
    time: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: c.close,
    high: c.high,
    low: c.low,
    timestamp: c.timestamp,
  }));

  const minPrice = Math.min(...data.map((d) => d.low)) * 0.9998;
  const maxPrice = Math.max(...data.map((d) => d.high)) * 1.0002;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a2e] border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-white/60 text-xs mb-1">{label}</p>
          <p className="text-white font-bold">${payload[0].value.toFixed(5)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            orientation="right"
            tickFormatter={(val) => val.toFixed(4)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="none" 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#8A2BE2" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
          />
          
          {signal && (
            <>
              {/* Entry Price Line */}
              <ReferenceLine 
                y={signal.bestEntryPrice} 
                stroke="#00C864" 
                strokeDasharray="3 3" 
                label={{ position: 'left', value: 'ENTRY', fill: '#00C864', fontSize: 10, fontWeight: 'bold' }}
              />
              
              {/* Invalidation Price Line */}
              <ReferenceLine 
                y={signal.invalidationPrice} 
                stroke="#FF6464" 
                strokeDasharray="3 3" 
                label={{ position: 'left', value: 'INVALID', fill: '#FF6464', fontSize: 10, fontWeight: 'bold' }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
