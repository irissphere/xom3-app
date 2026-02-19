'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import type { PriceCandle } from '@/lib/trading/types';

interface TradingChartProps {
  data: PriceCandle[];
  symbol: string;
  theme?: 'dark' | 'light';
  supportLevel?: number;
  resistanceLevel?: number;
}

// Calculate EMA for a given period
function calculateEMAValues(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaValues: number[] = [];
  let ema = closes[0];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      ema = closes[i];
    } else {
      ema = closes[i] * k + ema * (1 - k);
    }
    emaValues.push(ema);
  }
  return emaValues;
}

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data, 
  symbol, 
  theme = 'dark',
  supportLevel,
  resistanceLevel 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    // lightweight-charts v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add EMA 9 line (fast - cyan)
    const ema9Series = chart.addSeries(LineSeries, {
      color: '#00bcd4',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Add EMA 21 line (slow - orange)
    const ema21Series = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || data.length < 21) return;

    const formattedData: CandlestickData<Time>[] = data.map(c => ({
      time: (c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    
    candleSeriesRef.current.setData(formattedData);

    // Calculate and set EMA data
    const closes = data.map(c => c.close);
    const ema9Values = calculateEMAValues(closes, 9);
    const ema21Values = calculateEMAValues(closes, 21);

    const ema9Data: LineData<Time>[] = data.map((c, i) => ({
      time: (c.timestamp / 1000) as Time,
      value: ema9Values[i],
    }));

    const ema21Data: LineData<Time>[] = data.map((c, i) => ({
      time: (c.timestamp / 1000) as Time,
      value: ema21Values[i],
    }));

    if (ema9SeriesRef.current) {
      ema9SeriesRef.current.setData(ema9Data);
    }
    if (ema21SeriesRef.current) {
      ema21SeriesRef.current.setData(ema21Data);
    }

    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{symbol} LIVE</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '2px', background: '#00bcd4' }} />
            <span style={{ color: '#00bcd4' }}>EMA 9</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '2px', background: '#ff9800' }} />
            <span style={{ color: '#ff9800' }}>EMA 21</span>
          </div>
        </div>
      </div>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
};
