import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import linaImage from './lina.jpg';

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

  const [accounts, setAccounts] = useState([]);
  const [loginPin, setLoginPin] = useState('');
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('cashier');
  const [newAccountPin, setNewAccountPin] = useState('');

  const [cart, setCart] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  const isSyncingRef = useRef(false);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');

  const fetchAccounts = async () => {
    const defaultAdmin = { 
      id: 'default-admin', 
      fullName: 'Administrator', 
      role: 'admin', 
      pin: '1234', 
      client_id: clientId 
    };

    try {
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;

      const otherAccounts = data ? data.filter(acc => acc.role !== 'admin' && acc.fullName.toLowerCase() !== 'administrator') : [];
      setAccounts([defaultAdmin, ...otherAccounts]);

    } catch (err) {
      console.error("Error fetching accounts:", err);
      setAccounts([defaultAdmin]);
    }
  };

  const fetchInventory = async (isBackground = false) => {
    if (!clientId) return;
    if (isBackground && isSyncingRef.current) return;

    try {
      const { data, error } = await supabase
        .from('Inventory')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      if (data && (!isBackground || !isSyncingRef.current)) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch live inventory from Supabase:", error);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('Sales')
        .select('*')
        .ilike('client_id', clientId)
        .order('Timestamp', { ascending: false });

      if (error) throw error;
      if (data) setSalesHistory(data);
    } catch (error) {
      console.error("Error fetching sales history:", error);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchAccounts();
      fetchInventory(false);
      const intervalId = setInterval(() => fetchInventory(true), 15000);
      return () => clearInterval(intervalId);
    }
  }, [clientId]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedAccountForLogin) {
      alert("Please select an account first.");
      return;
    }

    if (selectedAccountForLogin.pin && selectedAccountForLogin.pin !== loginPin) {
      alert("Incorrect PIN code!");
      return;
    }

    setCurrentUser(selectedAccountForLogin);
    localStorage.setItem('pos_current_user', JSON.stringify(selectedAccountForLogin));
    setLoginPin('');
    setSelectedAccountForLogin(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pos_current_user');
    setIsSidebarOpen(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName || !newAccountPin) {
      alert("Please fill in the account name and PIN.");
      return;
    }

    const accountPayload = {
      client_id: clientId,
      fullName: newAccountName.trim(),
      role: newAccountRole,
      pin: newAccountPin.trim()
    };

    try {
      const { error } = await supabase.from('Users').insert([accountPayload]);
      if (error) throw error;

      alert(`Account for "${newAccountName}" created successfully!`);
      setNewAccountName('');
      setNewAccountPin('');
      fetchAccounts();
    } catch (err) {
      console.error("Error creating user account:", err);
      alert(`Error creating account: Make sure the 'Users' table exists in Supabase. Details: ${err.message}`);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111827', color: '#fff', fontFamily: 'sans-serif', padding: '20px' }}>
        <div style={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '20px' }}>LINAURA SCENTS - Login</h2>
          
          {!selectedAccountForLogin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', margin: '0 0 10px 0' }}>Select your account profile:</p>
              {accounts.map((acc, index) => (
                <button 
                  key={index}
                  onClick={() => setSelectedAccountForLogin(acc)}
                  style={{ padding: '12px', backgroundColor: acc.role === 'admin' ? '#2563eb' : '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>{acc.fullName}</span>
                  <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' }}>{acc.role}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ fontSize: '14px', color: '#34d399', fontWeight: 'bold', textAlign: 'center' }}>
                Logging in as: {selectedAccountForLogin.fullName}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '5px' }}>Enter Account PIN</label>
                <input 
                  type="password" 
                  value={loginPin} 
                  onChange={(e) => setLoginPin(e.target.value)} 
                  placeholder="Enter PIN" 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setSelectedAccountForLogin(null); setLoginPin(''); }} style={{ flex: 1, padding: '10px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Back</button>
                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const addToCart = (product) => {
    const itemName = product["Items Name"];
    const itemPrice = Number(product.Price || 0);
    const itemStock = Number(product.Stock || 0);

    const cartItem = cart.find(item => item["Items Name"] === itemName);
    const currentQtyInCart = cartItem ? cartItem.qty : 0;

    if (itemStock - currentQtyInCart <= 0) {
      alert('Sorry, this item is out of stock!');
      return;
    }

    if (cartItem) {
      setCart(cart.map(item => item["Items Name"] === itemName ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, name: itemName, price: itemPrice, stock: itemStock, qty: 1 }]);
    }
  };

  const removeFromCart = (itemName) => {
    setCart(cart.filter(item => item["Items Name"] !== itemName));
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
            <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th></tr></thead>
            <tbody>
              ${completedCart.map(item => `
                <tr><td>${item.name}</td><td class="center">${item.qty}</td><td class="right">${(item.price * item.qty).toFixed(2)}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="bold" style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>TOTAL:</span><span>GHC ${total.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="margin-top: 10px;">Thank you for shopping with us!</div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
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
      const cartMatch = cart.find(item => item["Items Name"] === prod["Items Name"]);
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
      Timestamp: currentDate.toLocaleString(),
      Cashier: currentUser.fullName,
      "Total Amount (GHC)": totalAmount,
      "Items Summary": itemsSummaryString
    };
    
    const activeCart = [...cart];
    const currentTotal = totalAmount;
    const cashierName = currentUser.fullName;

    setCart([]);
    setShowCartDrawer(false);
    handlePrintReceipt(activeCart, currentTotal, cashierName);
    alert(`Sale of GHC ${currentTotal.toFixed(2)} Completed Successfully!`);

    try {
      await supabase.from('Sales').insert([newSaleRecord]);
      for (const item of activeCart) {
        const matchingProduct = updatedProducts.find(p => p["Items Name"] === item["Items Name"]);
        if (matchingProduct) {
          await supabase.from('Inventory')
            .update({ Stock: matchingProduct.Stock })
            .eq('Items Name', item["Items Name"])
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
    if (!newName || !newPrice) return;

    const productPayload = {
      client_id: clientId,
      "Items Name": newName.trim(),
      Price: parseFloat(newPrice),
      Stock: parseInt(newStock) || 0
    };

    try {
      const { error } = await supabase.from('Inventory').insert([productPayload]);
      if (error) throw error;
      alert("Product successfully added!");
      setNewName(''); setNewPrice(''); setNewStock('');
      setShowAddProduct(false);
      fetchInventory(false);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const startEditProduct = (product, e) => {
    e.stopPropagation();
    const identifier = product["Items Name"];

    setEditingProduct({ ...product, resolvedId: identifier });
    setEditName(identifier || '');
    setEditPrice(product.Price || '');
    setEditStock(product.Stock || '');
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    const targetName = editingProduct?.resolvedId || editingProduct?.["Items Name"];

    if (!targetName || !editName || !editPrice) {
      alert("Error: Product name identifier is missing. Cannot update.");
      return;
    }

    try {
      const { error } = await supabase
        .from('Inventory')
        .update({
          "Items Name": editName.trim(),
          Price: parseFloat(editPrice),
          Stock: parseInt(editStock) || 0
        })
        .eq('Items Name', targetName)
        .eq('client_id', clientId);

      if (error) throw error;

      alert("Product updated successfully!");
      setEditingProduct(null);
      fetchInventory(false);
    } catch (error) {
      console.error("Error updating product:", error);
      alert(`Failed to update product: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteProduct = async (productName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      const { error } = await supabase
        .from('Inventory')
        .delete()
        .eq('Items Name', productName)
        .eq('client_id', clientId);

      if (error) throw error;

      alert("Product deleted successfully!");
      fetchInventory(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  const filteredProducts = products.filter(p => 
    String(p["Items Name"] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      backgroundImage: `linear-gradient(135deg, #02060E 0%, #C50337 100%), url(${linaImage})`,
      backgroundBlendMode: 'overlay',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', position: 'relative' }}>
      
        {/* Top Bar */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto 15px auto' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              ☰ Menu
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowCartDrawer(!showCartDrawer)}
                style={{ backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
              >
                🛒 Cart ({totalCartItemsCount})
              </button>

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
                          <button onClick={() => removeFromCart(item["Items Name"])} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
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
        </div>

        {/* Search Input Bar */}
        <div style={{ marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px auto' }}>
          <input 
            type="text"
            placeholder="Search Linaura products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Centered Product Grid Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'stretch',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '10px 0'
        }}>
          {filteredProducts.map((product, index) => (
            <div 
              key={index}
              onClick={() => addToCart(product)}
              style={{
                backgroundColor: 'rgba(17, 24, 39, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <div>
                <div style={{ 
                  height: '130px', 
                  backgroundColor: '#374151', 
                  borderRadius: '8px', 
                  marginBottom: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '12px'
                }}>
                  Product Image
                </div>
                <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  {product["Items Name"]}
                </h4>
                <p style={{ color: '#34d399', fontSize: '13px', margin: '0 0 10px 0', fontWeight: '600' }}>
                  GHC {Number(product.Price || 0).toFixed(2)}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '11px', margin: '0 0 12px 0' }}>
                  Stock: {product.Stock || 0}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  style={{
                    backgroundColor: '#C50337',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Add to Cart
                </button>

                {currentUser.role === 'admin' && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={(e) => startEditProduct(product, e)}
                      style={{ flex: 1, backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => handleDeleteProduct(product["Items Name"], e)}
                      style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Menu */}
        {isSidebarOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '280px', height: '100%', backgroundColor: 'rgba(17, 24, 39, 0.96)', zIndex: 1100, padding: '25px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>LINAURA SCENTS</h3>
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.07)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Logged in as:</div>
              <div style={{ color: '#34d399', fontSize: '14px', fontWeight: 'bold' }}>👤 {currentUser.fullName}</div>
              <div style={{ fontSize: '12px', color: '#d1d5db', textTransform: 'uppercase', marginTop: '2px' }}>Role: {currentUser.role}</div>
            </div>

            <button onClick={handleLogout} style={{ backgroundColor: 'rgba(239, 68, 68, 0.85)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>
              ⇄ Switch Account / Logout
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '5px 0' }} />

            <button onClick={() => { fetchInventory(false); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>🔄 Refresh Inventory</button>
            
            {currentUser.role === 'admin' && (
              <>
                <button onClick={() => { setShowAddProduct(!showAddProduct); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(37, 99, 235, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>➕ Add Product</button>
                <button onClick={() => { fetchSalesHistory(); setShowSalesModal(true); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(234, 179, 8, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>📊 View Sales Report</button>
                <button onClick={() => { setShowManageUsers(true); setIsSidebarOpen(false); }} style={{ backgroundColor: 'rgba(147, 51, 234, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}>👥 Manage Users / Accounts</button>
              </>
            )}
          </div>
        )}

        {/* Add Product Modal (Admin Only) */}
        {showAddProduct && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1250, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <h3 style={{ color: '#ffffff', margin: 0 }}>Add New Product</h3>
                <button onClick={() => setShowAddProduct(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Product Name</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Oud Essence" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Price (GHC)</label>
                  <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Stock Quantity</label>
                  <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <button type="button" onClick={() => setShowAddProduct(false)} style={{ flex: 1, backgroundColor: '#4b5563', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Product</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Product Modal (Admin Only) */}
        {editingProduct && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1250, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <h3 style={{ color: '#ffffff', margin: 0 }}>Edit Product</h3>
                <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Product Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Price (GHC)</label>
                  <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Stock Quantity</label>
                  <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, backgroundColor: '#4b5563', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Update Product</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Users Modal */}
        {showManageUsers && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', width: '100%', maxWidth: '450px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <h3 style={{ color: '#ffffff', margin: 0 }}>Create New User Account</h3>
                <button onClick={() => setShowManageUsers(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Full Name / Account Name</label>
                  <input type="text" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g., Cashier Three" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Role Type</label>
                  <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }}>
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#e5e7eb', display: 'block', marginBottom: '4px' }}>Security PIN Code</label>
                  <input type="password" value={newAccountPin} onChange={e => setNewAccountPin(e.target.value)} placeholder="e.g., 5678" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>Save New Account</button>
              </form>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 8px 0' }}>Existing Active Accounts:</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {accounts.map((acc, index) => (
                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#d1d5db', backgroundColor: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '4px' }}>
                      <span>{acc.fullName}</span>
                      <span style={{ color: '#34d399', textTransform: 'uppercase' }}>{acc.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Sales History Modal */}
        {showSalesModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '20px', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <h3 style={{ color: '#ffffff', margin: 0 }}>Cashier Sales History Breakdown</h3>
                <button onClick={() => setShowSalesModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {salesHistory.length === 0 ? (
                  <p style={{ color: '#9ca3af', textAlign: 'center' }}>No sales recorded yet.</p>
                ) : (
                  salesHistory.map((sale, idx) => (
                    <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#e5e7eb', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Cashier: {sale.Cashier}</span>
                        <span style={{ color: '#34d399' }}>GHC {Number(sale["Total Amount (GHC)"] || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ color: '#9ca3af' }}>Items: {sale["Items Summary"]}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{sale.Timestamp}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}