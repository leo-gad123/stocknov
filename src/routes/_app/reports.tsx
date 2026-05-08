import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useItems, useCategories, useSuppliers, useStockMovements } from "@/lib/firebase-hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type ReportType = "daily" | "weekly" | "monthly";

function ReportsPage() {
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: movements } = useStockMovements();

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown";
  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "Unknown";

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const now = new Date();
      let dateRange = "";
      let rangeStart: Date;
      let rangeEnd: Date;

      if (reportType === "daily") {
        rangeStart = startOfDay(now);
        rangeEnd = endOfDay(now);
        dateRange = format(now, "MMMM d, yyyy");
      } else if (reportType === "weekly") {
        rangeStart = startOfWeek(now, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(now, { weekStartsOn: 1 });
        dateRange = `${format(rangeStart, "MMM d")} - ${format(rangeEnd, "MMM d, yyyy")}`;
      } else {
        rangeStart = startOfMonth(now);
        rangeEnd = endOfMonth(now);
        dateRange = format(now, "MMMM yyyy");
      }

      const filteredItems = categoryFilter === "all"
        ? items
        : items.filter((i) => i.categoryId === categoryFilter);

      const filteredMovements = movements.filter(
        (m) => m.createdAt >= rangeStart.getTime() && m.createdAt <= rangeEnd.getTime()
      );

      // Header
      doc.setFillColor(40, 55, 85);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("StockManager", 14, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Stock Report`, 14, 24);
      doc.text(`Period: ${dateRange}`, 14, 30);
      doc.text(`Generated: ${format(now, "MMM d, yyyy HH:mm")}`, 210 - 14, 30, { align: "right" });

      let yPos = 45;

      // Category title if filtered
      if (categoryFilter !== "all") {
        doc.setTextColor(40, 55, 85);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Category: ${getCategoryName(categoryFilter)}`, 14, yPos);
        yPos += 10;
      }

      // Items Table
      doc.setTextColor(40, 55, 85);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Inventory Items", 14, yPos);
      yPos += 6;

      const tableData = filteredItems.map((item) => {
        const threshold = Math.ceil(item.quantityAdded * 0.25);
        return [
          item.name,
          getSupplierName(item.supplierId),
          String(item.quantityAdded),
          String(item.quantityUsed),
          String(item.remaining),
          item.unitType,
          item.size || "—",
          item.remaining <= threshold ? "LOW" : "OK",
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Item", "Supplier", "Added", "Used", "Remaining", "Unit", "Size", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [40, 55, 85], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 7: { fontStyle: "bold" } },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 7 && data.cell.raw === "LOW") {
            data.cell.styles.textColor = [200, 60, 40];
          }
        },
      });

      // Summary for weekly/monthly
      if (reportType !== "daily") {
        const finalY = (doc as any).lastAutoTable?.finalY || yPos + 20;
        let summaryY = finalY + 15;

        if (summaryY > 250) {
          doc.addPage();
          summaryY = 20;
        }

        doc.setTextColor(40, 55, 85);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", 14, summaryY);
        summaryY += 8;

        const totalItems = filteredItems.length;
        const lowStockItems = filteredItems.filter((i) => i.remaining <= Math.ceil(i.quantityAdded * 0.25)).length;
        const totalAdded = filteredItems.reduce((sum, i) => sum + i.quantityAdded, 0);
        const totalUsed = filteredItems.reduce((sum, i) => sum + i.quantityUsed, 0);
        const totalRemaining = filteredItems.reduce((sum, i) => sum + i.remaining, 0);
        const periodMovements = filteredMovements.filter((m) =>
          filteredItems.some((i) => i.id === m.itemId)
        );
        const periodUsed = periodMovements.reduce((sum, m) => sum + m.quantity, 0);

        const summaryData = [
          ["Total Items", String(totalItems)],
          ["Low Stock Items", String(lowStockItems)],
          ["Total Quantity Added", String(totalAdded)],
          ["Total Quantity Used", String(totalUsed)],
          ["Total Remaining", String(totalRemaining)],
          [`Movements This ${reportType === "weekly" ? "Week" : "Month"}`, String(periodMovements.length)],
          [`Qty Used This ${reportType === "weekly" ? "Week" : "Month"}`, String(periodUsed)],
        ];

        autoTable(doc, {
          startY: summaryY,
          body: summaryData,
          theme: "plain",
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 80 },
            1: { halign: "right" as const },
          },
        });

        // Category breakdown
        const breakdownY = (doc as any).lastAutoTable?.finalY || summaryY + 40;
        let catY = breakdownY + 10;

        if (catY > 250) { doc.addPage(); catY = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 55, 85);
        doc.text("Category Breakdown", 14, catY);
        catY += 6;

        const catBreakdown = categories.map((cat) => {
          const catItems = filteredItems.filter((i) => i.categoryId === cat.id);
          const catLow = catItems.filter((i) => i.remaining <= Math.ceil(i.quantityAdded * 0.25)).length;
          return [cat.name, String(catItems.length), String(catLow), String(catItems.reduce((s, i) => s + i.remaining, 0))];
        }).filter((row) => row[1] !== "0");

        if (catBreakdown.length > 0) {
          autoTable(doc, {
            startY: catY,
            head: [["Category", "Items", "Low Stock", "Total Remaining"]],
            body: catBreakdown,
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
        doc.text("StockManager Report", 14, 290);
      }

      doc.save(`stock-report-${reportType}-${format(now, "yyyy-MM-dd")}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Generate Report
            </h2>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (no summary)</SelectItem>
                  <SelectItem value="weekly">Weekly (with summary)</SelectItem>
                  <SelectItem value="monthly">Monthly (with summary)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category Filter</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={generatePDF} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4" /> Download PDF</>}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Report Preview</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="stat-card text-center">
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-semibold">{categoryFilter === "all" ? items.length : items.filter((i) => i.categoryId === categoryFilter).length}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-semibold text-low-stock">
                    {(categoryFilter === "all" ? items : items.filter((i) => i.categoryId === categoryFilter))
                      .filter((i) => i.remaining <= Math.ceil(i.quantityAdded * 0.25)).length}
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-semibold">
                    {(categoryFilter === "all" ? items : items.filter((i) => i.categoryId === categoryFilter))
                      .reduce((s, i) => s + i.remaining, 0)}
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-sm text-muted-foreground">Movements</p>
                  <p className="text-2xl font-semibold">{movements.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
