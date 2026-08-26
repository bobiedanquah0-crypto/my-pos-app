import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://hihphgfrfvpmytasnmvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaHBoZ2ZyZnZwbXl0YXNubXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI1MTQsImV4cCI6MjEwMzI2ODUxNH0.FlogrIG1zX_cabM2c0IMeqRSvjvvcP2EAvCF7B47glg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function CheckoutScreen() {
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('pos_client_id') || 'LINAURA SCENTS';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('pos_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [cart, setCart] = useState([]);
  const [sales, setSales] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);

  const isSyncingRef = useRef(false);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');

  const fetchInventory = async (isBackground = false) => {
    if (!clientId) return;
    if (isBackground && isSyncingRef.current) return;

    try {
      const { data, error } = await supabase
        .from('Inventory')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      if (data) {
        if (!isBackground || !isSyncingRef.current) {
          setProducts(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch live inventory from Supabase:", error);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchInventory(false);
      const intervalId = setInterval(() => fetchInventory(true), 15000);
      return () => clearInterval(intervalId);
    }
  }, [clientId]);

  const addToCart = (product) => {
    const itemName = product["Item Name"];
    const itemPrice = Number(product.Price || 0);
    const itemStock = Number(product.Stock || 0);

    const cartItem = cart.find(item => item.id === product.id);
    const currentQtyInCart = cartItem ? cartItem.qty : 0;

    if (itemStock - currentQtyInCart <= 0) {
      alert('Sorry, this item is out of stock!');
      return;
    }

    if (cartItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, name: itemName, price: itemPrice, stock: itemStock, qty: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handlePrintReceipt = (completedCart, total, cashierName) => {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LINAURA SCENTS Receipt</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 58mm; margin: 0; padding: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; font-size: 11px; padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">LINAURA SCENTS</div>
          <div class="center">Tema, Ghana</div>
          <div class="line"></div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div>Cashier: ${cashierName}</div>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${completedCart.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="center">${item.qty}</td>
                  <td class="right">${(item.price * item.qty).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="bold" style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>TOTAL:</span>
            <span>GHC ${total.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="margin-top: 10px;">Thank you for shopping with us!</div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    isSyncingRef.current = true;

    const updatedProducts = products.map(prod => {
      const cartMatch = cart.find(item => item.id === prod.id);
      if (cartMatch) {
        return { ...prod, Stock: Math.max(0, Number(prod.Stock || 0) - Number(cartMatch.qty)) };
      }
      return prod;
    });
    
    setProducts(updatedProducts);

    const itemsSummaryString = cart.map(item => `${item.name} (Qty: ${item.qty})`).join(', ');
    const currentDate = new Date();
    const newSaleRecord = {
      client_id: clientId,
      timestamp: currentDate.toLocaleString(),
      cashier: currentUser?.fullName || 'Administrator',
      total_amount: totalAmount,
      items: itemsSummaryString
    };

    setSales([newSaleRecord, ...sales]);
    
    const activeCart = [...cart];
    const currentTotal = totalAmount;
    const cashierName = currentUser?.fullName || 'Administrator';

    setCart([]);
    setShowCartDrawer(false);

    handlePrintReceipt(activeCart, currentTotal, cashierName);
    alert(`Sale of GHC ${currentTotal.toFixed(2)} Completed Successfully!`);

    try {
      await supabase.from('Sales').insert([newSaleRecord]);

      for (const item of activeCart) {
        const matchingProduct = updatedProducts.find(p => p.id === item.id);
        if (matchingProduct) {
          await supabase
            .from('Inventory')
            .update({ Stock: matchingProduct.Stock })
            .eq('id', item.id)
            .eq('client_id', clientId);
        }
      }
    } catch (error) {
      console.error("Cloud sync to Supabase failed:", error);
    } finally {
      setTimeout(() => { isSyncingRef.current = false; }, 4000);
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice) {
      alert("Please provide product name and price.");
      return;
    }

    // Mapping payload keys to match exact Supabase column headers: "Iteam Name", Price, Stock
    const productPayload = {
      client_id: clientId,
      "Item Name": newName.trim(),
      Price: parseFloat(newPrice),
      Stock: parseInt(newStock) || 0
    };

    try {
      const { error } = await supabase
        .from('Inventory')
        .insert([productPayload]);

      if (error) throw error;

      alert("Product successfully added to LINAURA SCENTS inventory!");
      setNewName('');
      setNewPrice('');
      setNewStock('');
      setShowAddProduct(false);
      fetchInventory(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert(`Error saving product to cloud: ${error.message || JSON.stringify(error)}`);
    }
  };

  const filteredProducts = products.filter(p => 
    String(p["Item Name"] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', 
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80")',
      backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' 
    }}>
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', position: 'relative' }}>
        
        {/* Top Control Bar */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
          >
            ☰ Menu
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowCartDrawer(!showCartDrawer)}
              style={{ backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              🛒 Cart ({totalCartItemsCount})
            </button>

            {/* Cart Dropdown */}
            {showCartDrawer && (
              <div style={{ 
                position: 'absolute', top: '45px', right: '0', width: '300px', maxWidth: '85vw',
                backgroundColor: 'rgba(17, 24, 39, 0.96)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1050, padding: '16px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0', color: '#ffffff' }}>Cart Items</h4>
                  <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
                </div>

                {cart.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', margin: '10px 0' }}>Your cart is empty.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cart.map((item, index) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#f3f4f6', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '8px' }}>
                          <span style={{ fontWeight: '500' }}>{item.name}</span>
                          <span style={{ color: '#34d399', fontSize: '12px' }}>GHC {(item.price * item.qty).toFixed(2)} (x{item.qty})</span>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}

                {cart.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
                      <span>Total:</span>
                      <span style={{ color: '#34d399' }}>GHC {totalAmount.toFixed(2)}</span>
                    </div>
                    <button onClick={completeSale} style={{ backgroundColor: '#059669', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                      Complete Sale & Print
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Menu */}
        {isSidebarOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '280px', height: '100%', backgroundColor: 'rgba(17, 24, 39, 0.96)', zIndex: 1100, padding: '25px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>LINAURA SCENTS</h3>
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer' }}>&times;</button>
            </div>
            <button onClick={() => { fetchInventory(false); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>🔄 Refresh Inventory</button>
            <button onClick={() => { setShowAddProduct(!showAddProduct); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(37, 99, 235, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>➕ Add Product</button>
          </div>
        )}

        {/* Add Product View Form */}
        {showAddProduct ? (
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', padding: '20px', borderRadius: '12px', maxWidth: '400px', margin: '20px auto', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '15px' }}>Add New Product</h3>
            <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Product Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Luxury Oud" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Price (GHC)</label>
                <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Stock Quantity</label>
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="10" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddProduct(false)} style={{ flex: 1, backgroundColor: '#4b5563', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        ) : (
          /* Main Product Catalog Grid */
          <div>
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search Linaura products..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.85)', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(8px)', 
                    border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '12px', 
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 6px 0', fontWeight: 'bold'}}>{product["Iteam Name"]}</h4>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ color: '#34d399', fontSize: '14px', fontWeight: 'bold' }}>GHC {Number(product.Price || 0).toFixed(2)}</div>
                      <div style={{ color: '#9ca3af', fontSize: '11px' }}>Stock: {product.Stock ?? 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}