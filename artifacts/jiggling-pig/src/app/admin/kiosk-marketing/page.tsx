"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Calendar, Target, Image as ImageIcon, MonitorSmartphone, CheckCircle2, XCircle, BadgePercent } from "lucide-react";
import { useKioskCampaigns, useDeleteKioskCampaign, KioskCampaign } from "@/hooks/use-kiosk-campaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CampaignDialog from "./campaign-dialog";

export default function KioskMarketingPage() {
  const { data: campaigns, isLoading } = useKioskCampaigns();
  const deleteCampaign = useDeleteKioskCampaign();
  const [editingCampaign, setEditingCampaign] = useState<KioskCampaign | null | undefined>(undefined);

  const activeCampaigns = campaigns?.filter(c => c.isActive) || [];
  const inactiveCampaigns = campaigns?.filter(c => !c.isActive) || [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground">Kiosk Marketing</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage upsells and post-sale ads across all kiosk devices.</p>
        </div>
        <Button 
          onClick={() => setEditingCampaign(null)} 
          size="lg" 
          className="uppercase tracking-wide font-bold"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground font-medium uppercase tracking-widest">
          Loading campaigns...
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Campaigns */}
          <section>
            <h2 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-3 text-primary">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              Live Now
            </h2>
            {activeCampaigns.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <MonitorSmartphone className="w-12 h-12 mb-4 opacity-20" />
                  <p>No active campaigns running on kiosks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => setEditingCampaign(campaign)}
                    onDelete={() => {
                      if (confirm("Are you sure you want to delete this campaign?")) {
                        deleteCampaign.mutate(campaign.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Inactive Campaigns */}
          <section>
            <h2 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-3 text-muted-foreground">
              <span className="w-3 h-3 rounded-full bg-muted-foreground" />
              Scheduled & Drafts
            </h2>
            {inactiveCampaigns.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center italic">No inactive campaigns.</p>
            ) : (
              <div className="grid gap-4">
                {inactiveCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => setEditingCampaign(campaign)}
                    onDelete={() => {
                      if (confirm("Are you sure you want to delete this campaign?")) {
                        deleteCampaign.mutate(campaign.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {editingCampaign !== undefined && (
        <CampaignDialog
          campaign={editingCampaign}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingCampaign(undefined);
          }}
        />
      )}
    </div>
  );
}

function CampaignCard({ 
  campaign, 
  onEdit, 
  onDelete 
}: { 
  campaign: KioskCampaign; 
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  const isUpsell = campaign.campaignType === 'upsell';
  
  return (
    <Card className="overflow-hidden transition-colors hover:border-primary/50 group relative bg-card/50 backdrop-blur">
      <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
        {/* Media visual column */}
        {campaign.imageUrl ? (
          <div className="w-full md:w-48 bg-muted shrink-0 relative overflow-hidden">
            <img 
              src={campaign.imageUrl} 
              alt={campaign.name} 
              className="w-full h-full object-cover absolute inset-0"
            />
          </div>
        ) : (
          <div className="w-full md:w-48 bg-surface-2 shrink-0 flex items-center justify-center border-r border-border">
            <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Content column */}
        <div className="flex-1 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={isUpsell ? "default" : "secondary"} className="uppercase font-bold tracking-wider text-xs">
                  {isUpsell ? 'Upsell Offer' : 'Post-Sale Ad'}
                </Badge>
                {campaign.priority > 0 && (
                  <Badge variant="outline" className="uppercase font-bold tracking-wider text-xs border-primary text-primary">
                    High Priority
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-foreground">{campaign.name}</h3>
              {campaign.description && (
                <p className="text-muted-foreground mt-1">{campaign.description}</p>
              )}
            </div>

            <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-auto pt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm border-t border-border">
            {isUpsell && campaign.amountOff && (
              <div className="flex items-center gap-2 text-primary font-bold">
                <BadgePercent className="w-4 h-4" />
                ${campaign.amountOff.toFixed(2)} OFF
              </div>
            )}
            
            {campaign.startsAt || campaign.endsAt ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {campaign.startsAt ? format(new Date(campaign.startsAt), 'MMM d') : 'Now'} 
                {' - '} 
                {campaign.endsAt ? format(new Date(campaign.endsAt), 'MMM d') : 'Forever'}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Runs indefinitely
              </div>
            )}

            {!isUpsell && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                Shows for {campaign.durationSeconds}s
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
