/**
 * SQLite has no native boolean type, so isAvailable comes back as 0 or 1.
 */
export interface ProductRow {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  size: string | null;
  isAvailable: number;
  imageUrl: string | null;
  createdAt: string;
}

/**
 * The shape the API exposes to clients, wherein isAvailable is a real boolean.
 */
export interface Product extends Omit<ProductRow, 'isAvailable'> {
  isAvailable: boolean;
}

/**
 * Maps a database row to the API representation.
 */
export function toProduct(row: ProductRow): Product {
  return { ...row, isAvailable: Boolean(row.isAvailable) };
}