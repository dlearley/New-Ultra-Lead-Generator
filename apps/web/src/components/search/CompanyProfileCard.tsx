'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Globe,
  Users,
  DollarSign,
  MapPin,
  MoreVertical,
  TrendingUp,
  Layers,
  Target,
} from 'lucide-react';

interface CompanyProfileCardProps {
  company: {
    id: string;
    name: string;
    domain?: string;
    description?: string;
    industry?: string;
    subIndustry?: string;
    employeeCount?: number;
    employeeRange?: string;
    annualRevenue?: number;
    revenueRange?: string;
    fundingStage?: string;
    fundingAmount?: number;
    logo?: string;
    intentScore: number;
    buyingStage: string;
    headquarters?: {
      city?: string;
      state?: string;
      country?: string;
    };
    technologies?: string[];
    enrichedAt?: string;
  };
  onViewDetails?: (id: string) => void;
  onViewContacts?: (id: string) => void;
  onAddToList?: (id: string) => void;
}

export function CompanyProfileCard({
  company,
  onViewDetails,
  onViewContacts,
  onAddToList,
}: CompanyProfileCardProps) {
  const getIntentColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'purchase':
        return 'default';
      case 'decision':
        return 'secondary';
      case 'consideration':
        return 'outline';
      default:
        return 'ghost';
    }
  };

  const formatRevenue = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <Card className="w-full max-w-lg hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{company.name}</h3>
              {company.domain && (
                <a
                  href={`https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  {company.domain}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-1 font-bold ${getIntentColor(company.intentScore)}`}>
                <TrendingUp className="h-4 w-4" />
                {company.intentScore}
              </div>
              <Badge variant={getStageBadgeVariant(company.buyingStage)} className="text-xs">
                {company.buyingStage}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(company.id)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewContacts?.(company.id)}>
                  View Contacts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddToList?.(company.id)}>
                  Add to List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {company.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.description}
          </p>
        )}

        {/* Intent Score */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Intent Score</span>
            <span className="font-medium">{company.intentScore}/100</span>
          </div>
          <Progress value={company.intentScore} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-semibold">
              {company.employeeCount?.toLocaleString() || company.employeeRange || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Employees</p>
          </div>

          <div className="p-3 bg-muted rounded-lg text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-semibold">{formatRevenue(company.annualRevenue)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>

          <div className="p-3 bg-muted rounded-lg text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-semibold capitalize">{company.fundingStage || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Stage</p>
          </div>
        </div>

        {/* Industry & Location */}
        <div className="flex flex-wrap gap-2">
          {company.industry && (
            <Badge variant="secondary">{company.industry}</Badge>
          )}
          {company.subIndustry && company.subIndustry !== company.industry && (
            <Badge variant="outline">{company.subIndustry}</Badge>
          )}
          {company.headquarters?.city && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {company.headquarters.city}
              {company.headquarters.state && `, ${company.headquarters.state}`}
            </Badge>
          )}
        </div>

        {/* Technologies */}
        {company.technologies && company.technologies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>Tech Stack</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {company.technologies.slice(0, 5).map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {company.technologies.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{company.technologies.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onViewContacts?.(company.id)}
          >
            <Users className="h-4 w-4 mr-2" />
            View Contacts
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails?.(company.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
