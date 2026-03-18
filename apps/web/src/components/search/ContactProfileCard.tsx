'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Phone,
  Linkedin,
  Building2,
  MapPin,
  MoreVertical,
  TrendingUp,
  Star,
  Calendar,
} from 'lucide-react';

interface ContactProfileCardProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailStatus: string;
    phone?: string;
    title?: string;
    seniority?: string;
    department?: string;
    linkedInUrl?: string;
    intentScore: number;
    buyingStage: string;
    enrichedAt?: string;
    company?: {
      id: string;
      name: string;
      domain?: string;
      industry?: string;
      employeeCount?: number;
      logo?: string;
    };
    tags?: string[];
  };
  onViewDetails?: (id: string) => void;
  onAddToList?: (id: string) => void;
  onSendEmail?: (email: string) => void;
}

export function ContactProfileCard({
  contact,
  onViewDetails,
  onAddToList,
  onSendEmail,
}: ContactProfileCardProps) {
  const getIntentColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
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

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">
                {contact.firstName} {contact.lastName}
              </h3>
              {contact.title && (
                <p className="text-sm text-muted-foreground">
                  {contact.title}
                  {contact.seniority && (
                    <span className="ml-1">• {contact.seniority}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">{contact.intentScore}</span>
              </div>
              <Badge variant={getStageBadgeVariant(contact.buyingStage)} className="text-xs">
                {contact.buyingStage}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(contact.id)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddToList?.(contact.id)}>
                  Add to List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Intent Score Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Intent Score</span>
            <span className="font-medium">{contact.intentScore}/100</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getIntentColor(contact.intentScore)} transition-all`}
              style={{ width: `${contact.intentScore}%` }}
            />
          </div>
        </div>

        {/* Company Info */}
        {contact.company && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.company.name}</p>
              <p className="text-sm text-muted-foreground">
                {contact.company.industry}
                {contact.company.employeeCount && (
                  <span> • {contact.company.employeeCount} employees</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Contact Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{contact.email}</span>
            {contact.emailStatus === 'verified' && (
              <Badge variant="outline" className="text-xs">Verified</Badge>
            )}
          </div>

          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{contact.phone}</span>
            </div>
          )}

          {contact.linkedInUrl && (
            <a
              href={contact.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn Profile</span>
            </a>
          )}
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onSendEmail?.(contact.email)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails?.(contact.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
