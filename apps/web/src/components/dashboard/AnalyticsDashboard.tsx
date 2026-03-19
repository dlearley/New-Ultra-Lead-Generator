'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, Loader2 } from 'lucide-react';

interface DashboardSummary {
  kpis: {
    totalLeads: number;
    leadConversionRate: number;
    totalRevenue: number;
    cac: number;
    ltvCacRatio: number;
    roi: number;
  };
  funnel: {
    totalEntries: number;
    totalConversions: number;
    overallConversionRate: number;
    stages: Array<{
      name: string;
      count: number;
      conversionRate: number;
      dropOffRate: number;
    }>;
  };
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics-dashboard/summary`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return <div>Failed to load dashboard</div>;
  }

  const { kpis, funnel } = data;
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your sales performance and ROI</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads.toLocaleString()}
          icon={Users}
          trend="+12%"
          trendUp={true}
        />
        <KPICard
          title="Lead Conversion Rate"
          value={`${kpis.leadConversionRate.toFixed(1)}%`}
          icon={Target}
          trend="+2.3%"
          trendUp={true}
        />
        <KPICard
          title="Total Revenue"
          value={`$${(kpis.totalRevenue / 1000).toFixed(1)}k`}
          icon={DollarSign}
          trend="+18%"
          trendUp={true}
        />
        <KPICard
          title="CAC"
          value={`$${kpis.cac}`}
          icon={TrendingUp}
          trend="-5%"
          trendUp={true}
        />
        <KPICard
          title="LTV:CAC Ratio"
          value={kpis.ltvCacRatio.toFixed(1)}
          icon={TrendingUp}
          trend={kpis.ltvCacRatio > 3 ? 'Good' : 'Needs Improvement'}
          trendUp={kpis.ltvCacRatio > 3}
        />
        <KPICard
          title="ROI"
          value={`${kpis.roi.toFixed(0)}%`}
          icon={TrendingUp}
          trend="+25%"
          trendUp={true}
        />
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel.stages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {funnel.stages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
          <span className="text-sm text-gray-500 ml-2">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}
