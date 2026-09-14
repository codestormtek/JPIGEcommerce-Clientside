"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { apiAuthFetch, apiAuthGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Product = { id: string; name: string; description: string | null; comboSideCount: number; items: { price: number }[] };
type PickupSettings = {
  isOrderingOpen: boolean; eventName: string; streetAddress: string; asapWaitMinutes: number;
  taxRatePercent: number; menuProductIds: string[]; menu: { products: Product[] };
};

export default function PickupSettingsPage() {
  const [settings, setSettings] = useState<PickupSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const response = await apiAuthGet<{ data: PickupSettings }>("/pickup/admin/config");
      setSettings(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load pickup settings.");
    }
  };
  useEffect(() => { void load(); }, []);

  const update = <K extends keyof PickupSettings>(key: K, value: PickupSettings[K]) =>
    setSettings(current => current ? { ...current, [key]: value } : current);
  const toggleProduct = (id: string) => {
    if (!settings) return;
    update("menuProductIds", settings.menuProductIds.includes(id)
      ? settings.menuProductIds.filter(value => value !== id)
      : [...settings.menuProductIds, id]);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await apiAuthFetch<{ data: PickupSettings }>("/pickup/admin/config", {
        method: "PUT",
        body: {
          isOrderingOpen: settings.isOrderingOpen,
          eventName: settings.eventName,
          streetAddress: settings.streetAddress,
          asapWaitMinutes: Number(settings.asapWaitMinutes),
          taxRatePercent: Number(settings.taxRatePercent),
          menuProductIds: settings.menuProductIds,
        },
      });
      setSettings(response.data);
      setMessage("Pickup settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save pickup settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-8">{error || "Loading pickup settings…"}</div>;
  return <div className="mx-auto max-w-5xl space-y-7 p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-4xl font-bold">Phone Pickup</h1><p className="mt-2 text-muted-foreground">Configure the one active event/location used by <span className="font-mono">/pickup</span>.</p></div><Button variant="outline" onClick={() => void load()} disabled={saving}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    {error && <p role="alert" className="rounded border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
    {message && <p role="status" className="rounded border border-green-600/40 bg-green-50 p-3 text-green-800">{message}</p>}
    <form onSubmit={save} className="space-y-6">
      <Card><CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Ordering status</h2><p className="text-sm text-muted-foreground">Closing this immediately prevents new phone pickup checkouts.</p></div><label className="flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" checked={settings.isOrderingOpen} onChange={event => update("isOrderingOpen", event.target.checked)} className="h-5 w-5" />Open for orders</label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Event / location name<Input required value={settings.eventName} maxLength={120} onChange={event => update("eventName", event.target.value)} /></label><label className="text-sm font-medium">ASAP wait (minutes)<Input required type="number" min={1} max={240} value={settings.asapWaitMinutes} onChange={event => update("asapWaitMinutes", Number(event.target.value))} /></label></div>
        <label className="block text-sm font-medium">Street address<Input required value={settings.streetAddress} maxLength={300} onChange={event => update("streetAddress", event.target.value)} /></label>
        <label className="block max-w-xs text-sm font-medium">Sales tax rate (%)<Input required type="number" min={0} max={25} step="0.001" value={settings.taxRatePercent} onChange={event => update("taxRatePercent", Number(event.target.value))} /></label>
      </CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="text-xl font-bold">Available menu</h2><p className="mt-1 text-sm text-muted-foreground">Only selected in-stock food items appear on /pickup. Select combo meals and the sides customers can choose with them.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{settings.menu.products.map(product => <label key={product.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${settings.menuProductIds.includes(product.id) ? "border-primary bg-primary/5" : ""}`}><input type="checkbox" checked={settings.menuProductIds.includes(product.id)} onChange={() => toggleProduct(product.id)} className="mt-1 h-4 w-4" /><span><strong>{product.name}</strong><small className="mt-1 block text-muted-foreground">${(product.items[0]?.price ?? 0).toFixed(2)}{product.comboSideCount ? ` · includes ${product.comboSideCount} sides` : ""}</small>{product.description && <small className="mt-1 block text-muted-foreground">{product.description}</small>}</span></label>)}</div>{settings.menu.products.length === 0 && <p className="mt-5 text-muted-foreground">No in-stock kiosk menu items are currently available.</p>}</CardContent></Card>
      <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save pickup settings</Button></div>
    </form>
  </div>;
}