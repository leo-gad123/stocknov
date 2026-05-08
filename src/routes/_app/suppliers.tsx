import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuppliers, addSupplier, updateSupplier, deleteSupplier } from "@/lib/firebase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Truck, Phone, Mail, MapPin } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const { isAdmin } = useAuth();
  const { data: suppliers, loading } = useSuppliers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">You don't have permission to manage suppliers.</p></div>;
  }

  const openNew = () => { setEditingId(null); setForm({ name: "", phone: "", email: "", address: "" }); setDialogOpen(true); };
  const openEdit = (s: any) => { setEditingId(s.id); setForm({ name: s.name, phone: s.phone, email: s.email || "", address: s.address }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateSupplier(editingId, { name: form.name, phone: form.phone, email: form.email || undefined, address: form.address });
      } else {
        await addSupplier({ name: form.name, phone: form.phone, email: form.email || undefined, address: form.address });
      }
      setDialogOpen(false);
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (confirm("Delete this supplier?")) await deleteSupplier(id); };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Suppliers</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No suppliers yet.</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/15">
                <Truck className="h-5 w-5 text-chart-2" />
              </div>
              <p className="min-w-[140px] font-semibold text-foreground">{s.name}</p>
              <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{s.phone}</span>
                {s.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{s.email}</span>}
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.address}</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Address *</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !form.name.trim() || !form.phone.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
