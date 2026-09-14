import db from '../config/db';
import { ProductRow, Product, toProduct } from '../types/product.types';
import {
  CreateProductInput,
  UpdateProductInput,
} from '../validation/product.schema';

/** Kept in one place so every query returns the same shape. */
const COLUMNS =
  'id, name, price, stock, category, size, isAvailable, imageUrl, createdAt';

export interface PaginatedProducts {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/*
 * Statements are prepared once at startup and reused on every request,
 * so SQLite only parses and plans each query a single time.
 */
const selectPageStmt = db.prepare(
  `SELECT ${COLUMNS} FROM products ORDER BY id LIMIT ? OFFSET ?`
);
const countStmt = db.prepare('SELECT COUNT(*) AS count FROM products');
const selectByIdStmt = db.prepare(
  `SELECT ${COLUMNS} FROM products WHERE id = ?`
);
const insertStmt = db.prepare(`
  INSERT INTO products (name, price, stock, category, size, isAvailable, imageUrl)
  VALUES (@name, @price, @stock, @category, @size, @isAvailable, @imageUrl)
`);
const deleteStmt = db.prepare('DELETE FROM products WHERE id = ?');

export function findAll(page: number, limit: number): PaginatedProducts {
  const offset = (page - 1) * limit;
  const rows = selectPageStmt.all(limit, offset) as ProductRow[];
  const { count } = countStmt.get() as { count: number };

  return {
    data: rows.map(toProduct),
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit),
  };
}

export function findById(id: number): Product | null {
  const row = selectByIdStmt.get(id) as ProductRow | undefined;
  return row ? toProduct(row) : null;
}

export function create(input: CreateProductInput): Product {
  const result = insertStmt.run({
    name: input.name,
    price: input.price,
    stock: input.stock,
    category: input.category,
    size: input.size ?? null,
    // SQLite has no boolean type, so booleans are stored as 0 / 1
    isAvailable: input.isAvailable === undefined ? 1 : Number(input.isAvailable),
    imageUrl: input.imageUrl ?? null,
  });

  return findById(Number(result.lastInsertRowid)) as Product;
}

export function update(id: number, input: UpdateProductInput): Product | null {
  const existing = findById(id);
  if (!existing) return null;

  const assignments: string[] = [];
  const values: Record<string, string | number | null> = { id };

  // Column names come from the Zod strict schema, which rejects any key
  // that is not a known column — so building the SET clause dynamically
  // here cannot be used for SQL injection. Values stay parameterised.
  for (const [key, value] of Object.entries(input)) {
    assignments.push(`${key} = @${key}`);
    values[key] =
      typeof value === 'boolean'
        ? Number(value)
        : (value as string | number | null);
  }

  if (assignments.length === 0) return existing;

  db.prepare(
    `UPDATE products SET ${assignments.join(', ')} WHERE id = @id`
  ).run(values);

  return findById(id);
}

export function remove(id: number): boolean {
  return deleteStmt.run(id).changes > 0;
}