import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Bell,
  ArrowDownUp,
} from "lucide-react";
import { useItems, useCategories, useSuppliers, useNotifications, useStockMovements, markNotificationRead } from "@/lib/firebase-hooks";
import { format } from "date-fns";

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
    const threshold = Math.ceil(item.quantityAdded * 0.45);
    return item.remaining <= threshold;
  });

  const unreadNotifs = notifications.filter((n) => !n.read);
  const recentMovements = [...movements].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const stats = [
    { label: "Total Items", value: items.length, icon: Package, color: "text-primary" },
    { label: "Low Stock", value: lowStockItems.length, icon: AlertTriangle, color: "text-low-stock" },
    { label: "Categories", value: categories.length, icon: Package, color: "text-chart-2" },
    { label: "Suppliers", value: suppliers.length, icon: Package, color: "text-chart-3" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Items */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-low-stock" />
            Low Stock Items
          </h2>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">All items are sufficiently stocked.</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => {
                const threshold = Math.ceil(item.quantityAdded * 0.45);
                const pct = Math.round((item.remaining / item.quantityAdded) * 100);
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.remaining} / {item.quantityAdded} {item.unitType}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="stock-badge-low">{pct}% left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Bell className="h-5 w-5 text-warning" />
            Notifications
            {unreadNotifs.length > 0 && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-low-stock px-1.5 text-[10px] font-semibold text-low-stock-foreground">
                {unreadNotifs.length}
              </span>
            )}
          </h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...notifications]
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 10)
                .map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${
                      notif.read ? "opacity-60" : "bg-warning/10"
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div className="flex-1">
                      <p className="text-foreground">{notif.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(notif.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Movements */}
      <div className="mt-6 rounded-lg border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <ArrowDownUp className="h-5 w-5 text-primary" />
          Recent Stock Movements
        </h2>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock movements recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Taken By</th>
                <th>Notes</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((mov) => {
                const item = items.find((i) => i.id === mov.itemId);
                return (
                  <tr key={mov.id}>
                    <td className="font-medium">{item?.name || "Unknown"}</td>
                    <td>{mov.quantity}</td>
                    <td>{mov.takenBy}</td>
                    <td className="text-muted-foreground">{mov.notes || "—"}</td>
                    <td className="text-muted-foreground">{format(new Date(mov.createdAt), "MMM d, HH:mm")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
