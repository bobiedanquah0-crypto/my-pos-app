// printer.js - ESC/POS Thermal Receipt Printing for Web Apps

/**
 * Formats cart items and transaction details into raw ESC/POS byte commands
 */
export function generateReceiptData(transactionId, cartItems, totalAmount, cashierName) {
  const encoder = new TextEncoder();
  
  // ESC/POS Command Constants
  const ESC = '\x1B';
  const GS = '\x1D';
  
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a' + '\x01';
  const ALIGN_LEFT = ESC + 'a' + '\x00';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const CUT_PAPER = GS + 'V' + '\x41' + '\x03'; // Cut paper command

  let receiptText = '';

  // Initialize Printer
  receiptText += INIT;

  // Header
  receiptText += ALIGN_CENTER + BOLD_ON;
  receiptText += 'AI POS RETAIL STORE\n';
  receiptText += BOLD_OFF;
  receiptText += 'Tema, Ghana\n';
  receiptText += '--------------------------------\n';

  // Transaction Meta
  receiptText += ALIGN_LEFT;
  receiptText += `Tx ID: ${transactionId}\n`;
  receiptText += `Date: ${new Date().toLocaleString()}\n`;
  receiptText += `Cashier: ${cashierName}\n`;
  receiptText += '--------------------------------\n';
  receiptText += 'ITEM            QTY    PRICE(GH₵)\n';
  receiptText += '--------------------------------\n';

  // Items List
  cartItems.forEach(item => {
    const name = item.name.padEnd(16, ' ').substring(0, 16);
    const qty = String(item.qty).padRight ? String(item.qty).padEnd(4, ' ') : String(item.qty);
    const price = (item.price * item.qty).toFixed(2).padStart(10, ' ');
    receiptText += `${name} ${qty} ${price}\n`;
  });

  receiptText += '--------------------------------\n';
  
  // Total
  receiptText += BOLD_ON;
  receiptText += `TOTAL: GH₵ ${totalAmount.toFixed(2).padStart(20, ' ')}\n`;
  receiptText += BOLD_OFF;
  
  receiptText += '--------------------------------\n';
  receiptText += ALIGN_CENTER;
  receiptText += 'Thank you for your business!\n\n\n';
  
  // Cut Paper
  receiptText += CUT_PAPER;

  return encoder.encode(receiptText);
}

/**
 * Connects to a USB Thermal Printer using the Web Serial API
 */
export async function printReceipt(transactionId, cartItems, totalAmount, cashierName) {
  if (!('serial' in navigator)) {
    alert('Web Serial API is not supported in this browser. Please use Google Chrome or Edge.');
    return;
  }

  try {
    // Request permission to connect to a USB serial receipt printer (e.g., Epson, Xprinter, Rongta)
    const port = await navigator.serial.requestPort();
    
    // Open connection (standard thermal printer baud rate is usually 9600 or 115200)
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const receiptBytes = generateReceiptData(transactionId, cartItems, totalAmount, cashierName);

    // Send raw bytes to printer
    await writer.write(receiptBytes);
    
    // Clean up writer stream
    writer.releaseLock();
    await port.close();
    
    console.log('Receipt printed successfully!');
  } catch (error) {
    console.error('Printing failed:', error);
    alert('Could not print receipt. Ensure your thermal printer is connected via USB.');
  }
}