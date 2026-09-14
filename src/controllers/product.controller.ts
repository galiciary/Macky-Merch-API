import { Request, Response, NextFunction } from 'express';
import * as productModel from '../models/product.model';
import { ApiError } from '../utils/ApiError';
import {
  CreateProductInput,
  UpdateProductInput,
  PaginationQuery,
} from '../validation/product.schema';

/**
 * GET /api/products
 *
 * Always responds with a top-level array, as the spec requires.
 * Pagination metadata travels in response headers so the body shape
 * stays consistent whether or not the client paginates.
 */
export function getAllProducts(_req: Request, res: Response): void {
  const { page, limit } = res.locals.query as PaginationQuery;

  if (page === undefined && limit === undefined) {
    const products = productModel.findEvery();
    res.setHeader('X-Total-Count', products.length);
    res.status(200).json(products);
    return;
  }

  const result = productModel.findAll(page ?? 1, limit ?? 10);
  res.setHeader('X-Total-Count', result.total);
  res.setHeader('X-Page', result.page);
  res.setHeader('X-Limit', result.limit);
  res.setHeader('X-Total-Pages', result.totalPages);
  res.status(200).json(result.data);
}

/** GET /api/products/:id */
export function getProductById(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const { id } = res.locals.params as { id: number };
  const product = productModel.findById(id);

  if (!product) {
    next(ApiError.notFound(`Product with id ${id} not found`));
    return;
  }

  res.status(200).json(product);
}

/** POST /api/products */
export function createProduct(_req: Request, res: Response): void {
  const input = res.locals.body as CreateProductInput;
  const product = productModel.create(input);
  res.status(201).json(product);
}

/** PUT /api/products/:id */
export function updateProduct(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const { id } = res.locals.params as { id: number };
  const input = res.locals.body as UpdateProductInput;
  const updated = productModel.update(id, input);

  if (!updated) {
    next(ApiError.notFound(`Product with id ${id} not found`));
    return;
  }

  res.status(200).json(updated);
}

/** DELETE /api/products/:id */
export function deleteProduct(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const { id } = res.locals.params as { id: number };

  if (!productModel.remove(id)) {
    next(ApiError.notFound(`Product with id ${id} not found`));
    return;
  }

  res.status(200).json({ message: 'Product deleted successfully.' });
}