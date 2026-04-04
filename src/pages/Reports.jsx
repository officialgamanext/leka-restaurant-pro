import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Calendar, 
  TrendingUp,
  DollarSign, 
  ShoppingBag, 
  ChevronDown, 
  ChevronRight, 
  Package, 
  List, 
  Loader2,
  PieChart as PieIcon,
  ArrowUpRight,
  RefreshCw,
  Search,
  CreditCard,
  Star as StarIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { selectedRestaurant } = useAuth();
  const [dateRange, setDateRange] = useState('today');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeTab, setActiveTab] = useState('categories');

  useEffect(() => {
    if (selectedRestaurant) {
      fetchData();
    }
  }, [selectedRestaurant, dateRange]);

  const fetchData = async () => {
    if (!selectedRestaurant) return;
    try {
      setLoading(true);
      const [billsSnap, categoriesSnap, itemsSnap] = await Promise.all([
        getDocs(query(collection(db, 'bills'), where('restaurantId', '==', selectedRestaurant.id))),
        getDocs(query(collection(db, 'categories'), where('restaurantId', '==', selectedRestaurant.id))),
        getDocs(query(collection(db, 'items'), where('restaurantId', '==', selectedRestaurant.id)))
      ]);

      setBills(billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMenuItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Failed to update reports');
      setLoading(false);
    }
  };

  const getDateRangeBounds = () => {
    const now = new Date();
    let startDate, endDate;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'today': startDate = todayStart; endDate = todayEnd; break;
      case 'yesterday':
        startDate = new Date(todayStart); startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate); endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth': startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = todayEnd; break;
      case 'thisYear': startDate = new Date(now.getFullYear(), 0, 1); endDate = todayEnd; break;
      default: startDate = new Date(0); endDate = todayEnd;
    }
    return { startDate, endDate };
  };

  const filteredBills = (() => {
    if (dateRange === 'all') return bills;
    const { startDate, endDate } = getDateRangeBounds();
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt || 0);
      return billDate >= startDate && billDate <= endDate;
    });
  })();

  const paidBills = filteredBills.filter(bill => bill.status === 'paid');

  const stats = {
    totalRevenue: paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0),
    totalOrders: paidBills.length,
    avgOrderValue: paidBills.length > 0 ? paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0) / paidBills.length : 0,
    totalItems: paidBills.reduce((sum, bill) => sum + (bill.items?.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0) || 0), 0),
  };

  const salesByCategory = (() => {
    const categorySales = {};
    categories.forEach(cat => {
      categorySales[cat.id] = { id: cat.id, name: cat.name, icon: cat.emoji || '📁', items: {}, totalQty: 0, totalRevenue: 0 };
    });

    paidBills.forEach(bill => {
      (bill.items || []).forEach(item => {
        const menuItem = menuItems.find(mi => String(mi.id) === String(item.id));
        const categoryId = menuItem ? menuItem.categoryId : 'unknown';
        if (!categorySales[categoryId]) categorySales[categoryId] = { id: categoryId, name: 'Other', icon: '📋', items: {}, totalQty: 0, totalRevenue: 0 };
        if (!categorySales[categoryId].items[item.name]) {
          categorySales[categoryId].items[item.name] = { name: item.name, quantity: 0, revenue: 0, price: parseFloat(item.price) || 0 };
        }
        const qty = Number(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        categorySales[categoryId].items[item.name].quantity += qty;
        categorySales[categoryId].items[item.name].revenue += price * qty;
        categorySales[categoryId].totalQty += qty;
        categorySales[categoryId].totalRevenue += price * qty;
      });
    });
    return Object.values(categorySales).filter(cat => cat.totalQty > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();

  const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-[#ec2b25] animate-spin mb-4" />
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest italic animate-pulse">Analyzing Statistics...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 italic uppercase">Analytics</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{selectedRestaurant?.name} Business Intelligence</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Calendar className="w-4 h-4 ml-2" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent border-none text-xs font-black uppercase italic focus:ring-0 cursor-pointer pr-8"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
            <option value="all">Lifetime</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-gray-900' },
          { label: 'Bills', value: stats.totalOrders, icon: ShoppingBag, color: 'text-gray-900' },
          { label: 'Avg Sale', value: formatCurrency(stats.avgOrderValue), icon: TrendingUp, color: 'text-gray-900' },
          { label: 'Units Sold', value: stats.totalItems, icon: Package, color: 'text-gray-900' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900 leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-gray-900 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-900 bg-gray-50">
          <h2 className="text-lg font-black uppercase italic">Performance by Category</h2>
        </div>
        <div className="divide-y-2 divide-gray-900">
          {salesByCategory.length === 0 ? (
            <div className="p-20 text-center text-gray-400 font-bold uppercase italic text-xs tracking-widest">No data for selected period</div>
          ) : (
            salesByCategory.map((category) => (
              <div key={category.id}>
                <button
                  onClick={() => setExpandedCategories(p => ({ ...p, [category.id]: !p[category.id] }))}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{category.icon}</span>
                    <div className="text-left">
                      <h3 className="font-black text-gray-900 text-sm uppercase italic">{category.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{category.totalQty} Units Sold</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="text-xl font-black text-gray-900">{formatCurrency(category.totalRevenue)}</p>
                    <ChevronDown className={`w-5 h-5 transition-transform ${expandedCategories[category.id] ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedCategories[category.id] && (
                  <div className="bg-gray-50 p-6 border-t-2 border-gray-900">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-gray-400 italic">
                          <th className="pb-4">Product Name</th>
                          <th className="pb-4 text-center">Qty</th>
                          <th className="pb-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-bold divide-y divide-gray-200">
                        {Object.values(category.items).map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-3 uppercase italic">{item.name}</td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-right font-black">{formatCurrency(item.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
