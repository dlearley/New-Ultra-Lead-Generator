"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Users, 
  Calendar, 
  Tag,
  Download,
  Trash2,
  User,
  TrendingUp
} from "lucide-react";
import { LeadList, CreateListRequest } from "@/types/lead-lists";
import { CreateListModal } from "@/components/lists/create-list-modal";
import { ListDetailsDrawer } from "@/components/lists/list-details-drawer";

export default function ListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<LeadList | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockLists: LeadList[] = [
      {
        id: "1",
        name: "Q4 Enterprise Targets",
        description: "High-value enterprise accounts for Q4 outreach",
        size: 156,
        ownerId: "user1",
        ownerName: "Sarah Chen",
        createdAt: "2024-11-15T10:30:00Z",
        updatedAt: "2024-11-20T14:22:00Z",
        tags: ["enterprise", "Q4", "high-value"],
        isPublic: false,
        aiMetrics: {
          averageScore: 8.5,
          highPotentialCount: 89,
          outreachReadyCount: 134
        }
      },
      {
        id: "2",
        name: "Tech Startups NYC",
        description: "Series A+ tech companies in New York metro area",
        size: 78,
        ownerId: "user2",
        ownerName: "Mike Johnson",
        createdAt: "2024-11-10T09:15:00Z",
        updatedAt: "2024-11-18T16:45:00Z",
        tags: ["tech", "startups", "NYC"],
        isPublic: true,
        aiMetrics: {
          averageScore: 7.2,
          highPotentialCount: 45,
          outreachReadyCount: 62
        }
      },
      {
        id: "3",
        name: "Healthcare Providers Midwest",
        description: "Healthcare systems and clinics in Midwest region",
        size: 234,
        ownerId: "user1",
        ownerName: "Sarah Chen",
        createdAt: "2024-11-05T13:20:00Z",
        updatedAt: "2024-11-19T11:30:00Z",
        tags: ["healthcare", "midwest", "B2B"],
        isPublic: false,
        aiMetrics: {
          averageScore: 6.8,
          highPotentialCount: 112,
          outreachReadyCount: 178
        }
      }
    ];

    setTimeout(() => {
      setLists(mockLists);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateList = async (data: CreateListRequest) => {
    // Mock API call - replace with actual implementation
    const newList: LeadList = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      size: data.prospectIds?.length || 0,
      ownerId: "current-user",
      ownerName: "Current User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      isPublic: data.isPublic,
      aiMetrics: {
        averageScore: 0,
        highPotentialCount: 0,
        outreachReadyCount: 0
      }
    };

    setLists(prev => [newList, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteList = async (listId: string) => {
    if (confirm("Are you sure you want to delete this list?")) {
      setLists(prev => prev.filter(list => list.id !== listId));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Lead Lists
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mt-2">
            Manage and organize your prospect lists for targeted outreach
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create List
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLists.map((list) => (
          <Card key={list.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {list.name}
                  </h3>
                  {list.isPublic && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                  {list.description}
                </p>

                <div className="flex items-center gap-6 text-sm text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{list.size} prospects</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{list.ownerName}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {formatDate(list.updatedAt)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Avg Score: {list.aiMetrics.averageScore.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {list.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedList(list)}
                >
                  View Details
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteList(list.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredLists.length === 0 && (
        <div className="text-center py-12">
          <div className="text-zinc-400 mb-4">
            <Users className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
            No lists found
          </h3>
          <p className="text-zinc-600 dark:text-zinc-300 mb-4">
            {searchQuery ? "Try adjusting your search terms" : "Create your first list to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          )}
        </div>
      )}

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateList}
      />

      {selectedList && (
        <ListDetailsDrawer
          list={selectedList}
          isOpen={!!selectedList}
          onClose={() => setSelectedList(null)}
        />
      )}
    </div>
  );
}