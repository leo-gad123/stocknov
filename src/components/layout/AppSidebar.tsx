import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Truck,
  ArrowDownUp,
  FileText,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/firebase-hooks";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/items", label: "Items", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck, adminOnly: true },
  { to: "/stock-movement", label: "Stock Movement", icon: ArrowDownUp },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const { data: notifications } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNav = navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin);

  const isActive = (path: string) => location.pathname === path;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Package className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <h1 className="truncate text-sm font-semibold text-sidebar-foreground">StockNova</h1>
            <p className="truncate text-xs text-sidebar-foreground/60">Inventory</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden text-sidebar-foreground/60 hover:text-sidebar-foreground lg:block"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {filteredNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.to)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {item.label === "Dashboard" && unreadCount > 0 && !collapsed && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-low-stock px-1.5 text-[10px] font-semibold text-low-stock-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-3 rounded-md px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {(user?.displayName || user?.email || "U")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.displayName || user?.email}
              </p>
              <p className="truncate text-xs capitalize text-sidebar-foreground/50">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-primary p-2 text-primary-foreground shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30" />
          <div
            className="absolute inset-y-0 left-0 w-64 bg-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block shrink-0 bg-sidebar transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
