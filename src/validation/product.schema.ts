import { z } from 'zod';

/**
 * Shared field definitions for create and update to stay in sync.
 */
const productFields = {
  name: z.string().trim().min(1, 'name must be a non-empty string'),
  price: z.number().positive('price must be a positive number'),
  stock: z
    .number()
    .int('stock must be an integer')
    .nonnegative('stock cannot be negative'),
  category: z.string().trim().min(1, 'category must be a non-empty string'),
  size: z.string().trim().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl: z.url('imageUrl must be a valid url').nullable().optional(),
};

/** POST /api/products; all required fields must be present. */
export const createProductSchema = z.strictObject(productFields);

/** PUT /api/products/:id — any subset, but not an empty body. */
export const updateProductSchema = z
  .strictObject(productFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'request body must contain at least one field to update',
  });

/** Route param :id; arrives as a string, coerced to a positive integer. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('id must be a positive integer'),
});

/** ?page= & ?limit= query params for pagination. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;