// Web Bluetooth printing utility for thermal printers
// For mobile and desktop: Uses Web Bluetooth API (Chrome/Edge only)

// Web Bluetooth for printer connection
let bluetoothDevice = null;
let bluetoothCharacteristic = null;

const PRINTER_WIDTH = parseInt(import.meta.env.VITE_PRINTER_WIDTH) || 32; // Default to 32 for 58mm compatibility

// Common Bluetooth printer service and characteristic UUIDs
const ALT_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
];

// Check if running on mobile
export const isMobile = () => {
  return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if Web Bluetooth is available
export const isWebBluetoothAvailable = () => {
  return typeof navigator !== 'undefined' && navigator.bluetooth !== undefined;
};

// Connect to Bluetooth printer
export const connectBluetoothPrinter = async () => {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Web Bluetooth is not available in this browser. Please use Chrome or Edge on a supported device.');
  }

  try {
    console.log('Requesting Bluetooth device...');
    
    // Request any device (let user select)
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ALT_PRINTER_SERVICES
    });

    console.log('Connecting to GATT server...');
    const server = await bluetoothDevice.gatt.connect();

    // Try to find printer service
    let service = null;
    for (const serviceUuid of ALT_PRINTER_SERVICES) {
      try {
        service = await server.getPrimaryService(serviceUuid);
        console.log('Found service:', serviceUuid);
        break;
      } catch (e) {
        console.log('Service not found:', serviceUuid);
      }
    }

    if (!service) {
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        service = services[0];
      } else {
        throw new Error('No compatible printer service found');
      }
    }

    // Get characteristic for writing
    const characteristics = await service.getCharacteristics();
    bluetoothCharacteristic = characteristics.find(c => 
      c.properties.write || c.properties.writeWithoutResponse
    );

    if (!bluetoothCharacteristic) {
      throw new Error('No writable characteristic found');
    }

    console.log('Bluetooth printer connected!', bluetoothDevice.name);
    return { success: true, deviceName: bluetoothDevice.name };
  } catch (err) {
    console.error('Bluetooth connection error:', err);
    bluetoothDevice = null;
    bluetoothCharacteristic = null;
    throw err;
  }
};

// Check if Bluetooth printer is connected
export const isBluetoothConnected = () => {
  return bluetoothDevice?.gatt?.connected && bluetoothCharacteristic !== null;
};

// Disconnect Bluetooth printer
export const disconnectBluetoothPrinter = () => {
  if (bluetoothDevice?.gatt?.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  bluetoothCharacteristic = null;
};

// Print via Web Bluetooth
export const printViaBluetooth = async (commands) => {
  if (!isBluetoothConnected()) {
    await connectBluetoothPrinter();
  }

  if (!bluetoothCharacteristic) {
    throw new Error('Bluetooth printer not connected');
  }

  // Convert string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(commands);
  
  // Send in chunks (Bluetooth has packet size limits)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    try {
      if (bluetoothCharacteristic.properties.writeWithoutResponse) {
        await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await bluetoothCharacteristic.writeValue(chunk);
      }
    } catch (err) {
      console.error('Bluetooth write error:', err);
      if (err.message?.includes('disconnected')) {
        bluetoothDevice = null;
        bluetoothCharacteristic = null;
      }
      throw err;
    }
    // Small delay between chunks for better reliability
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  console.log('Print data sent via Bluetooth');
  return { success: true };
};

// ============================================
// COMMAND GENERATION (ESC/POS)
// ============================================

