import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useItems, useCategories, useSuppliers, addItem, updateItem, deleteItem, addCategory } from "@/lib/firebase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UnitType } from "@/lib/types";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/items")({
  component: ItemsPage,
});

const UNIT_TYPES: UnitType[] = ["kg", "liters", "pieces"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function ItemsPage() {
  const { user, isAdmin } = useAuth();
  const { data: items, loading } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    supplierId: "",
    quantityAdded: 0,
    unitType: "pieces" as UnitType,
    size: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && item.categoryId !== filterCategory) return false;
    if (filterSupplier !== "all" && item.supplierId !== filterSupplier) return false;
    if (filterStock === "low") {
      const threshold = Math.ceil(item.quantityAdded * 0.25);
      if (item.remaining > threshold) return false;
    }
    return true;
  });

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      supplierId: item.supplierId,
      quantityAdded: item.quantityAdded,
      unitType: item.unitType,
      size: item.size || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    setForm({ name: "", categoryId: "", supplierId: "", quantityAdded: 0, unitType: "pieces", size: "", notes: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateItem(editingItem.id, {
          name: form.name,
          categoryId: form.categoryId,
          supplierId: form.supplierId,
          quantityAdded: form.quantityAdded,
          unitType: form.unitType,
          size: form.size || null,
          notes: form.notes || null,
          remaining: form.quantityAdded - (editingItem.quantityUsed || 0),
        });
      } else {
        await addItem({
          name: form.name,
          categoryId: form.categoryId,
          supplierId: form.supplierId,
          quantityAdded: form.quantityAdded,
          quantityUsed: 0,
          remaining: form.quantityAdded,
          unitType: form.unitType,
          size: form.size || null,
          notes: form.notes || null,
          dateAdded: Date.now(),
          createdBy: user.uid,
        });
      }
      setDialogOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem(id);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    const key = await addCategory(newCategoryName.trim(), user.uid);
    if (key) {
      setForm((f) => ({ ...f, categoryId: key }));
      setNewCategoryName("");
      setShowNewCategory(false);
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "—";
  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "—";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Items</h1>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Added</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Unit</th>
              <th>Size</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">No items found</td></tr>
            ) : (
              filtered.map((item) => {
                const threshold = Math.ceil(item.quantityAdded * 0.25);
                const isLow = item.remaining <= threshold;
                return (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{getCategoryName(item.categoryId)}</td>
                    <td>{getSupplierName(item.supplierId)}</td>
                    <td>{item.quantityAdded}</td>
                    <td>{item.quantityUsed}</td>
                    <td className="font-semibold">{item.remaining}</td>
                    <td>{item.unitType}</td>
                    <td>{item.size || "—"}</td>
                    <td>
                      <span className={isLow ? "stock-badge-low" : "stock-badge-ok"}>
                        {isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowNewCategory(!showNewCategory)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showNewCategory && (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddCategory}>Add</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity Added</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantityAdded}
                  onChange={(e) => setForm((f) => ({ ...f, quantityAdded: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Type</Label>
                <Select value={form.unitType} onValueChange={(v) => setForm((f) => ({ ...f, unitType: v as UnitType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Size (optional - for uniforms/clothing/shoes)</Label>
              <Input
                placeholder="e.g. XS, S, M, L, XL, XXL or shoe number"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving || !form.name || !form.categoryId || !form.supplierId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
