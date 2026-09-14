import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';
import {
  notFoundHandler,
  errorHandler,
} from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

/** Lightweight liveness check, useful for Docker health checks. */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/products', productRoutes);

// Order matters: unmatched routes first, then the catch-all error handler.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;