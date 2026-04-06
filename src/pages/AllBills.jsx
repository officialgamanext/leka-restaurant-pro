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
        where('restaurantId', '==', selectedRestaurant.id)
      );

      const querySnapshot = await getDocs(q);
      let billsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#ec2b25] p-3 text-white shadow-lg">
            <ReceiptText size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">All Bills</h1>
            <p className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase">History of transactions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 md:flex-none md:min-w-[350px]">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search Bill ID, Table or Customer..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 text-sm font-medium focus:ring-0 focus:border-[#ec2b25] focus:outline-none transition-all"
             />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-2 border-gray-100 p-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
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
             className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
               dateFilter === f.id 
               ? 'bg-[#ec2b25] text-white' 
               : 'bg-transparent text-gray-500 hover:bg-gray-50'
             }`}
           >
             {f.label}
           </button>
         ))}
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
         <div className="bg-white border-2 border-gray-100 p-6 flex flex-col sm:flex-row items-end gap-4 max-w-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 space-y-2 w-full">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
               <input 
                 type="date" 
                 value={customStartDate}
                 onChange={(e) => setCustomStartDate(e.target.value)}
                 className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#ec2b25] focus:bg-white text-sm font-bold focus:outline-none transition-all"
               />
            </div>
            <div className="flex-1 space-y-2 w-full">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</label>
               <input 
                 type="date" 
                 value={customEndDate}
                 onChange={(e) => setCustomEndDate(e.target.value)}
                 className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#ec2b25] focus:bg-white text-sm font-bold focus:outline-none transition-all"
               />
            </div>
            <button 
              onClick={() => fetchBills()}
              className="px-8 py-3 bg-[#111827] text-white font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-black transition-colors min-w-[150px]"
            >
              Filter
            </button>
         </div>
      )}

      {/* Bills Table */}
      <div className="bg-white border-2 border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
             <Loader2 size={48} className="text-[#ec2b25] animate-spin" />
             <p className="text-gray-400 font-black tracking-[0.3em] text-[10px] uppercase">Retrieving Data</p>
          </div>
        ) : filteredBillsList.length === 0 ? (
          <div className="p-24 text-center space-y-4">
             <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-gray-200">
                <History size={40} />
             </div>
             <div className="max-w-xs mx-auto">
               <h3 className="text-gray-900 font-black uppercase text-sm tracking-tight">Archives Empty</h3>
               <p className="text-gray-400 text-[11px] mt-2 font-medium">No transactions match your search or filter settings.</p>
             </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Bill ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Customer / Table</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 text-center">Qty</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBillsList.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="font-black text-[#ec2b25] text-sm tracking-tighter italic">
                        {bill.billId || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider ${
                        bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[11px] font-black text-gray-900 uppercase">
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold italic lowercase">
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '---'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[11px] font-black text-gray-900 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-gray-200"></div>
                         {bill.tableName || 'N/A'}
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase font-black mt-1 tracking-tight">{bill.customerName || 'Guest'}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[11px] font-black text-gray-900 bg-gray-50 px-2 py-1">
                        {bill.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-black text-gray-900 tracking-tighter">
                        <span className="text-xs mr-0.5 font-bold italic">₹</span>
                        {Math.round(bill.total || 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.1em]">{bill.paymentMethod || 'Cash'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                         <button 
                           onClick={() => handlePrint(bill)}
                           className="p-2.5 text-gray-300 hover:text-[#ec2b25] hover:bg-[#ec2b25]/5 border border-transparent hover:border-[#ec2b25]/10 transition-all cursor-pointer"
                           title="Reprint Bill"
                         >
                            <Printer size={18} />
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

      {/* Aggregate Revenue Footer */}
      {!loading && filteredBillsList.length > 0 && (
         <div className="bg-[#111827] px-8 py-10 flex flex-col md:flex-row items-center justify-between text-white border-t-4 border-[#ec2b25] mt-10">
            <div className="flex flex-col items-center md:items-start gap-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Total Sales Count</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black">{filteredBillsList.length}</p>
                   <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Authorized Bills</p>
                </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-1 mt-8 md:mt-0">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Aggregate Revenue</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-[#ec2b25] italic">₹</span>
                  <p className="text-5xl font-black text-[#ec2b25] tracking-tighter">
                    {Math.round(filteredBillsList.reduce((sum, b) => sum + (b.total || 0), 0)).toLocaleString()}
                  </p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AllBills;
