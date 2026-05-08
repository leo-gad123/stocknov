import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  AlertTriangle,
  Bell,
  ArrowDownUp,
  BarChart3,
} from "lucide-react";
import { useItems, useCategories, useSuppliers, useNotifications, useStockMovements, markNotificationRead } from "@/lib/firebase-hooks";
import { format } from "date-fns";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: notifications } = useNotifications();
  const { data: movements } = useStockMovements();

  const lowStockItems = items.filter((item) => {
    const threshold = Math.ceil(item.quantityAdded * 0.25);
    return item.remaining <= threshold;
  });

  const unreadNotifs = notifications.filter((n) => !n.read);
  const recentMovements = [...movements].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  // Group remaining quantity by unit type
  const totalByUnit = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      map.set(item.unitType, (map.get(item.unitType) || 0) + item.remaining);
    });
    return Array.from(map.entries()).map(([unit, qty]) => `${qty} ${unit}`).join(" • ");
  }, [items]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    return categories.map((cat) => {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      const total = catItems.reduce((s, i) => s + i.remaining, 0);
      return { name: cat.name, total };
    }).filter((c) => c.total > 0);
  }, [categories, items]);

  const maxCategoryValue = Math.max(...categoryChartData.map((c) => c.total), 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Stock levels at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Items</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{items.length}</p>
            </div>
            <Package className="h-8 w-8 text-primary opacity-80" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Low Stock Items (≤25%)</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-low-stock opacity-80" />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Bar Chart */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Stock quantity by category</h2>
          {categoryChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {categoryChartData.map((cat) => (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    <span className="text-muted-foreground">{cat.total}</span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary transition-all duration-500"
                      style={{ width: `${(cat.total / maxCategoryValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Overview */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Items overview</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Remaining</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const threshold = Math.ceil(item.quantityAdded * 0.25);
                    const isLow = item.remaining <= threshold;
                    return (
                      <tr key={item.id} className={isLow ? "bg-low-stock/5" : ""}>
                        <td className="font-medium">
                          {item.name}
                          {isLow && (
                            <span className="stock-badge-low ml-2 text-[10px]">Low</span>
                          )}
                        </td>
                        <td className="text-right">{item.remaining}</td>
                        <td>{item.unitType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Recent Stock Movements */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            Recent Stock Movements
          </h2>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Taken By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((mov) => {
                    const item = items.find((i) => i.id === mov.itemId);
                    return (
                      <tr key={mov.id}>
                        <td className="font-medium">{item?.name || "Unknown"}</td>
                        <td>{mov.quantity} {item?.unitType}</td>
                        <td>{mov.takenBy}</td>
                        <td className="text-muted-foreground">{format(new Date(mov.createdAt), "MMM d, HH:mm")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="mt-6 rounded-lg border border-low-stock/30 bg-low-stock/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-low-stock">
            <AlertTriangle className="h-5 w-5" />
            Low stock alerts (≤ 25% of added)
          </h2>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => {
              const threshold = Math.ceil(item.quantityAdded * 0.25);
              return (
                <span key={item.id} className="inline-flex items-center rounded-full border border-low-stock/30 bg-card px-3 py-1.5 text-sm">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="mx-1 text-muted-foreground">—</span>
                  <span className="text-foreground">{item.remaining} {item.unitType} left</span>
                  <span className="ml-1 text-xs text-muted-foreground">(threshold {threshold})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      {unreadNotifs.length > 0 && (
        <div className="mt-6 rounded-lg border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Bell className="h-5 w-5 text-warning" />
            Notifications
            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-low-stock px-1.5 text-[10px] font-semibold text-low-stock-foreground">
              {unreadNotifs.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...notifications]
              .sort((a, b) => b.createdAt - a.createdAt)
              .filter((n) => !n.read)
              .slice(0, 5)
              .map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 rounded-md bg-warning/10 px-3 py-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="flex-1">
                    <p className="text-foreground">{notif.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{format(new Date(notif.createdAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <button onClick={() => markNotificationRead(notif.id)} className="text-xs text-primary hover:underline">Mark read</button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
