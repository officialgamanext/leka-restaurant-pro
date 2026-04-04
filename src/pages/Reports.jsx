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
  const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'items', 'payments'

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

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const getDateRangeBounds = () => {
    const now = new Date();
    let startDate, endDate;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'today':
        startDate = todayStart;
        endDate = todayEnd;
        break;
      case 'yesterday':
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = todayEnd;
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = todayEnd;
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(0); 
        endDate = todayEnd;
    }
    return { startDate, endDate };
  };

  const filteredBills = (() => {
    if (dateRange === 'all') return bills;
    const { startDate, endDate } = getDateRangeBounds();
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt || bill.paidAt || 0);
      return billDate >= startDate && billDate <= endDate;
    });
  })();

  const paidBills = filteredBills.filter(bill => bill.status === 'paid');

  const stats = {
    totalRevenue: paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0),
    totalOrders: paidBills.length,
    avgOrderValue: paidBills.length > 0 
      ? paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0) / paidBills.length 
      : 0,
    totalItems: paidBills.reduce((sum, bill) => 
      sum + (bill.items?.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0) || 0), 0
    ),
  };

  const salesByCategory = (() => {
    const categorySales = {};
    categories.forEach(cat => {
      categorySales[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.emoji || '📁',
        items: {},
        totalQty: 0,
        totalRevenue: 0
      };
    });

    paidBills.forEach(bill => {
      if (!bill.items) return;
      bill.items.forEach(item => {
        const menuItem = menuItems.find(mi => String(mi.id) === String(item.id));
        const categoryId = menuItem ? menuItem.categoryId : 'unknown';
        
        if (!categorySales[categoryId]) {
          categorySales[categoryId] = {
            id: categoryId,
            name: categoryId === 'unknown' ? 'Uncategorized' : 'Unknown',
            icon: '📋',
            items: {},
            totalQty: 0,
            totalRevenue: 0
          };
        }

        if (!categorySales[categoryId].items[item.id]) {
          categorySales[categoryId].items[item.id] = {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0,
            price: parseFloat(item.price) || 0
          };
        }

        const qty = Number(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        categorySales[categoryId].items[item.id].quantity += qty;
        categorySales[categoryId].items[item.id].revenue += price * qty;
        categorySales[categoryId].totalQty += qty;
        categorySales[categoryId].totalRevenue += price * qty;
      });
    });

    return Object.values(categorySales)
      .filter(cat => cat.totalQty > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();

  const topItems = (() => {
    const itemSales = {};
    paidBills.forEach(bill => {
      if (!bill.items) return;
      bill.items.forEach(item => {
        if (!itemSales[item.id]) {
          itemSales[item.id] = { 
            id: item.id, 
            name: item.name, 
            totalQuantity: 0, 
            totalRevenue: 0,
            price: parseFloat(item.price) || 0
          };
        }
        const qty = Number(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        itemSales[item.id].totalQuantity += qty;
        itemSales[item.id].totalRevenue += price * qty;
      });
    });

    return Object.values(itemSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);
  })();

  const paymentStats = {
    cash: paidBills.filter(o => o.paymentMethod === 'cash').length,
    card: paidBills.filter(o => o.paymentMethod === 'card').length,
    upi: paidBills.filter(o => o.paymentMethod === 'upi').length,
    split: paidBills.filter(o => o.paymentMethod === 'split').length,
  };

  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const getDateRangeLabel = () => {
    const labels = {
      today: "Today's",
      yesterday: "Yesterday's",
      thisMonth: "This Month's",
      lastMonth: "Last Month's",
      thisYear: "This Year's",
      lastYear: "Last Year's",
      all: 'All Time',
    };
    return labels[dateRange] || 'All Time';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#ec2b25] animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">LEKA Business Intelligence</h2>
          <p className="text-gray-500 font-medium">Crunching today's numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Business Reports</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-sm md:text-base font-bold text-gray-500">
               Live insights for <span className="text-[#ec2b25]">{getDateRangeLabel()}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 border border-gray-200">
          <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
             <select
               value={dateRange}
               onChange={(e) => setDateRange(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-gray-50 border-none text-sm font-bold text-gray-700 appearance-none cursor-pointer focus:ring-1 focus:ring-[#ec2b25]"
             >
               <option value="today">Today</option>
               <option value="yesterday">Yesterday</option>
               <option value="thisMonth">This Month</option>
               <option value="lastMonth">Last Month</option>
               <option value="thisYear">This Year</option>
               <option value="lastYear">Last Year</option>
               <option value="all">Lifetime</option>
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button 
             onClick={fetchData} 
             className="flex items-center justify-center gap-2 px-4 py-2 bg-[#fdf2f2] text-[#ec2b25] border border-[#fecaca] font-bold text-sm hover:bg-[#ec2b25] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { label: 'Bills', value: stats.totalOrders, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Avg Sale', value: formatCurrency(stats.avgOrderValue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Sold Qty', value: stats.totalItems, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
        ].map((stat, i) => (
          <div key={i} className={`bg-white border ${stat.border} p-4 md:p-6 flex flex-col justify-between hover:shadow-md transition-shadow`}>
            <div className={`w-8 h-8 md:w-12 md:h-12 ${stat.bg} ${stat.color} flex items-center justify-center mb-3 md:mb-4 rounded-full`}>
               <stat.icon className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-lg md:text-3xl font-black text-gray-900 leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: 'categories', label: 'By Category', icon: List },
          { id: 'items', label: 'Top Items', icon: StarIcon },
          { id: 'payments', label: 'Payments', icon: CreditCard }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id 
              ? 'border-[#ec2b25] text-[#ec2b25] bg-[#fff5f5]' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {salesByCategory.length === 0 ? (
               <NoDataPlaceholder />
            ) : (
              salesByCategory.map((category) => (
                <div key={category.id} className="bg-white border border-gray-200 overflow-hidden hover:border-[#fecaca] transition-colors shadow-sm">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 md:p-6 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl bg-gray-50 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl group-hover:bg-[#fff5f5] transition-colors">
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-sm md:text-base uppercase tracking-tight">{category.name}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">
                          {category.totalQty} Units • {Object.keys(category.items).length} Variants
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                       <p className="text-lg md:text-2xl font-black text-gray-900">{formatCurrency(category.totalRevenue)}</p>
                       <div className={`w-8 h-8 flex items-center justify-center transition-all ${expandedCategories[category.id] ? 'bg-[#ec2b25] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {expandedCategories[category.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {expandedCategories[category.id] && (
                    <div className="border-t border-gray-100 bg-[#fafafa]">
                      <div className="hidden md:block">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50">
                            <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                              <th className="py-4 px-6 italic">Item Name</th>
                              <th className="py-4 px-4 text-center">Unit Price</th>
                              <th className="py-4 px-4 text-center">Qty Sold</th>
                              <th className="py-4 px-6 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(category.items)
                              .sort((a, b) => b.revenue - a.revenue)
                              .map(item => (
                                <tr key={item.id} className="border-b border-white hover:bg-[#fff5f5]/50 transition-colors">
                                  <td className="py-4 px-6 font-bold text-gray-900">{item.name}</td>
                                  <td className="py-4 px-4 text-center text-gray-500 font-bold">₹{item.price}</td>
                                  <td className="py-4 px-4 text-center">
                                    <span className="bg-white border border-gray-100 px-3 py-1 text-sm font-black text-gray-700">
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right font-black text-gray-900">{formatCurrency(item.revenue)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden divide-y divide-gray-100">
                         {Object.values(category.items)
                            .sort((a, b) => b.revenue - a.revenue)
                            .map(item => (
                              <div key={item.id} className="p-4 flex items-center justify-between">
                                 <div className="max-w-[180px]">
                                    <p className="font-bold text-sm text-gray-900 leading-tight">{item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.quantity} x {formatCurrency(item.price)}</p>
                                 </div>
                                 <p className="font-black text-gray-900 text-sm align-bottom">{formatCurrency(item.revenue)}</p>
                              </div>
                            ))
                         }
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'items' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 p-6">
                 <h2 className="text-base font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                    <StarIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Most Popular Products
                 </h2>
                 <div className="space-y-4">
                    {topItems.map((item, index) => (
                       <div key={item.id} className="flex items-center gap-4 group">
                          <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center font-black text-xs ${
                             index === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' :
                             index === 1 ? 'bg-slate-300 text-gray-600' :
                             index === 2 ? 'bg-[#f87171] text-white' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-gray-50 px-2 py-0.5 font-bold text-gray-500">{item.totalQuantity} Units</span>
                                <span className="text-[10px] text-gray-400">@ {formatCurrency(item.price)}</span>
                             </div>
                          </div>
                          <p className="font-black text-gray-900 text-sm">{formatCurrency(item.totalRevenue)}</p>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="bg-white border border-gray-200 p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                  <div className="bg-[#ec2b25]/5 p-6 rounded-full">
                    <ArrowUpRight className="w-12 h-12 text-[#ec2b25]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Performance Trend</h3>
                    <p className="text-gray-500 text-sm max-w-[240px]">Analyzing these items shows a strong demand for your top 3 signature products.</p>
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'payments' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6">
                 <h3 className="text-base font-black text-gray-900 uppercase tracking-tight mb-8">Revenue by Method</h3>
                 <div className="space-y-8">
                    {[
                      { label: 'Cash Payments', count: paymentStats.cash, color: 'emerald', icon: '💵' },
                      { label: 'Online / UPI', count: paymentStats.upi, color: 'blue', icon: '📱' },
                      { label: 'Debit/Credit Cards', count: paymentStats.card, color: 'indigo', icon: '💳' },
                      { label: 'Split Transactions', count: paymentStats.split, color: 'amber', icon: '✂️' }
                    ].map((pay, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-3 font-bold text-gray-600">
                             <span className="text-xl">{pay.icon}</span>
                             {pay.label}
                           </div>
                           <span className="font-black text-gray-900">{pay.count} <span className="text-[10px] text-gray-400">Bills</span></span>
                        </div>
                        <div className="w-full bg-gray-50 h-2">
                           <div 
                              className={`h-full transition-all duration-1000 ${
                                pay.color === 'emerald' ? 'bg-emerald-500' :
                                pay.color === 'blue' ? 'bg-blue-500' :
                                pay.color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${stats.totalOrders > 0 ? (pay.count / stats.totalOrders) * 100 : 0}%` }}
                           ></div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="bg-[#111827] p-8 text-white flex flex-col justify-between">
                  <div className="space-y-4">
                    <PieIcon className="w-12 h-12 text-[#ec2b25]" />
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter">Instant Analysis</h3>
                      <p className="text-gray-400 text-sm font-medium leading-relaxed mt-2">
                        Your payment distribution indicates how customers prefer to pay.
                        Dominant methods suggest where to optimize for speed.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                     <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Average Bill</p>
                        <p className="text-2xl font-black text-white">{formatCurrency(stats.avgOrderValue)}</p>
                     </div>
                     <ArrowUpRight className="w-8 h-8 text-white/20" />
                  </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const NoDataPlaceholder = () => (
  <div className="text-center py-24 bg-white border border-dashed border-gray-200 p-12">
    <div className="w-20 h-20 bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-6">
      <Search className="w-10 h-10" />
    </div>
    <h3 className="text-lg font-bold text-gray-900">Quiet for this period</h3>
    <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">No paid transactions found during these dates. Try selecting a broader range.</p>
  </div>
);

export default Reports;
