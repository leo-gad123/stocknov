import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useItems, useStockMovements, addStockMovement } from "@/lib/firebase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, ArrowDownUp, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/stock-movement")({
  component: StockMovementPage,
});

function StockMovementPage() {
  const { user } = useAuth();
  const { data: items } = useItems();
  const { data: movements, loading } = useStockMovements();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ itemId: "", quantity: 0, notes: "", takenBy: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sorted = [...movements].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = sorted.filter((m) => {
    if (!search) return true;
    const item = items.find((i) => i.id === m.itemId);
    const term = search.toLowerCase();
    return (item?.name.toLowerCase().includes(term)) || m.takenBy.toLowerCase().includes(term);
  });

  const handleSubmit = async () => {
    if (!user || !form.itemId || !form.quantity || !form.takenBy.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addStockMovement({
        itemId: form.itemId,
        quantity: form.quantity,
        notes: form.notes || undefined,
        takenBy: form.takenBy.trim(),
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      setDialogOpen(false);
      setForm({ itemId: "", quantity: 0, notes: "", takenBy: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Movement</h1>
        <Button onClick={() => { setError(""); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Record Stock Out
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by item or person..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Taken By</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No movements recorded</td></tr>
            ) : (
              filtered.map((mov) => {
                const item = items.find((i) => i.id === mov.itemId);
                return (
                  <tr key={mov.id}>
                    <td className="font-medium">{item?.name || "Unknown"}</td>
                    <td>{mov.quantity} {item?.unitType}</td>
                    <td>{mov.takenBy}</td>
                    <td className="text-muted-foreground">{mov.notes || "—"}</td>
                    <td className="text-muted-foreground">{format(new Date(mov.createdAt), "MMM d, yyyy HH:mm")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Stock Out</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={form.itemId} onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.remaining} {item.unitType} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min={1} value={form.quantity || ""} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Taken By *</Label>
              <Input value={form.takenBy} onChange={(e) => setForm((f) => ({ ...f, takenBy: e.target.value }))} placeholder="Name of person" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.itemId || !form.quantity || !form.takenBy.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Movement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
