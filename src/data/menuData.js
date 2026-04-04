export const MENU_ITEMS = [
  { label: 'Dashboard', value: 'dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Billing', value: 'billing', path: '/billing', icon: 'FileText' },
  { label: 'All Bills', value: 'all-bills', path: '/all-bills', icon: 'ReceiptText' },
  { label: 'Menu', value: 'menu', path: '/menu', icon: 'UtensilsCrossed' },
  { label: 'Tables', value: 'tables', path: '/tables', icon: 'Grid3x3' },
  { label: 'Investment', value: 'investment', path: '/investment', icon: 'Package' },
  { label: 'Payroll', value: 'payroll', path: '/payroll', icon: 'Wallet' },
  { label: 'Staff', value: 'staff', path: '/staff', icon: 'Users' },
  { label: 'Reports', value: 'reports', path: '/reports', icon: 'BarChart3' },
  { label: 'Printer Setup', value: 'settings', path: '/printer-setup', icon: 'Settings' }
];

// Restaurant details from environment variables
export const RESTAURANT_NAME = import.meta.env.VITE_RESTAURANT_NAME || 'LEKA Restaurant PRO';
export const SUPPORT_PHONE = import.meta.env.VITE_RESTAURANT_MOBILE || '+91 9966850426';
export const RESTAURANT_ADDRESS = import.meta.env.VITE_RESTAURANT_ADDRESS || '';
export const RESTAURANT_GST = import.meta.env.VITE_RESTAURANT_GST || '';
