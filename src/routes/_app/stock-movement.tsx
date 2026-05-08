import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useItems, useCategories, useSuppliers, useStockMovements, addStockMovement } from "@/lib/firebase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Search, Download, FileText } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/stock-movement")({
  component: StockMovementPage,
});

function StockMovementPage() {
  const { user } = useAuth();
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: movements, loading } = useStockMovements();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ itemId: "", quantity: 0, notes: "", takenBy: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [takenByOpen, setTakenByOpen] = useState(false);
  const [takenBySearch, setTakenBySearch] = useState("");

  // Unique list of previous "taken by" names
  const previousTakers = useMemo(() => {
    const names = new Set<string>();
    movements.forEach((m) => { if (m.takenBy?.trim()) names.add(m.takenBy.trim()); });
    return Array.from(names).sort();
  }, [movements]);

  const filteredTakers = previousTakers.filter((name) =>
    name.toLowerCase().includes(takenBySearch.toLowerCase())
  );

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
        notes: form.notes || null,
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

  const getItemName = (id: string) => items.find((i) => i.id === id)?.name || "Unknown";
  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "Unknown";
  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown";

  const generateReport = (type: "daily" | "weekly" | "monthly") => {
    const doc = new jsPDF();
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;
    let dateRange: string;

    if (type === "daily") {
      rangeStart = startOfDay(now);
      rangeEnd = endOfDay(now);
      dateRange = format(now, "MMMM d, yyyy");
    } else if (type === "weekly") {
      rangeStart = startOfWeek(now, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
      dateRange = `${format(rangeStart, "MMM d")} - ${format(rangeEnd, "MMM d, yyyy")}`;
    } else {
      rangeStart = startOfMonth(now);
      rangeEnd = endOfMonth(now);
      dateRange = format(now, "MMMM yyyy");
    }

    const periodMovements = movements.filter(
      (m) => m.createdAt >= rangeStart.getTime() && m.createdAt <= rangeEnd.getTime()
    );

    // Header
    doc.setFillColor(40, 55, 85);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("StockNova", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Stock Movement Report`, 14, 24);
    doc.text(`Period: ${dateRange}`, 14, 30);
    doc.text(`Generated: ${format(now, "MMM d, yyyy HH:mm")}`, 210 - 14, 30, { align: "right" });

    let yPos = 45;

    // Summary stats
    doc.setTextColor(40, 55, 85);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, yPos);
    yPos += 8;

    const totalQty = periodMovements.reduce((s, m) => s + m.quantity, 0);
    autoTable(doc, {
      startY: yPos,
      body: [
        ["Total Movements", String(periodMovements.length)],
        ["Total Quantity Used", String(totalQty)],
        ["Report Period", dateRange],
      ],
      theme: "plain",
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" as const } },
    });

    // Movements table
    const movY = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 55, 85);
    doc.text("Movement Details", 14, movY);

    const tableData = periodMovements
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((m) => {
        const item = items.find((i) => i.id === m.itemId);
        return [
          item?.name || "Unknown",
          String(m.quantity) + " " + (item?.unitType || ""),
          m.takenBy,
          m.notes || "—",
          format(new Date(m.createdAt), "MMM d, yyyy HH:mm"),
        ];
      });

    autoTable(doc, {
      startY: movY + 6,
      head: [["Item", "Quantity", "Taken By", "Notes", "Date"]],
      body: tableData.length > 0 ? tableData : [["No movements in this period", "", "", "", ""]],
      theme: "striped",
      headStyles: { fillColor: [40, 55, 85], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    // Items summary
    if (periodMovements.length > 0) {
      const itemSummary = new Map<string, number>();
      periodMovements.forEach((m) => {
        itemSummary.set(m.itemId, (itemSummary.get(m.itemId) || 0) + m.quantity);
      });

      const summaryY = (doc as any).lastAutoTable?.finalY + 10;
      if (summaryY < 250) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 55, 85);
        doc.text("Usage by Item", 14, summaryY);

        const summaryData = Array.from(itemSummary.entries()).map(([itemId, qty]) => {
          const item = items.find((i) => i.id === itemId);
          return [item?.name || "Unknown", String(qty) + " " + (item?.unitType || ""), String(item?.remaining || 0)];
        });

        autoTable(doc, {
          startY: summaryY + 6,
          head: [["Item", "Total Used", "Current Remaining"]],
          body: summaryData,
          theme: "striped",
          headStyles: { fillColor: [40, 55, 85], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
        });
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 210 / 2, 290, { align: "center" });
    }

    doc.save(`stock-movement-${type}-${format(now, "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Movement</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => generateReport("daily")}>
            <Download className="h-4 w-4" /> Daily
          </Button>
          <Button variant="outline" size="sm" onClick={() => generateReport("weekly")}>
            <Download className="h-4 w-4" /> Weekly
          </Button>
          <Button variant="outline" size="sm" onClick={() => generateReport("monthly")}>
            <Download className="h-4 w-4" /> Monthly
          </Button>
          <Button onClick={() => { setError(""); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Record Stock Out
          </Button>
        </div>
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
              <div className="relative">
                <Input
                  value={form.takenBy}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, takenBy: e.target.value }));
                    setTakenByOpen(true);
                    setTakenBySearch(e.target.value);
                  }}
                  onFocus={() => { setTakenByOpen(true); setTakenBySearch(form.takenBy); }}
                  onBlur={() => setTimeout(() => setTakenByOpen(false), 150)}
                  placeholder="Type or select a name"
                  autoComplete="off"
                />
                {takenByOpen && filteredTakers.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredTakers.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm((f) => ({ ...f, takenBy: name }));
                          setTakenByOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