// Generate ESC/POS commands for thermal bill
export const generateThermalCommands = (billData) => {
  const {
    billNo = 'N/A',
    orderNo = 'N/A',
    kotNo = 'N/A',
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type = 'Dine In',
    table = 'N/A',
    user = 'Admin',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    totalAmount = 0,
    totalQty = 0,
    paymentMethod = null,
    splitPayment = null,
    amountReceived = 0,
    change = 0
  } = billData;

  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'RESTAURANT';
  const restaurantMobile = import.meta.env.VITE_RESTAURANT_MOBILE || '';
  const restaurantAddress = import.meta.env.VITE_RESTAURANT_ADDRESS || '';
  const restaurantGST = import.meta.env.VITE_RESTAURANT_GST || '';

  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const ALIGN_RIGHT = ESC + 'a\x02';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const NORMAL_SIZE = GS + '!\x00';
  const PARTIAL_CUT = GS + 'V\x01';
  const LF = '\n';
  
  const W = PRINTER_WIDTH; 
  const pad = (s, l) => s.substring(0, Math.max(0, l)).padEnd(l);
  const padL = (s, l) => s.substring(0, Math.max(0, l)).padStart(l);
  const line = (c = '-') => c.repeat(W);

  let cmd = INIT;
  
  cmd += ALIGN_CENTER + BOLD_ON;
  cmd += restaurantName + LF;
  cmd += BOLD_OFF + LF;
  
  if (restaurantAddress) {
    const words = restaurantAddress.split(' ');
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > W) {
        cmd += currentLine.trim() + LF;
        currentLine = word;
      } else {
        currentLine = (currentLine + ' ' + word).trim();
      }
    }
    if (currentLine) cmd += currentLine + LF;
  }
  
  cmd += `Ph: ${restaurantMobile}` + LF;
  if (restaurantGST && restaurantGST.trim() !== '') {
    cmd += `GST: ${restaurantGST}` + LF;
  }
  cmd += LF;
  
  cmd += ALIGN_LEFT;
  cmd += `${date} ${time}`.padEnd(W - type.length) + type + LF;
  
  cmd += line('=') + LF;
  cmd += ALIGN_CENTER + BOLD_ON;
  cmd += `BILL: ${billNo}` + LF;
  cmd += `ORDER: ${orderNo} | KOT: ${kotNo}` + LF;
  cmd += BOLD_OFF + line('=') + LF;
  
  cmd += ALIGN_LEFT;
  cmd += `Table: ${table}`.padEnd(W - `User: ${user}`.length) + `User: ${user}` + LF;
  cmd += line('-') + LF;
  
  cmd += BOLD_ON;
  const qtyHeadWidth = 4;
  const rateHeadWidth = 8;
  const amtHeadWidth = 8;
  const itemHeadWidth = W - (qtyHeadWidth + rateHeadWidth + amtHeadWidth);
  cmd += pad('ITEM', itemHeadWidth) + padL('QTY', qtyHeadWidth) + padL('RATE', rateHeadWidth) + padL('AMT', amtHeadWidth) + LF;
  cmd += BOLD_OFF + line('-') + LF;

  items.forEach((item, i) => {
    const qty = (item.quantity || 0).toString();
    const rate = Math.round(item.price || 0).toString();
    const amt = Math.round((item.price || 0) * (item.quantity || 0)).toString();
    const nameStr = `${i + 1}.${item.name || 'Item'}`;
    
    if (nameStr.length <= itemHeadWidth) {
      cmd += pad(nameStr, itemHeadWidth) + padL(qty, qtyHeadWidth) + padL(rate, rateHeadWidth) + padL(amt, amtHeadWidth) + LF;
    } else {
      cmd += pad(nameStr.substring(0, itemHeadWidth), itemHeadWidth) + padL(qty, qtyHeadWidth) + padL(rate, rateHeadWidth) + padL(amt, amtHeadWidth) + LF;
      let remaining = nameStr.substring(itemHeadWidth);
      while (remaining.length > 0) {
        cmd += pad(remaining.substring(0, itemHeadWidth), itemHeadWidth) + LF;
        remaining = remaining.substring(itemHeadWidth);
      }
    }
  });

  cmd += line('-') + LF;
  cmd += `Items: ${totalQty}`.padEnd(W - `Subtotal: Rs.${subtotal}`.length) + `Subtotal: Rs.${subtotal}` + LF;
  if (discountAmount > 0) {
    cmd += ''.padEnd(W - `Discount: -Rs.${discountAmount}`.length) + `Discount: -Rs.${discountAmount}` + LF;
  }
  
  cmd += line('=') + LF;
  cmd += BOLD_ON + ALIGN_RIGHT;
  cmd += `TOTAL: Rs.${totalAmount}` + LF;
  cmd += BOLD_OFF + LF;

  if (paymentMethod) {
    cmd += ALIGN_LEFT + line('-') + LF;
    if (paymentMethod === 'split' && splitPayment) {
      cmd += BOLD_ON + 'PAYMENT (SPLIT):' + LF + BOLD_OFF;
      if (splitPayment.cash > 0) cmd += `Cash:`.padEnd(W - `Rs.${splitPayment.cash}`.length) + `Rs.${splitPayment.cash}` + LF;
      if (splitPayment.card > 0) cmd += `Card:`.padEnd(W - `Rs.${splitPayment.card}`.length) + `Rs.${splitPayment.card}` + LF;
      if (splitPayment.upi > 0) cmd += `UPI:`.padEnd(W - `Rs.${splitPayment.upi}`.length) + `Rs.${splitPayment.upi}` + LF;
    } else {
      cmd += `PAYMENT (${paymentMethod.toUpperCase()}):`.padEnd(W - `Rs.${amountReceived}`.length) + `Rs.${amountReceived}` + LF;
    }
    if (change > 0) cmd += BOLD_ON + `Change:`.padEnd(W - `Rs.${change}`.length) + `Rs.${change}` + LF + BOLD_OFF;
  }
  
  cmd += ALIGN_CENTER + line('=') + LF;
  cmd += BOLD_ON + 'Thank you! Visit again' + LF;
  cmd += BOLD_OFF + LF + LF + LF + PARTIAL_CUT;
  
  return cmd;
};

