import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrendingUp, TrendingDown, ShoppingCart, FileText, XCircle, Package, IndianRupee, Calendar, ChevronDown, Wallet, CreditCard, Smartphone, Banknote, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { selectedRestaurant } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalInvestment: 0,
    totalPayroll: 0,
    profitLoss: 0,
    profitPercentage: 0,
    totalOrders: 0,
    totalBills: 0,
    openBills: 0,
    cancelledOrders: 0,
    topSellingItems: [],
    periodRevenue: 0,
    periodOrders: 0,
    cashReceived: 0,
    cardReceived: 0,
    upiReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedRestaurant) {
      if (selectedRestaurant.role === 'staff') {
        setLoading(false);
        return;
      }
      fetchDashboardData();
    }
  }, [selectedRestaurant, dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        break;
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDateTo);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return null;
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
    return { startDate, endDate };
  };

  const isDateInRange = (dateString, startDate, endDate) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date >= startDate && date <= endDate;
  };

  const fetchDashboardData = async () => {
    if (!selectedRestaurant) return;
    try {
      setLoading(true);
      const dateRange = getDateRange();
      if (dateFilter === 'custom' && !dateRange) {
        setLoading(false);
        return;
      }
      const { startDate, endDate } = dateRange;

      // Multi-tenant scoped queries
      const [billsSnap, investmentsSnap, payrollsSnap] = await Promise.all([
        getDocs(query(collection(db, 'bills'), where('restaurantId', '==', selectedRestaurant.id))),
        getDocs(query(collection(db, 'investments'), where('restaurantId', '==', selectedRestaurant.id))),
        getDocs(query(collection(db, 'payrolls'), where('restaurantId', '==', selectedRestaurant.id)))
      ]);

      // Process bills
      const allBills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bills = allBills.filter(bill => isDateInRange(bill.createdAt, startDate, endDate));
      const paidBills = bills.filter(bill => bill.status === 'paid');

      // Calculate stats
      let cashReceived = 0, cardReceived = 0, upiReceived = 0;
      paidBills.forEach(bill => {
        const billTotal = parseFloat(bill.total) || 0;
        if (bill.paymentMethod === 'split' && bill.splitPayment) {
          cashReceived += parseFloat(bill.splitPayment.cash) || 0;
          cardReceived += parseFloat(bill.splitPayment.card) || 0;
          upiReceived += parseFloat(bill.splitPayment.upi) || 0;
        } else if (bill.paymentMethod === 'cash') cashReceived += billTotal;
        else if (bill.paymentMethod === 'card') cardReceived += billTotal;
        else if (bill.paymentMethod === 'upi') upiReceived += billTotal;
      });

      const totalRevenue = paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0);
      const totalInvestment = investmentsSnap.docs
        .map(doc => doc.data())
        .filter(inv => isDateInRange(inv.createdAt, startDate, endDate))
        .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      
      const totalPayroll = payrollsSnap.docs
        .map(doc => doc.data())
        .filter(p => isDateInRange(p.createdAt, startDate, endDate))
        .reduce((sum, p) => sum + (parseFloat(p.salary) || 0), 0);

      const profitLoss = totalRevenue - totalInvestment - totalPayroll;
      const totalExpenses = totalInvestment + totalPayroll;
      const profitPercentage = totalExpenses > 0 ? ((profitLoss / totalExpenses) * 100) : 0;
      const openBills = bills.filter(bill => bill.status === 'open').length;

      // Extract top selling items from paid bills
      const itemSales = {};
      paidBills.forEach(bill => {
        (bill.items || []).forEach(item => {
          if (!itemSales[item.name]) {
            itemSales[item.name] = { name: item.name, quantity: 0, revenue: 0 };
          }
          itemSales[item.name].quantity += (Number(item.quantity) || 1);
          itemSales[item.name].revenue += (parseFloat(item.price) * (Number(item.quantity) || 1)) || 0;
        });
      });

      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setStats({
        totalRevenue,
        totalInvestment,
        totalPayroll,
        profitLoss,
        profitPercentage,
        totalOrders: paidBills.length, // Simplified for brevity
        totalBills: paidBills.length,
        openBills,
        cancelledOrders: 0, // Placeholder
        topSellingItems,
        periodRevenue: totalRevenue,
        periodOrders: paidBills.length,
        cashReceived,
        cardReceived,
        upiReceived,
      });
      setLoading(false);
    } catch (error) {
      console.error('Dashboard Error:', error);
      setLoading(false);
    }
  };

  const getFilterDisplayName = () => {
    return filterOptions.find(o => o.value === dateFilter)?.label || "Today";
  };

  const filterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Date' },
  ];

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (selectedRestaurant?.role === 'staff') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Staff Access Only</h2>
        <p>Dashboard is restricted to restaurant owners.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-12 h-12 border-4 border-[#ec2b25] border-t-transparent animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic animate-pulse">Syncing Financials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 italic uppercase">Dashboard</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{selectedRestaurant?.name} Overview</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 border-2 border-gray-900 px-4 py-2 bg-white text-gray-900 font-bold uppercase text-sm cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{getFilterDisplayName()}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setDateFilter(option.value); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 font-bold text-xs uppercase ${dateFilter === option.value ? 'bg-gray-900 text-white' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Revenue</h3>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
            <TrendingUp size={12} />
            <span>Based on {stats.totalBills} Bills</span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Net Profit</h3>
          <p className={`text-3xl font-black ${stats.profitLoss >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(stats.profitLoss))}
          </p>
          <div className={`mt-4 text-[10px] font-black uppercase ${stats.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {stats.profitPercentage.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Orders</h3>
          <p className="text-3xl font-black text-gray-900">{stats.totalOrders}</p>
          <div className="mt-4 text-[10px] font-bold text-blue-600 uppercase">Processed Successfully</div>
        </div>

        <div className="bg-[#ec2b25] border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1 italic">Outstanding</h3>
          <p className="text-3xl font-black text-white">{stats.openBills}</p>
          <div className="mt-4 text-[10px] font-bold text-white uppercase italic">Active Unpaid Tables</div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white border-2 border-gray-900 p-6">
          <h2 className="text-lg font-black uppercase italic mb-6">Revenue Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: 'Cash', value: stats.cashReceived, icon: Banknote, color: 'bg-emerald-500' },
              { label: 'Card', value: stats.cardReceived, icon: CreditCard, color: 'bg-blue-500' },
              { label: 'UPI/Digital', value: stats.upiReceived, icon: Smartphone, color: 'bg-purple-500' }
            ].map((method, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase italic">
                  <span className="flex items-center gap-2">
                    <method.icon size={14} className="text-gray-400" />
                    {method.label}
                  </span>
                  <span>{formatCurrency(method.value)}</span>
                </div>
                <div className="h-4 bg-gray-100 border border-gray-200">
                  <div 
                    className={`${method.color} h-full transition-all duration-1000`} 
                    style={{ width: stats.totalRevenue > 0 ? `${(method.value / stats.totalRevenue) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white border-2 border-gray-900 p-6">
          <h2 className="text-lg font-black uppercase italic mb-6">Top Performers</h2>
          {stats.topSellingItems.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.topSellingItems.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-300">#0{idx+1}</span>
                    <span className="text-sm font-bold uppercase italic">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-[#ec2b25]">{item.quantity} QTY</span>
                </div>
              ))}
            </div>
          ) : (
             <div className="h-40 flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">
               Waiting for data...
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
