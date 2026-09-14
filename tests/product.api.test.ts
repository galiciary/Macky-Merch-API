import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../src/config/db';

const validProduct = {
  name: 'LSCS Hoodie',
  price: 899.5,
  stock: 25,
  category: 'Clothing',
  size: 'M',
};

/** Each test starts from an empty table so tests never depend on order. */
beforeEach(() => {
  db.exec('DELETE FROM products');
});

/** Helper: inserts a product through the API and returns the created body. */
async function seedProduct(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/products')
    .send({ ...validProduct, ...overrides });
  return res.body;
}

describe('GET /api/products', () => {
  it('returns 200 and an empty array when no products exist', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('returns every product created so far', async () => {
    await seedProduct({ name: 'Tee' });
    await seedProduct({ name: 'Tote' });

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual([
      'Tee',
      'Tote',
    ]);
  });

  it('paginates and reports metadata in headers when page and limit are given', async () => {
    await seedProduct({ name: 'One' });
    await seedProduct({ name: 'Two' });
    await seedProduct({ name: 'Three' });

    const res = await request(app).get('/api/products?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.headers['x-total-count']).toBe('3');
    expect(res.headers['x-total-pages']).toBe('2');
  });
});

describe('POST /api/products', () => {
  it('creates a product and returns 201 with the persisted record', async () => {
    const res = await request(app).post('/api/products').send(validProduct);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(validProduct);
    expect(res.body.id).toBeTypeOf('number');
  });

  it('converts the stored integer flag back into a real boolean', async () => {
    const res = await request(app).post('/api/products').send(validProduct);

    // SQLite stores this as 1, but the API must not leak that detail
    expect(res.body.isAvailable).toBe(true);
  });

  it('returns 400 and lists every failure when required fields are missing', async () => {
    const res = await request(app).post('/api/products').send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');

    const fields = res.body.error.details.map(
      (d: { field: string }) => d.field
    );
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'price', 'stock', 'category'])
    );
  });

  it('rejects a negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ ...validProduct, price: -1 });

    expect(res.status).toBe(400);
  });

  it('rejects unknown fields instead of silently ignoring them', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ ...validProduct, sneakyField: 'nope' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product when it exists', async () => {
    const created = await seedProduct();

    const res = await request(app).get(`/api/products/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).get('/api/products/9999');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('not found');
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/products/abc');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('updates only the fields provided and leaves the rest untouched', async () => {
    const created = await seedProduct();

    const res = await request(app)
      .put(`/api/products/${created.id}`)
      .send({ stock: 5 });

    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(5);
    expect(res.body.name).toBe(created.name);
    expect(res.body.price).toBe(created.price);
  });

  it('returns 404 when updating a product that does not exist', async () => {
    const res = await request(app).put('/api/products/9999').send({ stock: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an empty request body', async () => {
    const created = await seedProduct();

    const res = await request(app)
      .put(`/api/products/${created.id}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid data', async () => {
    const created = await seedProduct();

    const res = await request(app)
      .put(`/api/products/${created.id}`)
      .send({ price: 0 });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/products/:id', () => {
  it('deletes the product and makes it unreachable afterwards', async () => {
    const created = await seedProduct();

    const res = await request(app).delete(`/api/products/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product deleted successfully.');

    const followUp = await request(app).get(`/api/products/${created.id}`);
    expect(followUp.status).toBe(404);
  });

  it('returns 404 when deleting a product that does not exist', async () => {
    const res = await request(app).delete('/api/products/9999');

    expect(res.status).toBe(404);
  });
});

describe('error handling', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
  });
});