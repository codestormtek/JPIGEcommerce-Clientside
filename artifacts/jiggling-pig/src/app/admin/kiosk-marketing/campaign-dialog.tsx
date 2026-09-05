import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateKioskCampaign, useUpdateKioskCampaign, KioskCampaign } from "@/hooks/use-kiosk-campaigns";
import { useMediaAssets, useProducts } from "@/hooks/use-assets";
import { ImageUploader } from "./image-uploader";

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  campaignType: z.enum(["upsell", "post_sale_ad"]),
  isActive: z.boolean(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  priority: z.coerce.number().int().default(0),
  amountOff: z.coerce.number().positive().optional().nullable(),
  mediaAssetId: z.string().optional().nullable(),
  durationSeconds: z.coerce.number().int().min(1).default(10),
  allKiosks: z.boolean().default(true),
  productIds: z.array(z.string()).default([]),
}).superRefine((val, ctx) => {
  if (val.startsAt && val.endsAt && new Date(val.endsAt) <= new Date(val.startsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'End time must be after the start time',
    });
  }
  if (val.campaignType === 'upsell') {
    if (!val.amountOff) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountOff'], message: 'Upsell campaigns require a discount amount' });
    }
    if (val.isActive && (!val.productIds || val.productIds.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productIds'], message: 'Active upsell campaigns require at least one product' });
    }
  }
  if (val.campaignType === 'post_sale_ad' && !val.mediaAssetId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mediaAssetId'], message: 'Post-sale ads require an image media asset' });
  }
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function CampaignDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: KioskCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!campaign;
  const createMutation = useCreateKioskCampaign();
  const updateMutation = useUpdateKioskCampaign();
  
  const { data: mediaAssets } = useMediaAssets();
  const { data: products } = useProducts();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      title: "",
      body: "",
      campaignType: "upsell",
      isActive: false,
      startsAt: null,
      endsAt: null,
      priority: 0,
      amountOff: null,
      mediaAssetId: null,
      durationSeconds: 10,
      allKiosks: true,
      productIds: [],
    },
  });

  const campaignType = form.watch("campaignType");
  const selectedProductIds = form.watch("productIds") || [];

  useEffect(() => {
    if (open && campaign) {
      form.reset({
        name: campaign.name,
        description: campaign.description || "",
        title: campaign.title || "",
        body: campaign.body || "",
        campaignType: campaign.campaignType,
        isActive: campaign.isActive,
        startsAt: campaign.startsAt ? new Date(campaign.startsAt).toISOString().slice(0, 16) : null,
        endsAt: campaign.endsAt ? new Date(campaign.endsAt).toISOString().slice(0, 16) : null,
        priority: campaign.priority,
        amountOff: campaign.amountOff,
        mediaAssetId: campaign.mediaAssetId,
        durationSeconds: campaign.durationSeconds,
        allKiosks: campaign.allKiosks,
        productIds: campaign.products.map(p => p.id),
      });
    } else if (open && !campaign) {
      form.reset({
        name: "",
        description: "",
        title: "",
        body: "",
        campaignType: "upsell",
        isActive: false,
        startsAt: null,
        endsAt: null,
        priority: 0,
        amountOff: null,
        mediaAssetId: null,
        durationSeconds: 10,
        allKiosks: true,
        productIds: [],
      });
    }
  }, [open, campaign, form]);

  const onSubmit = async (values: CampaignFormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      title: values.title || null,
      body: values.body || null,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
      mediaAssetId: values.mediaAssetId || null,
      amountOff: values.amountOff || null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: campaign.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl uppercase tracking-wider">{isEditing ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          <DialogDescription>
            Configure how this campaign appears on the kiosk.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Internal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Summer Drink Upsell" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaignType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upsell">Checkout Upsell</SelectItem>
                        <SelectItem value="post_sale_ad">Post-Sale Ad</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Turn on to broadcast to kiosks immediately (if within schedule).
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Leave blank to start as soon as it is activated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Leave blank to keep running until deactivated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {campaignType === 'upsell' && (
              <div className="space-y-4 border p-4 rounded-lg bg-card/50">
                <h3 className="font-bold uppercase text-primary tracking-wide">Upsell Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amountOff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (Higher runs first)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <FormLabel>Target Products</FormLabel>
                  <FormDescription>Select the products this upsell applies to.</FormDescription>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                    {products?.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-surface rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded border-primary text-primary focus:ring-primary"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              form.setValue("productIds", [...selectedProductIds, p.id], { shouldValidate: true });
                            } else {
                              form.setValue("productIds", selectedProductIds.filter(id => id !== p.id), { shouldValidate: true });
                            }
                          }}
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                    {!products?.length && <div className="text-muted-foreground p-2">No products found</div>}
                  </div>
                  {form.formState.errors.productIds?.message && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.productIds.message}</p>
                  )}
                </div>
              </div>
            )}

            {campaignType === 'post_sale_ad' && (
              <div className="space-y-4 border p-4 rounded-lg bg-card/50">
                <h3 className="font-bold uppercase text-primary tracking-wide">Post-Sale Ad Configuration</h3>
                
                <FormField
                  control={form.control}
                  name="mediaAssetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graphic Asset</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select image asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mediaAssets?.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                <div className="flex items-center gap-2">
                                  <img src={m.url} alt="" className="w-6 h-6 object-cover rounded" />
                                  <span className="truncate max-w-[200px]">{m.altText || m.url.split('/').pop()}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ImageUploader onUploadComplete={(id) => form.setValue("mediaAssetId", id, { shouldValidate: true })} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-muted-foreground tracking-wide text-sm">Customer Copy</h3>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Thirsty?" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Add an iced tea now and save $1." {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="uppercase font-bold tracking-wide">
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
