import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  ReceiptText, 
  Search, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Eye, 
  Printer,
  History,
  Clock,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';

import toast from 'react-hot-toast';
import { printThermalBill } from '../utils/qzPrint';
import { useAuth } from '../context/AuthContext';

const AllBills = () => {
  const { selectedRestaurant } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchBills();
    }
  }, [selectedRestaurant, dateFilter, customStartDate, customEndDate]);

  const fetchBills = async () => {
    if (!selectedRestaurant) return;
    try {
      setLoading(true);
      // Base query with restaurantId filter
      const q = query(
        collection(db, 'bills'), 
        where('restaurantId', '==', selectedRestaurant.id),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      let billsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply Local Date Filtering
      if (dateFilter !== 'all') {
         const { start, end } = getDateBounds(dateFilter);
         billsData = billsData.filter(bill => {
            const billDate = new Date(bill.createdAt || 0);
            return billDate >= start && billDate <= end;
         });
      }

      setBills(billsData);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const getDateBounds = (filter) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    let start, end;

    switch (filter) {
      case 'today':
        start = todayStart;
        end = todayEnd;
        break;
      case 'yesterday':
        start = new Date(todayStart);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-week':
        const dayOfWeek = now.getDay();
        start = new Date(todayStart);
        start.setDate(start.getDate() - dayOfWeek);
        end = todayEnd;
        break;
      case 'last-week':
        start = new Date(todayStart);
        start.setDate(start.getDate() - now.getDay() - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = todayEnd;
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this-year':
        start = new Date(now.getFullYear(), 0, 1);
        end = todayEnd;
        break;
      case 'last-year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(0);
        end = customEndDate ? new Date(customEndDate) : todayEnd;
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(0);
        end = todayEnd;
    }

    return { start, end };
  };

  const filteredBillsList = bills.filter(bill => 
    bill.billId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.tableName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = async (bill) => {
    try {
      toast.loading('Printing bill...');
      const billData = {
        billNo: bill.billId,
        date: new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: bill.type,
        table: bill.tableName || 'Take Away',
        items: bill.items,
        subtotal: bill.subtotal,
        discountAmount: bill.discount || 0,
        totalAmount: bill.total,
        paymentMethod: bill.paymentMethod || 'cash',
        amountReceived: bill.amountReceived || bill.total,
        change: bill.change || 0
      };
      await printThermalBill(billData);
      toast.dismiss();
      toast.success('Reprinted successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Print failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#ec2b25] p-2 text-white">
            <ReceiptText size={20} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Bills</h1>
            <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">History of transactions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:flex-none md:min-w-[300px]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search Bill ID, Table or Customer..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 text-sm focus:ring-1 focus:ring-[#ec2b25] focus:outline-none"
             />
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-gray-200 p-2 overflow-x-auto scrollbar-hide no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2">
         {[
           { id: 'today', label: 'Today' },
           { id: 'yesterday', label: 'Yesterday' },
           { id: 'this-week', label: 'This Week' },
           { id: 'last-week', label: 'Last Week' },
           { id: 'this-month', label: 'This Month' },
           { id: 'last-month', label: 'Last Month' },
           { id: 'this-year', label: 'This Year' },
           { id: 'last-year', label: 'Last Year' },
           { id: 'custom', label: 'Custom Date' },
           { id: 'all', label: 'All Bills' }
         ].map(f => (
           <button
             key={f.id}
             onClick={() => {
                setDateFilter(f.id);
                if (f.id !== 'custom') setShowCustomPicker(false);
                else setShowCustomPicker(!showCustomPicker);
             }}
             className={`px-4 py-2 text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
               dateFilter === f.id 
               ? 'bg-[#ec2b25] text-white border-[#ec2b25]' 
               : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
             }`}
           >
             {f.label}
           </button>
         ))}
      </div>

      {/* Custom Picker */}
      {showCustomPicker && (
         <div className="bg-white border border-gray-200 p-4 flex flex-col sm:flex-row items-end gap-4 max-w-lg mb-4">
            <div className="flex-1 space-y-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
               <input 
                 type="date" 
                 value={customStartDate}
                 onChange={(e) => setCustomStartDate(e.target.value)}
                 className="w-full p-2 bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-[#ec2b25]"
               />
            </div>
            <div className="flex-1 space-y-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
               <input 
                 type="date" 
                 value={customEndDate}
                 onChange={(e) => setCustomEndDate(e.target.value)}
                 className="w-full p-2 bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-[#ec2b25]"
               />
            </div>
            <button 
              onClick={() => fetchBills()}
              className="px-6 py-2 bg-[#ec2b25] text-white font-bold text-sm tracking-tight cursor-pointer hover:bg-[#d12620] transition-colors"
            >
              Apply Filter
            </button>
         </div>
      )}

      {/* Bills Table */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden mb-6">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
             <Loader2 size={40} className="text-[#ec2b25] animate-spin" />
             <p className="text-gray-400 font-bold tracking-widest text-xs uppercase">Loading Archive...</p>
          </div>
        ) : filteredBillsList.length === 0 ? (
          <div className="p-20 text-center space-y-4">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <History size={32} />
             </div>
             <div className="max-w-xs mx-auto">
               <h3 className="text-gray-900 font-bold">No bills found</h3>
               <p className="text-gray-400 text-xs mt-1 leading-tight">We couldn't find any transactions for the selected criteria.</p>
             </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 italic">Bill ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800">Customer / Table</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 text-center">Qty</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 text-right">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBillsList.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors group italic">
                    <td className="px-6 py-4 font-black text-[#ec2b25] text-sm tracking-tighter">
                      {bill.billId || '---'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-black uppercase ${
                        bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-900">
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 leading-none">
                         <LayoutGrid size={12} className="text-gray-300" />
                         {bill.tableName || 'N/A'}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{bill.customerName || 'Walk-in Customer'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black bg-gray-50 px-2 py-1 text-gray-600">
                        {bill.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-gray-900">₹{Math.round(bill.total || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-tight">{bill.paymentMethod || 'Pending'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                         <button 
                           onClick={() => handlePrint(bill)}
                           className="p-2 text-gray-400 hover:text-[#ec2b25] hover:bg-red-50 transition-all cursor-pointer"
                           title="Reprint Bill"
                         >
                            <Printer size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Meta */}
      {!loading && filteredBillsList.length > 0 && (
         <div className="bg-[#111827] p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between text-white border-t border-[#ec2b25]">
            <div className="flex items-center gap-6">
               <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Sales Count</p>
                  <p className="text-xl font-black">{filteredBillsList.length} <span className="text-xs font-medium text-gray-500 tracking-normal italic">Authorized Bills</span></p>
               </div>
            </div>
            <div className="space-y-0.5 text-right mt-4 md:mt-0">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aggregate Revenue</p>
               <p className="text-2xl font-black text-[#ec2b25]">₹{Math.round(filteredBillsList.reduce((sum, b) => sum + (b.total || 0), 0)).toLocaleString()}</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default AllBills;
