const response = await fetch('https://script.google.com/macros/s/AKfycbwUuPNZG_CK6-ELylYS7vgZeqnZ-IbucU6CrlAHG8QeiCAhD3cUb_t6LdAY9lCqrqqWng/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(sale)
});