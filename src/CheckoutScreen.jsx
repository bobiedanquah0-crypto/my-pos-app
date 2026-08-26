import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Connection (Replace with your actual keys)
const SUPABASE_URL = 'https://hihphgfrfvpmytasnmvd.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaHBoZ2ZyZnZwbXl0YXNubXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI1MTQsImV4cCI6MjEwMzI2ODUxNH0.FlogrIG1zX_cabM2c0IMeqRSvjvvcP2EAvCF7B47glg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function CheckoutScreen() {
  // 1. Dynamic Client Store ID from localStorage (Defaulting to 'store_101')
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('pos_client_id') || 'LINAURA SCENTS';
  });
  
  const [setupClientIdInput, setSetupClientIdInput] = useState('');

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('pos_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [loginPin, setLoginPin] = useState('');
  
  const [cart, setCart] = useState([]);
  const [sales, setSales] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);

  // State to track active product card for mobile toggle / desktop hover
  const [activeProductId, setActiveProductId] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState('');

  const isSyncingRef = useRef(false);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
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
    if (clientId && currentUser) {
      fetchInventory(false);
      const intervalId = setInterval(() => fetchInventory(true), 15000);
      return () => clearInterval(intervalId);
    }
  }, [clientId, currentUser]);

  const handleSaveClientId = (e) => {
    e.preventDefault();
    if (!setupClientIdInput.trim()) {
      alert('Please enter a valid Client ID (e.g., store_101).');
      return;
    }
    const cleanId = setupClientIdInput.trim();
    localStorage.setItem('pos_client_id', cleanId);
    setClientId(cleanId);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPin) {
      alert('Please enter a security PIN.');
      return;
    }

    let fullName = 'Lead Cashier';
    let role = 'admin';
    if (loginIdentifier === 'admin') {
      fullName = 'Administrator';
      role = 'admin';
    } else if (loginIdentifier === 'cashier2') {
      fullName = 'Floor Cashier';
      role = 'cashier';
    } else {
      fullName = 'Lead Cashier';
      role = 'cashier';
    }

    const userObj = { username: loginIdentifier, fullName, role };
    setCurrentUser(userObj);
    localStorage.setItem('pos_current_user', JSON.stringify(userObj));
    setLoginPin('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pos_current_user');
    setShowReport(false);
    setShowAddProduct(false);
    setShowSettings(false);
    setShowCartDrawer(false);
    setIsSidebarOpen(false);
    setEditingProduct(null);
  };

  const handleDisconnectClient = () => {
    if (confirm("Disconnect this client database? You will need to enter a new Client ID.")) {
      localStorage.removeItem('pos_client_id');
      setClientId('');
      handleLogout();
    }
  };

  const addToCart = (product) => {
    const cartItem = cart.find(item => item.id === product.id);
    const currentQtyInCart = cartItem ? cartItem.qty : 0;

    if (product.stock - currentQtyInCart <= 0) {
      alert('Sorry, this item is out of stock!');
      return;
    }

    if (cartItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Terminal Receipt Print Generator Function
  const handlePrintReceipt = (completedCart, total, cashierName) => {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Receipt</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              width: 58mm;
              margin: 0;
              padding: 10px;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; font-size: 11px; padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">POS TERMINAL RECEIPT</div>
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
          <div class="center" style="margin-top: 10px;">Thank you for your patronage!</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
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
        return { ...prod, stock: Math.max(0, Number(prod.stock) - Number(cartMatch.qty)) };
      }
      return prod;
    });
    
    setProducts(updatedProducts);

    const itemsSummaryString = cart.map(item => `${item.name} (Qty: ${item.qty})`).join(', ');

    const currentDate = new Date();
    const newSaleRecord = {
      client_id: clientId,
      timestamp: currentDate.toLocaleString(),
      cashier: currentUser?.fullName || 'Unknown',
      total_amount: totalAmount,
      items: itemsSummaryString
    };

    setSales([newSaleRecord, ...sales]);
    
    const activeCart = [...cart];
    const currentTotal = totalAmount;
    const cashierName = currentUser?.fullName || 'Unknown';

    setCart([]);
    setShowCartDrawer(false);

    // Automatically trigger thermal receipt print layout
    handlePrintReceipt(activeCart, currentTotal, cashierName);
    alert(`Sale of GHC ${currentTotal.toFixed(2)} Completed Successfully!`);

    try {
      // 1. Insert into Supabase Sales table
      const { error: saleError } = await supabase.from('Sales').insert([newSaleRecord]);
      if (saleError) throw saleError;

      // 2. Update stock levels in Supabase Inventory table
      for (const item of activeCart) {
        const matchingProduct = updatedProducts.find(p => p.id === item.id);
        if (matchingProduct) {
          await supabase
            .from('Inventory')
            .update({ stock: matchingProduct.stock })
            .eq('id', item.id)
            .eq('client_id', clientId);
        }
      }
    } catch (error) {
      console.error("Cloud sync to Supabase failed:", error);
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 4000);
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice) {
      alert("Please provide product name and price.");
      return;
    }

    const parsedPrice = parseFloat(newPrice);
    const parsedStock = parseInt(newStock) || 0;
    const parsedCategory = newCategory || 'General';

    const productPayload = {
      client_id: clientId,
      name: newName,
      price: parsedPrice,
      category: parsedCategory,
      stock: parsedStock
    };

    try {
      const { error } = await supabase.from('Inventory').insert([productPayload]);
      if (error) throw error;

      alert("Product successfully added and saved to Supabase!");
      setNewName('');
      setNewPrice('');
      setNewCategory('');
      setNewStock('');
      setShowAddProduct(false);
      fetchInventory(false);
    } catch (error) {
      console.error("Error saving product to Supabase:", error);
      alert("Error saving product to cloud.");
    }
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setEditName(product.name || '');
    setEditPrice(product.price || '');
    setEditCategory(product.category || '');
    setEditStock(product.stock || '');
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const parsedPrice = parseFloat(editPrice);
    const parsedStock = parseInt(editStock) || 0;

    const updatedPayload = {
      name: editName,
      price: parsedPrice,
      category: editCategory,
      stock: parsedStock
    };

    const targetId = editingProduct.id;
    setEditingProduct(null);

    try {
      const { error } = await supabase
        .from('Inventory')
        .update(updatedPayload)
        .eq('id', targetId)
        .eq('client_id', clientId);

      if (error) throw error;
      fetchInventory(false);
    } catch (error) {
      console.error("Failed to update product in Supabase:", error);
      alert("Error connecting to the cloud to save edits.");
      fetchInventory(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return;

    setProducts(products.filter(item => item.id !== product.id));

    try {
      const { error } = await supabase
        .from('Inventory')
        .delete()
        .eq('id', product.id)
        .eq('client_id', clientId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to delete product from Supabase:", error);
      fetchInventory(false);
    }
  };

  const filteredProducts = products.filter(p => 
    String(p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    String(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!clientId) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', 
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover', backgroundPosition: 'center', padding: '15px'
      }}>
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '30px 20px', borderRadius: '16px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', 
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', width: '100%', maxWidth: '380px', textAlign: 'center', boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Client Database Setup</h1>
          <p style={{ color: '#e5e7eb', fontSize: '13px', marginBottom: '20px' }}>Enter the unique Client ID (e.g., store_101) to link your database.</p>
          
          <form onSubmit={handleSaveClientId} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#f3f4f6', marginBottom: '6px' }}>Client ID</label>
              <input 
                type="text"
                value={setupClientIdInput} 
                onChange={(e) => setSetupClientIdInput(e.target.value)} 
                placeholder="store_101"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.85)', color: '#1f2937', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }}>
              Connect Supabase Client
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', 
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover', backgroundPosition: 'center', padding: '15px'
      }}>
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '30px 20px', borderRadius: '16px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', 
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', width: '100%', maxWidth: '340px', textAlign: 'center', boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Secure POS Terminal</h1>
          <p style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '25px' }}>Sign In</p>
          
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f3f4f6', marginBottom: '6px' }}>Select Account</label>
              <select 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.85)', color: '#1f2937', fontSize: '15px', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
              >
                <option value="admin">Administrator</option>
                <option value="cashier1">Lead Cashier</option>
                <option value="cashier2">Floor Cashier</option>
              </select>
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#f3f4f6', marginBottom: '6px' }}>Security PIN</label>
              <input 
                type="password" maxLength="6" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="Enter PIN code..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.85)', color: '#1f2937', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <button type="submit" style={{ backgroundColor: '#059669', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)', marginTop: '5px' }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', 
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80")',
      backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' 
    }}>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', position: 'relative' }}>
        
        {/* Top Control Bar */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ 
              backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', 
              padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ☰ Menu
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowCartDrawer(!showCartDrawer)}
              style={{ 
                backgroundColor: 'transparent', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.6)', 
                padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              🛒 Cart ({totalCartItemsCount})
            </button>

            {/* Cart Dropdown / Drawer */}
            {showCartDrawer && (
              <div style={{ 
                position: 'absolute', top: '45px', right: '0', width: '300px', maxWidth: '85vw',
                backgroundColor: 'rgba(17, 24, 39, 0.96)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1050, padding: '16px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0', color: '#ffffff' }}>Cart Summary</h4>
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
                          <span style={{ color: '#34d399', fontSize: '12px' }}>GHC {(item.price * item.qty).toFixed(2)} <span style={{ color: '#9ca3af' }}>(x{item.qty})</span></span>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          title="Remove item"
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.2)', 
                            border: '1px solid rgba(239, 68, 68, 0.4)', 
                            color: '#f87171', 
                            borderRadius: '4px', 
                            padding: '4px 8px', 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                          }}
                        >
                          ✕ Remove
                        </button>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setCart([])} 
                        style={{ backgroundColor: 'rgba(75, 85, 99, 0.8)', color: 'white', padding: '10px 8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
                      >
                        Clear Cart
                      </button>
                      <button 
                        onClick={completeSale} 
                        style={{ backgroundColor: '#059669', color: 'white', padding: '10px 8px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 2, boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)' }}
                      >
                        Complete Sale & Print
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isSidebarOpen && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, width: '280px', height: '100%', 
            backgroundColor: 'rgba(17, 24, 39, 0.96)', backdropFilter: 'blur(10px)', zIndex: 1100, 
            boxShadow: '4px 0 20px rgba(0,0,0,0.4)', padding: '25px 20px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <h3 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>Dashboard Menu</h3>
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p style={{ color: '#9ca3af', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged In As</p>
              <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{currentUser.fullName}</p>
              <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 10px 0', textTransform: 'capitalize' }}>Role: {currentUser.role}</p>
              <button 
                onClick={handleLogout} 
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.8)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
              >
                Log Out
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '5px 0' }} />

            <button 
              onClick={() => { fetchInventory(false); setIsSidebarOpen(false); }}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}
            >
              🔄 Refresh Inventory
            </button>

            {currentUser.role === 'admin' && (
              <>
                <button 
                  onClick={() => { setShowAddProduct(!showAddProduct); setShowReport(false); setShowSettings(false); setIsSidebarOpen(false); }}
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}
                >
                  {showAddProduct ? '📁 View Catalog' : '➕ Add Product'}
                </button>
                <button 
                  onClick={() => { setShowReport(!showReport); setShowAddProduct(false); setShowSettings(false); setIsSidebarOpen(false); }}
                  style={{ backgroundColor: 'rgba(124, 58, 237, 0.8)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}
                >
                  {showReport ? '📁 View Catalog' : '📊 Sales Reports'}
                </button>
                <button 
                  onClick={() => { setShowSettings(!showSettings); setShowAddProduct(false); setShowReport(false); setIsSidebarOpen(false); }}
                  style={{ backgroundColor: 'rgba(75, 85, 99, 0.9)', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer' }}
                >
                  ⚙️ Client Settings
                </button>
              </>
            )}
          </div>
        )}

        {/* Editing Modal */}
        {editingProduct && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>Edit Product & Restock</h3>
                <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: '#4b5563' }}>&times;</button>
              </div>

              <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Item Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Price (GHC)</label>
                  <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Stock Quantity (Restock)</label>
                  <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Category</label>
                  <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, backgroundColor: '#9ca3af', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Edits</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}