// Generate KOT Commands
export const generateKOTCommands = (kotData) => {
  const {
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type = 'Dine In',
    table = 'N/A',
    items = [],
    totalQty = 0
  } = kotData;

  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const PARTIAL_CUT = GS + 'V\x01';
  const LF = '\n';
  
  const W = PRINTER_WIDTH;
  const pad = (s, l) => s.substring(0, Math.max(0, l)).padEnd(l);
  const padL = (s, l) => s.substring(0, Math.max(0, l)).padStart(l);
  const line = (c = '-') => c.repeat(W);

  let cmd = INIT;
  cmd += ALIGN_CENTER + BOLD_ON + '*** KOT ***' + LF + BOLD_OFF;
  cmd += line('=') + LF;
  cmd += BOLD_ON + `TABLE: ${table}` + LF + BOLD_OFF;
  cmd += `${type} | ${date} ${time}` + LF;
  cmd += line('=') + LF;

  cmd += ALIGN_LEFT + BOLD_ON;
  const qtyWidth = 8;
  const nameWidth = W - qtyWidth;
  cmd += pad('ITEM', nameWidth) + padL('QTY', qtyWidth) + LF;
  cmd += BOLD_OFF + line('-') + LF;

  items.forEach((item, i) => {
    const nameStr = `${i + 1}. ${item.name || 'Item'}`;
    const qtyStr = `x${item.quantity || 0}`;
    if (nameStr.length <= nameWidth) {
      cmd += pad(nameStr, nameWidth) + padL(qtyStr, qtyWidth) + LF;
    } else {
      cmd += pad(nameStr.substring(0, nameWidth), nameWidth) + padL(qtyStr, qtyWidth) + LF;
      let remaining = nameStr.substring(nameWidth);
      while (remaining.length > 0) {
        cmd += pad(remaining.substring(0, nameWidth), nameWidth) + LF;
        remaining = remaining.substring(nameWidth);
      }
    }
  });

  cmd += line('-') + LF;
  cmd += BOLD_ON + ALIGN_CENTER + `TOTAL ITEMS: ${totalQty}` + LF + BOLD_OFF;
  cmd += line('=') + LF + LF + LF + PARTIAL_CUT;
  
  return cmd;
};

// Generate Menu Image print commands
export const generateMenuPrintCommands = (items, categories) => {
  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'RESTAURANT';
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const LF = '\n';
  const PARTIAL_CUT = GS + 'V\x01';
  
  const W = PRINTER_WIDTH;
  const line = (c = '-') => c.repeat(W);
  const padRight = (str, len) => str.substring(0, len).padEnd(len);
  const padLeft = (str, len) => str.substring(0, len).padStart(len);
  
  let cmd = INIT;
  cmd += ALIGN_CENTER + BOLD_ON + restaurantName + LF;
  cmd += 'MENU LIST' + LF + BOLD_OFF;
  cmd += new Date().toLocaleDateString('en-IN') + LF + line('=') + LF + LF;
  
  const itemsByCategory = {};
  items.forEach(item => {
    const catId = item.categoryId || 'other';
    if (!itemsByCategory[catId]) itemsByCategory[catId] = [];
    itemsByCategory[catId].push(item);
  });
  
  const categoryMap = {};
  categories.forEach(c => categoryMap[c.id] = c.name);

  Object.keys(itemsByCategory).forEach(catId => {
    cmd += ALIGN_LEFT + BOLD_ON + (categoryMap[catId] || 'Other').toUpperCase() + LF;
    cmd += line('-') + LF + BOLD_OFF;
    itemsByCategory[catId].forEach((item, idx) => {
      const price = 'Rs.' + item.price;
      cmd += padRight(`${idx+1}. ${item.name}`, W - price.length) + price + LF;
    });
    cmd += LF;
  });
  
  cmd += line('=') + LF + ALIGN_CENTER + `Total: ${items.length}` + LF + LF + LF + PARTIAL_CUT;
  return cmd;
};

// Simplified public print functions
export const printThermalBill = async (billData) => {
  const commands = generateThermalCommands(billData);
  return await printViaBluetooth(commands);
};

export const printKOT = async (kotData) => {
  const commands = generateKOTCommands(kotData);
  return await printViaBluetooth(commands);
};

export const printMenuItems = async (items, categories) => {
  const commands = generateMenuPrintCommands(items, categories);
  return await printViaBluetooth(commands);
};

export default {
  printThermalBill,
  printKOT,
  printMenuItems,
  connectBluetoothPrinter,
  isBluetoothConnected,
  disconnectBluetoothPrinter,
  isWebBluetoothAvailable,
  isMobile
};
