import { Router } from 'express';
import * as controller from '../controllers/product.controller';
import { validate } from '../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  paginationSchema,
} from '../validation/product.schema';

const router = Router();

router.get('/', validate(paginationSchema, 'query'), controller.getAllProducts);

router.post('/', validate(createProductSchema), controller.createProduct);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  controller.getProductById
);

router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateProductSchema),
  controller.updateProduct
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  controller.deleteProduct
);

export default router;