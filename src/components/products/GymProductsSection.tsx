'use client';
import { ProductShelf } from '../ui/skincare-product-shelf';
import { gymProducts } from './products';
import './products.css';

export default function GymProductsSection() {
  return <section id="products" className="nexus-products" aria-labelledby="products-title">
    <ProductShelf products={gymProducts} />
  </section>;
}
