import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCategories, addCategory, updateCategory, deleteCategory } from "@/lib/firebase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { user, isAdmin } = useAuth();
  const { data: categories, loading } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You don't have permission to manage categories.</p>
      </div>
    );
  }

  const openNew = () => { setEditingId(null); setName(""); setDialogOpen(true); };
  const openEdit = (cat: any) => { setEditingId(cat.id); setName(cat.name); setDialogOpen(true); };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const duplicate = categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== editingId);
    if (duplicate) { alert("Category already exists"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, name.trim());
      } else {
        await addCategory(name.trim(), user.uid);
      }
      setDialogOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this category?")) await deleteCategory(id);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Add Category</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">No categories yet. Add your first category.</div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="stat-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">Created {format(new Date(cat.createdAt), "MMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Supplies" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
