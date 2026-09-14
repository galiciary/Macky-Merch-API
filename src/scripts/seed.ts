import db from '../config/db';
import * as productModel from '../models/product.model';

const products = [
  { name: 'LSCS Varsity Jacket', price: 1899, stock: 20, category: 'Clothing', size: 'M' },
  { name: 'LSCS Classic Tee', price: 449.5, stock: 80, category: 'Clothing', size: 'L' },
  { name: 'Macky Plush Keychain', price: 199, stock: 150, category: 'Accessories' },
  { name: 'LSCS Tote Bag', price: 349, stock: 60, category: 'Accessories' },
  { name: 'Systems Committee Lanyard', price: 129, stock: 0, category: 'Accessories', isAvailable: false },
];

db.exec('DELETE FROM products');
products.forEach((p) => productModel.create(p));

console.log(`Seeded ${products.length} products.`);