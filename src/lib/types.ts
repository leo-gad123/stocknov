export interface Category {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  supplies?: string;
  createdAt: number;
}

export type UnitType = "kg" | "liters" | "pieces";
export type ClothingSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  supplierId: string;
  quantityAdded: number;
  quantityUsed: number;
  remaining: number;
  unitType: UnitType;
  size?: string | null;
  notes?: string | null;
  dateAdded: number;
  createdBy: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  quantity: number;
  notes?: string | null;
  takenBy: string;
  createdAt: number;
  createdBy: string;
}

export interface Notification {
  id: string;
  itemId: string;
  itemName: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface UserSettings {
  stockJournalStartDate?: number;
  stockJournalEndDate?: number;
}