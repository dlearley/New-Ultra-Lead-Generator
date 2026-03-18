'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Building2,
  Target,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DashboardProps {
  data: {
    totalContacts: number;
    totalCompanies: number;
    highIntentCount: number;
    intentDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    signalsToday: number;
    signalsThisWeek: number;
    avgIntentScore: number;
    intentTrend: Array<{
      date: string;
      avgScore: number;
      signalCount: number;
    }>;
    signalsByType: Record<string, number>;
    topContacts: Array<{
      id: string;
      name: string;
      company: string;
      intentScore: number;
      lastActivity: string;
    }>;
  };
}

const COLORS = ['#22c55e', '#eab308', '#6b7280'];

export function IntentDashboard({ data }: DashboardProps) {
  const intentData = [
    { name: 'High (70-100)', value: data.intentDistribution.high, color: '#22c55e' },
    { name: 'Medium (40-69)', value: data.intentDistribution.medium, color: '#eab308' },
    { name: 'Low (0-39)', value: data.intentDistribution.low, color: '#6b7280' },
  ];

  const signalTypeData = Object.entries(data.signalsByType).map(([type, count]) => ({
    type: type.replace(/_/g, ' '),
    count,
  }));

  const trendData = data.intentTrend.map((t) => ({
    ...t,
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalContacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {data.totalCompanies} companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Intent Prospects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.highIntentCount}</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {((data.highIntentCount / data.totalContacts) * 100).toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Signals Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.signalsToday}</div>
            <p className="text-xs text-muted-foreground">{data.signalsThisWeek} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Intent Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgIntentScore}/100</div>
            <Progress value={data.avgIntentScore} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Intent Distribution</CardTitle>
            <CardDescription>Breakdown by intent score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {intentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {intentData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intent Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Intent Trend (7 Days)</CardTitle>
            <CardDescription>Average intent score over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal Types & Top Prospects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Types */}
        <Card>
          <CardHeader>
            <CardTitle>Signals by Type</CardTitle>
            <CardDescription>Breakdown of intent signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signalTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Prospects */}
        <Card>
          <CardHeader>
            <CardTitle>Top Prospects</CardTitle>
            <CardDescription>Highest intent score contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={contact.intentScore >= 70 ? 'default' : 'secondary'}
                      className="text-lg"
                    >
                      {contact.intentScore}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
