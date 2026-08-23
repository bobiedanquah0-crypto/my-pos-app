import React, { useState, useEffect, useRef } from 'react';

export default function CheckoutScreen() {
  // 1. Dynamic Web App URL from localStorage
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem('pos_client_web_url') || '';
  });
  
  const [setupUrlInput, setSetupUrlInput] = useState('');

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

  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState('');

  const isSyncingRef = useRef(false);

  // State to track which product card is currently hovered
  const [hoveredProductId, setHoveredProductId] = useState(null);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newStock, setNewStock] = useState('');

  const fetchInventory = async (isBackground = false) => {
    if (!webAppUrl) return;
    if (isBackground && isSyncingRef.current) return;

    try {
      const response = await fetch(webAppUrl);
      const textData = await response.text();
      const result = JSON.parse(textData);
      
      if (result.status === "success" && result.products) {
        if (!isBackground || !isSyncingRef.current) {
          setProducts(result.products);
        }
      }
    } catch (error) {
      console.error("Failed to fetch live inventory:", error);
    }
  };

  useEffect(() => {
    if (webAppUrl && currentUser) {
      fetchInventory(false);
      const intervalId = setInterval(() => fetchInventory(true), 15000);
      return () => clearInterval(intervalId);
    }
  }, [webAppUrl, currentUser]);

  const handleSaveWebAppUrl = (e) => {
    e.preventDefault();
    if (!setupUrlInput.trim()) {
      alert('Please enter a valid Google Apps Script Web App URL.');
      return;
    }
    localStorage.setItem('pos_client_web_url', setupUrlInput.trim());
    setWebAppUrl(setupUrlInput.trim());
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPin) {
      alert('Please enter a security PIN.');
      return;
    }

    let fullName = 'Lead Cashier';
    let role = 'cashier';
    if (loginIdentifier === 'admin') {
      fullName = 'Administrator';
      role = 'admin';
    } else if (loginIdentifier === 'cashier2') {
      fullName = 'Floor Cashier';
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
    if (confirm("Disconnect this client database? You will need to enter a new Web App URL.")) {
      localStorage.removeItem('pos_client_web_url');
      setWebAppUrl('');
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

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const completeSale = () => {
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
    const newSale = {
      action: 'addSale',
      timestamp: currentDate.toLocaleString(),
      cashier: currentUser?.fullName || 'Unknown',
      totalAmount: totalAmount,
      items: itemsSummaryString
    };

    setSales([newSale, ...sales]);
    
    const activeCart = [...cart];
    setCart([]);
    setShowCartDrawer(false);

    alert(`Sale of GHC ${totalAmount.toFixed(2)} Completed Successfully!`);

    setTimeout(async () => {
      try {
        await fetch(webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(newSale)
        });

        await Promise.all(
          activeCart.map(async (item) => {
            const matchingProduct = updatedProducts.find(p => p.id === item.id);
            if (matchingProduct) {
              await fetch(webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  action: 'updateProduct',
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  category: item.category,
                  stock: matchingProduct.stock
                })
              });
            }
          })
        );
      } catch (error) {
        console.error("Background sync to cloud failed:", error);
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 4000);
      }
    }, 10);
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
      action: 'addProduct',
      name: newName,
      price: parsedPrice,
      category: parsedCategory,
      stock: parsedStock
    };

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(productPayload)
      });
      
      const textData = await response.text();
      const result = JSON.parse(textData);
      
      if (result.status === "success") {
        alert("Product successfully added and saved to client's Google Sheet!");
        setNewName('');
        setNewPrice('');
        setNewCategory('');
        setNewStock('');
        setShowAddProduct(false);
        fetchInventory(false);
      } else {
        alert("Failed to save to cloud: " + (result.message || "Unknown error"));
      }
    } catch (error) {
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
      action: 'updateProduct',
      id: editingProduct.id,
      name: editName,
      price: parsedPrice,
      category: editCategory,
      stock: parsedStock
    };

    setEditingProduct(null);

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(updatedPayload)
      });
      
      const textData = await response.text();
      const result = JSON.parse(textData);
      
      if (result.status === "success") {
        fetchInventory(false);
      } else {
        alert("Cloud update warning: Could not fully confirm save.");
        fetchInventory(false);
      }
    } catch (error) {
      console.error("Failed to update product in cloud:", error);
      alert("Error connecting to the cloud to save edits.");
      fetchInventory(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return;

    setProducts(products.filter(item => item.id !== product.id));

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteProduct',
          id: product.id,
          name: product.name
        })
      });
      
      const textData = await response.text();
      const result = JSON.parse(textData);
      if (result.status !== "success") {
        console.warn("Warning: Item deleted locally, but cloud sync reported an issue.");
        fetchInventory(false);
      }
    } catch (error) {
      console.error("Failed to delete product from cloud:", error);
      fetchInventory(false);
    }
  };

  const filteredProducts = products.filter(p => 
    String(p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    String(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!webAppUrl) {
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
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Client POS Setup</h1>
          <p style={{ color: '#e5e7eb', fontSize: '13px', marginBottom: '20px' }}>Paste the client's Google Apps Script Web App URL below to link their database.</p>
          
          <form onSubmit={handleSaveWebAppUrl} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#f3f4f6', marginBottom: '6px' }}>Web App URL</label>
              <textarea 
                rows="3"
                value={setupUrlInput} 
                onChange={(e) => setSetupUrlInput(e.target.value)} 
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.85)', color: '#1f2937', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }}>
              Connect Client Database
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

            {showCartDrawer && (
              <div style={{ 
                position: 'absolute', top: '45px', right: '0', width: '280px', maxWidth: '85vw',
                backgroundColor: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(10px)',
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
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cart.map((item, index) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#f3f4f6', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        <span>{item.name} <span style={{ color: '#9ca3af' }}>x{item.qty}</span></span>
                        <span style={{ fontWeight: 'bold', color: '#34d399' }}>GHC {(item.price * item.qty).toFixed(2)}</span>
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
                    <button 
                      onClick={completeSale} 
                      style={{ backgroundColor: '#059669', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)' }}
                    >
                      Complete Sale
                    </button>
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
                  ⚙️ Database URL
                </button>
              </>
            )}
          </div>
        )}

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
                  <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSettings && currentUser.role === 'admin' ? (
          <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.92)', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>Database Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#4b5563' }}>&times;</button>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '15px' }}>Current Web App URL linked to this browser:</p>
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#374151', wordBreak: 'break-all', marginBottom: '15px' }}>
              {webAppUrl}
            </div>
            <button onClick={handleDisconnectClient} style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '13px' }}>
              Disconnect / Change Client URL
            </button>
          </div>
        ) : showAddProduct && currentUser.role === 'admin' ? (
          <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.92)', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Add New Product</h2>
              <button type="button" onClick={() => setShowAddProduct(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#4b5563' }}>&times;</button>
            </div>
            <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Item Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Standing Fan" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Price (GHC)</label>
                <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="e.g. 50.00" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Stock Quantity</label>
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="e.g. 20" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Category</label>
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Electronics" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Save & Sync Product</button>
            </form>
          </div>
        ) : showReport && currentUser.role === 'admin' ? (
          <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.92)', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <h2 style={{ marginBottom: '15px', color: '#1f2937' }}>Sales Activity Report</h2>
            {sales.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No sales recorded in this session yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {sales.map((s, idx) => (
                  <li key={idx} style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
                    <strong>{s.timestamp}</strong> - Cashier: {s.cashier} <br/>
                    <span style={{ color: '#4b5563', fontSize: '13px' }}>Items: {s.items}</span> <br/>
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>Total: GHC {s.totalAmount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
              <input 
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Search live inventory..." 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', fontSize: '14px', backgroundColor: 'rgba(255, 255, 255, 0.88)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onMouseEnter={() => setHoveredProductId(p.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    boxSizing: 'border-box',
                    position: 'relative'
                  }}
                >
                  <div onClick={() => addToCart(p)} style={{ cursor: 'pointer', flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#111827' }}>{p.name}</h3>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#4b5563' }}>{p.category}</p>
                    <p style={{ margin: '0', fontWeight: 'bold', color: '#059669', fontSize: '14px' }}>GHC {parseFloat(p.price || 0).toFixed(2)}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>Stock: {p.stock}</p>
                  </div>

                  {/* Neutral Gray Hover Actions (Transparent backdrop to avoid color clashes) */}
                  {currentUser.role === 'admin' && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      right: '8px', 
                      display: 'flex', 
                      gap: '4px',
                      opacity: hoveredProductId === p.id ? 1 : 0.2, 
                      transition: 'opacity 0.2s ease-in-out',
                      backgroundColor: 'rgba(243, 244, 246, 0.9)', 
                      backdropFilter: 'blur(4px)',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      border: '1px solid rgba(209, 213, 219, 0.5)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}>
                      <button 
                        title="Edit Product"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '13px', 
                          cursor: 'pointer', 
                          padding: '2px', 
                          color: '#4b5563', // Neutral gray
                          lineHeight: 1
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        title="Delete Product"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '13px', 
                          cursor: 'pointer', 
                          padding: '2px', 
                          color: '#4b5563', // Neutral gray
                          lineHeight: 1
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}