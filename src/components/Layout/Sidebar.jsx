import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  UtensilsCrossed,
  Grid3x3,
  BarChart3,
  Package, 
  Users,
  Settings,
  Wallet,
  ReceiptText,
  X
} from 'lucide-react';
import { MENU_ITEMS } from '../../data/menuData';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { hasAccess, selectedRestaurant } = useAuth();
  
  // Map icon names to icon components
  const iconMap = {
    LayoutDashboard,
    FileText,
    UtensilsCrossed,
    Grid3x3,
    BarChart3,
    Package,
    Users,
    Settings,
    Wallet,
    ReceiptText
  };

  // Filter menu items based on user access
  const accessibleMenuItems = MENU_ITEMS.filter(item => hasAccess(item.value));

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white z-50 border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        w-64 sm:w-72
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-[#ec2b25] whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
              {selectedRestaurant?.name || 'LEKA'}
            </h1>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-colors cursor-pointer">
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <p className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-widest mt-1">
            {selectedRestaurant?.role || 'User'} Dashboard
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          {accessibleMenuItems.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#ec2b25] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">LEKA PRO v1.0.0</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
