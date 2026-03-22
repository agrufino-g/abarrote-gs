import { db } from '../../src/db';
import { products } from '../../src/db/schema';

async function main() {
  const allProducts = await db.select().from(products);
  console.log('--- PRODUCT DATA ---');
  allProducts.forEach(p => {
    console.log(`ID: ${p.id} | SKU: ${p.sku} | Name: ${p.name} | Image: ${p.imageUrl || 'NULL'}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
