'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Plus, Trash2, Loader2 } from 'lucide-react';

interface SecuritySettings {
  ipWhitelistEnabled: boolean;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  passwordPolicy: 'basic' | 'strong' | 'enterprise';
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
}

interface IPWhitelistEntry {
  id: string;
  ipPattern: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export function SecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [ipWhitelist, setIpWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIP, setNewIP] = useState({ ipPattern: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, whitelistRes] = await Promise.all([
        fetch('/api/security/settings'),
        fetch('/api/security/ip-whitelist'),
      ]);

      setSettings(await settingsRes.json());
      setIpWhitelist(await whitelistRes.json());
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<SecuritySettings>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setSettings({ ...settings!, ...updates });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const addIP = async () => {
    if (!newIP.ipPattern) return;

    try {
      const response = await fetch('/api/security/ip-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIP),
      });

      if (response.ok) {
        setNewIP({ ipPattern: '', description: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add IP:', error);
    }
  };

  const removeIP = async (id: string) => {
    try {
      await fetch(`/api/security/ip-whitelist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to remove IP:', error);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-500 mt-1">Manage your organization's security policies</p>
      </div>

      {/* IP Whitelist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IP Whitelist
              </CardTitle>
              <CardDescription>
                Restrict access to specific IP addresses
              </CardDescription>
            </div>
            <Switch
              checked={settings.ipWhitelistEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ ipWhitelistEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>IP Address / Pattern</Label>
              <Input
                placeholder="192.168.1.0/24 or 10.0.0.*"
                value={newIP.ipPattern}
                onChange={(e) => setNewIP({ ...newIP, ipPattern: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label>Description</Label>
              <Input
                placeholder="Office Network"
                value={newIP.description}
                onChange={(e) => setNewIP({ ...newIP, description: e.target.value })}
              />
            </div>
            <Button onClick={addIP} className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Pattern</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ipWhitelist.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono">{entry.ipPattern}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIP(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>Configure session timeout and MFA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Session Timeout (minutes)</Label>
              <p className="text-sm text-gray-500">
                Automatically log out inactive users
              </p>
            </div>
            <Input
              type="number"
              className="w-32"
              value={settings.sessionTimeoutMinutes}
              onChange={(e) =>
                updateSettings({ sessionTimeoutMinutes: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require MFA</Label>
              <p className="text-sm text-gray-500">
                Enforce multi-factor authentication for all users
              </p>
            </div>
            <Switch
              checked={settings.mfaRequired}
              onCheckedChange={(checked) =>
                updateSettings({ mfaRequired: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>Set password complexity requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Policy Level</Label>
            <Select
              value={settings.passwordPolicy}
              onValueChange={(value: any) =>
                updateSettings({ passwordPolicy: value })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (8+ chars)</SelectItem>
                <SelectItem value="strong">Strong (12+ chars)</SelectItem>
                <SelectItem value="enterprise">Enterprise (16+ chars)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
