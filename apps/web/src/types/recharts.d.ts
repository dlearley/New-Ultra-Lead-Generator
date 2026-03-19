// Type declarations for recharts to fix React 18 compatibility
declare module 'recharts' {
  import * as React from 'react';
  
  export const ResponsiveContainer: React.FC<{
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
  }>;
  
  export const PieChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number }>;
  export const Pie: React.FC<any>;
  export const Cell: React.FC<any>;
  export const Tooltip: React.FC<any>;
  export const LineChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }>;
  export const Line: React.FC<any>;
  export const XAxis: React.FC<any>;
  export const YAxis: React.FC<any>;
  export const CartesianGrid: React.FC<any>;
  export const Legend: React.FC<any>;
  export const BarChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[]; layout?: string }>;
  export const Bar: React.FC<any>;
  export const AreaChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }>;
  export const Area: React.FC<any>;
  export const ComposedChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }>;
  export const ScatterChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number; data?: any[] }>;
  export const Scatter: React.FC<any>;
  export const RadarChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number }>;
  export const Radar: React.FC<any>;
  export const RadialBarChart: React.FC<{ children?: React.ReactNode; width?: number; height?: number }>;
  export const RadialBar: React.FC<any>;
  export const Treemap: React.FC<any>;
  export const Sankey: React.FC<any>;
  export const FunnelChart: React.FC<{ children?: React.ReactNode }>;
  export const Funnel: React.FC<any>;
  export const ReferenceLine: React.FC<any>;
  export const ReferenceDot: React.FC<any>;
  export const ReferenceArea: React.FC<any>;
  export const Brush: React.FC<any>;
  export const Label: React.FC<any>;
  export const LabelList: React.FC<any>;
  export const ErrorBar: React.FC<any>;
}
