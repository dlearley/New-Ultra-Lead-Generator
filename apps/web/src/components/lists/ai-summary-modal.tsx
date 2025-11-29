"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  X, 
  Brain, 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb,
  MapPin,
  Building,
  BarChart3,
  Zap
} from "lucide-react";
import { LeadList, AISummary } from "@/types/lead-lists";

interface AISummaryModalProps {
  list: LeadList;
  isOpen: boolean;
  onClose: () => void;
}

export function AISummaryModal({ list, isOpen, onClose }: AISummaryModalProps) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock AI summary - replace with actual API call
  const generateSummary = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSummary: AISummary = {
        listId: list.id,
        totalProspects: list.size,
        averageScore: list.aiMetrics.averageScore,
        topIndustries: [
          { industry: "Technology", count: 45 },
          { industry: "Healthcare", count: 32 },
          { industry: "Finance", count: 28 },
          { industry: "Manufacturing", count: 21 }
        ],
        geographicDistribution: [
          { location: "New York, NY", count: 38 },
          { location: "San Francisco, CA", count: 31 },
          { location: "Chicago, IL", count: 24 },
          { location: "Austin, TX", count: 18 }
        ],
        recommendedActions: [
          "Focus on Technology sector prospects - they show 23% higher engagement rates",
          "Prioritize companies in New York and San Francisco for Q4 outreach",
          "Consider personalized messaging for Healthcare prospects based on compliance needs",
          "Schedule follow-ups for prospects with scores > 7.5 within 48 hours"
        ],
        outreachReadiness: {
          ready: list.aiMetrics.outreachReadyCount,
          needsResearch: Math.floor(list.size * 0.3),
          lowPriority: Math.floor(list.size * 0.15)
        }
      };

      setSummary(mockSummary);
    } catch (error) {
      console.error("Failed to generate AI summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !summary) {
      generateSummary();
    }
  }, [isOpen]);

  const getReadinessColor = (type: string) => {
    const colors = {
      ready: "bg-green-100 text-green-800",
      needsResearch: "bg-yellow-100 text-yellow-800",
      lowPriority: "bg-gray-100 text-gray-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getReadinessIcon = (type: string) => {
    const icons = {
      ready: <Zap className="w-4 h-4" />,
      needsResearch: <Brain className="w-4 h-4" />,
      lowPriority: <Users className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Users className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Powered List Summary
              </DialogTitle>
              <p className="text-sm text-zinc-500 mt-1">
                Intelligent insights and recommendations for "{list.name}"
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Brain className="w-12 h-12 text-zinc-300 mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
              Analyzing your list...
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300">
              AI is processing {list.size} prospects to generate insights
            </p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-zinc-600">Total Prospects</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.totalProspects.toLocaleString()}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-zinc-600">Avg Score</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.averageScore.toFixed(1)}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-zinc-600">Ready for Outreach</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.outreachReadiness.ready}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-zinc-600">High Potential</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {list.aiMetrics.highPotentialCount}
                </div>
              </Card>
            </div>

            {/* Outreach Readiness */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Outreach Readiness Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(summary.outreachReadiness).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getReadinessIcon(type)}
                      <span className="font-medium capitalize">
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{count}</span>
                      <Badge className={getReadinessColor(type)}>
                        {((count / summary.totalProspects) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Industries */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Top Industries
              </h3>
              <div className="space-y-3">
                {summary.topIndustries.map((industry, index) => (
                  <div key={industry.industry} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-500 w-6">#{index + 1}</span>
                      <span className="font-medium">{industry.industry}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600">{industry.count} prospects</span>
                      <Badge variant="secondary">
                        {((industry.count / summary.totalProspects) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Geographic Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Geographic Distribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.geographicDistribution.map((location) => (
                  <div key={location.location} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{location.location}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600">{location.count} prospects</span>
                      <Badge variant="outline">
                        {((location.count / summary.totalProspects) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Recommendations */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI Recommendations
              </h3>
              <div className="space-y-3">
                {summary.recommendedActions.map((action, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{action}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={generateSummary} variant="outline">
                <Brain className="w-4 h-4 mr-2" />
                Regenerate Summary
              </Button>
              <Button>
                <Target className="w-4 h-4 mr-2" />
                Start Outreach Campaign
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}