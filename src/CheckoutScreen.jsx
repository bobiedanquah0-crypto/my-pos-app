import React, { useState } from 'react';
import linaImage from './lina.jpg';

export default function CheckoutScreen({ products = [], onEditProduct, onDeleteProduct, onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Flexible filter supporting multiple possible keys for product names
  const filteredProducts = Array.isArray(products) ? products.filter(p => {
    const itemName = p["Items Name"] || p.Name || p.title || p.name || '';
    return String(itemName).toLowerCase().includes(searchQuery.toLowerCase());
  }) : [];

  return (
    <div style={{
      backgroundImage: `linear-gradient(135deg, #02060E 0%, #C50337 100%), url(${linaImage})`,
      backgroundBlendMode: 'overlay',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      width: '100vw',
      boxSizing: 'border-box'
    }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', position: 'relative' }}>
        
        {/* Top Bar / Search */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <input 
            type="text"
            placeholder="Search Linaura products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(197, 3, 55, 0.4)',
              background: 'rgba(2, 6, 14, 0.85)',
              color: '#fff',
              fontSize: '15px',
              outline: 'none'
            }}
          />
        </div>

        {/* Centered Product Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'stretch',
          padding: '10px 0',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => {
              const isHovered = hoveredIndex === index;
              const productName = product["Items Name"] || product.Name || product.title || product.name || 'Unnamed Product';
              const productPrice = product.Price || product.price || '0.00';
              const productStock = product.Stock !== undefined ? product.Stock : (product.stock || '0');
              const productImage = product.image || product.img || product.imageUrl;

              return (
                <div 
                  key={index}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    background: 'rgba(2, 6, 14, 0.85)',
                    border: '1px solid rgba(197, 3, 55, 0.4)',
                    borderRadius: '12px',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    boxShadow: isHovered ? '0 8px 25px rgba(197, 3, 55, 0.4)' : 'none'
                  }}
                >
                  {/* Product Image Area */}
                  <div style={{
                    background: '#02060E',
                    borderRadius: '8px',
                    height: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden'
                  }}>
                    {productImage ? (
                      <img 
                        src={productImage} 
                        alt={productName} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ color: '#aaa', fontSize: '13px' }}>Product Image</span>
                    )}
                  </div>

                  {/* Product Details */}
                  <h3 style={{ color: '#fff', fontSize: '16px', margin: '5px 0 0 0' }}>
                    {productName}
                  </h3>
                  <div style={{ color: '#C50337', fontWeight: 'bold', fontSize: '15px' }}>
                    GHC {productPrice}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '13px' }}>
                    Stock: {productStock}
                  </div>

                  {/* Add to Cart Button */}
                  <button 
                    onClick={() => onAddToCart && onAddToCart(product)}
                    style={{
                      background: '#C50337',
                      color: '#fff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    Add to Cart
                  </button>

                  {/* Edit & Delete Buttons (Appears only on Hover) */}
                  {isHovered && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '5px'
                    }}>
                      <button 
                        onClick={() => onEditProduct && onEditProduct(product)}
                        style={{
                          flex: 1,
                          background: '#334155',
                          color: '#fff',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => onDeleteProduct && onDeleteProduct(productName)}
                        style={{
                          flex: 1,
                          background: '#7f1d1d',
                          color: '#fff',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', gridColumn: '1 / -1', padding: '40px' }}>
              No products found.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}