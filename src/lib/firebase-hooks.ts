import { ref, onValue, push, set, update, remove, get } from "firebase/database";
import { db } from "./firebase";
import type { Category, Supplier, Item, StockMovement, Notification, UserSettings } from "./types";
import { useEffect, useState } from "react";

// Generic listener hook
function useFirebaseList<T extends { id: string }>(path: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbRef = ref(db, path);
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const items = Object.entries(val).map(([key, value]) => ({
          ...(value as object),
          id: key,
        })) as T[];
        setData(items);
      } else {
        setData([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [path]);

  return { data, loading };
}

// Categories
export function useCategories() {
  return useFirebaseList<Category>("categories");
}

export async function addCategory(name: string, userId: string) {
  const newRef = push(ref(db, "categories"));
  await set(newRef, { name, createdAt: Date.now(), createdBy: userId });
  return newRef.key;
}

export async function updateCategory(id: string, name: string) {
  await update(ref(db, `categories/${id}`), { name });
}

export async function deleteCategory(id: string) {
  await remove(ref(db, `categories/${id}`));
}

// Suppliers
export function useSuppliers() {
  return useFirebaseList<Supplier>("suppliers");
}

export async function addSupplier(data: Omit<Supplier, "id" | "createdAt">) {
  const newRef = push(ref(db, "suppliers"));
  await set(newRef, { ...data, createdAt: Date.now() });
  return newRef.key;
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
  await update(ref(db, `suppliers/${id}`), data);
}

export async function deleteSupplier(id: string) {
  await remove(ref(db, `suppliers/${id}`));
}

// Items
export function useItems() {
  return useFirebaseList<Item>("items");
}

export async function addItem(data: Omit<Item, "id">) {
  const newRef = push(ref(db, "items"));
  await set(newRef, data);
  return newRef.key;
}

export async function updateItem(id: string, data: Partial<Item>) {
  await update(ref(db, `items/${id}`), data);
}

export async function deleteItem(id: string) {
  await remove(ref(db, `items/${id}`));
}

// Stock Movements
export function useStockMovements() {
  return useFirebaseList<StockMovement>("stock_movements");
}

export async function addStockMovement(data: Omit<StockMovement, "id">) {
  // Get current item
  const itemSnap = await get(ref(db, `items/${data.itemId}`));
  if (!itemSnap.exists()) throw new Error("Item not found");
  const item = itemSnap.val() as Item;

  if (item.remaining < data.quantity) {
    throw new Error("Insufficient stock. Available: " + item.remaining);
  }

  const newRemaining = item.remaining - data.quantity;
  const newUsed = (item.quantityUsed || 0) + data.quantity;

  // Save movement
  const movRef = push(ref(db, "stock_movements"));
  await set(movRef, data);

  // Update item
  await update(ref(db, `items/${data.itemId}`), {
    remaining: newRemaining,
    quantityUsed: newUsed,
  });

  // Check low stock (45% threshold)
  const threshold = Math.ceil(item.quantityAdded * 0.25);
  if (newRemaining <= threshold) {
    const notifRef = push(ref(db, "notifications"));
    await set(notifRef, {
      itemId: data.itemId,
      itemName: item.name,
      message: `Low stock alert: ${item.name} has ${newRemaining} ${item.unitType} remaining (threshold: ${threshold})`,
      read: false,
      createdAt: Date.now(),
    });
  }

  return movRef.key;
}

// Notifications
export function useNotifications() {
  return useFirebaseList<Notification>("notifications");
}

export async function markNotificationRead(id: string) {
  await update(ref(db, `notifications/${id}`), { read: true });
}

export async function clearAllNotifications() {
  await remove(ref(db, "notifications"));
}

// Users list
export function useUsersList() {
  const [data, setData] = useState<Array<{ id: string; email: string; role: string; displayName: string; createdAt: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbRef = ref(db, "users");
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const users = Object.entries(val).map(([key, value]: [string, any]) => ({
          id: key,
          email: value.email || "",
          role: value.role || "standard",
          displayName: value.displayName || value.email || "",
          createdAt: value.createdAt || 0,
        }));
        setData(users);
      } else {
        setData([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { data, loading };
}

// User settings
export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const dbRef = ref(db, `user_settings/${userId}`);
    const unsub = onValue(dbRef, (snapshot) => {
      setSettings(snapshot.val() as UserSettings | null);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  return { settings, loading };
}

export async function updateUserSettings(userId: string, settings: UserSettings) {
  await set(ref(db, `user_settings/${userId}`), settings);
}
