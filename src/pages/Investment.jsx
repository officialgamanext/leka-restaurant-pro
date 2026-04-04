import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Modal from '../components/UI/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CATEGORY_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Renovation', value: 'renovation' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Other', value: 'other' },
];

const PAGE_SIZE = 42;

const Investment = () => {
  const { selectedRestaurant } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', amount: '', staff: '' });
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRestaurant) return;
    setLoading(true);
    const q = query(
      collection(db, 'investments'), 
      where('restaurantId', '==', selectedRestaurant.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvestments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [selectedRestaurant]);

  const handleOpenModal = () => {
    setForm({ name: '', category: '', amount: '', staff: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.amount || !form.staff) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'investments'), {
        ...form,
        restaurantId: selectedRestaurant.id,
        amount: parseFloat(form.amount),
        createdAt: new Date().toISOString(),
      });
      setShowModal(false);
      setSaving(false);
      toast.success('Investment added');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save investment');
      setSaving(false);
    }
  };

  // Filter investments
  const filtered = investments.filter(inv => {
    const date = inv.createdAt?.slice(0, 10);
    const catMatch = !category || inv.category === category;
    const fromMatch = !fromDate || date >= fromDate;
    const toMatch = !toDate || date <= toDate;
    return catMatch && fromMatch && toMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Calculate today's investment stats
  const getInvestmentStats = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayInvestments = investments.filter(inv => inv.createdAt?.startsWith(todayStr));

    const stats = {
      total: { count: todayInvestments.length, amount: todayInvestments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) },
      equipment: { count: 0, amount: 0 },
      renovation: { count: 0, amount: 0 },
      marketing: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    };

    todayInvestments.forEach(inv => {
      const amount = parseFloat(inv.amount) || 0;
      if (inv.category === 'equipment') {
        stats.equipment.count++;
        stats.equipment.amount += amount;
      } else if (inv.category === 'renovation') {
        stats.renovation.count++;
        stats.renovation.amount += amount;
      } else if (inv.category === 'marketing') {
        stats.marketing.count++;
        stats.marketing.amount += amount;
      } else {
        stats.other.count++;
        stats.other.amount += amount;
      }
    });

    return stats;
  };

  const investmentStats = getInvestmentStats();

  return (
    <div className="space-y-6">
      {/* Today's Stats */}
      <div className="bg-white border-2 border-gray-900 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 italic">Today's Outflow Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 border-2 border-gray-900 font-bold">
            <p className="text-[10px] uppercase text-gray-500">Total</p>
            <p className="text-xl">₹{investmentStats.total.amount.toFixed(0)}</p>
          </div>
          {/* Categories simplified display */}
          <div className="p-3 bg-blue-50 border-2 border-gray-900 font-bold">
            <p className="text-[10px] uppercase text-blue-500">Equipment</p>
            <p className="text-xl text-blue-700">₹{investmentStats.equipment.amount.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-purple-50 border-2 border-gray-900 font-bold">
            <p className="text-[10px] uppercase text-purple-500">Service</p>
            <p className="text-xl text-purple-700">₹{investmentStats.renovation.amount.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-orange-50 border-2 border-gray-900 font-bold">
            <p className="text-[10px] uppercase text-orange-500">Ad/Mkt</p>
            <p className="text-xl text-orange-700">₹{investmentStats.marketing.amount.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-green-50 border-2 border-gray-900 font-bold">
            <p className="text-[10px] uppercase text-green-500">Misc</p>
            <p className="text-xl text-green-700">₹{investmentStats.other.amount.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase italic text-gray-900">Investments</h1>
        <button
          onClick={handleOpenModal}
          className="px-6 py-2 bg-[#ec2b25] text-white border-2 border-gray-900 font-black uppercase text-sm cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
        >
          Add New record
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-2 border-gray-900 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-black uppercase text-gray-400 italic">Filter by Class</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 border-2 border-gray-900 p-2 font-bold text-xs uppercase italic focus:outline-none">
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-black uppercase text-gray-400 italic">Start Period</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full mt-1 border-2 border-gray-900 p-1.5 font-bold text-xs focus:outline-none" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-black uppercase text-gray-400 italic">End Period</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full mt-1 border-2 border-gray-900 p-1.5 font-bold text-xs focus:outline-none" />
        </div>
      </div>

      {/* List */}
      <div className="bg-white border-2 border-gray-900 p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#ec2b25]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map(inv => (
              <div key={inv.id} className="border-2 border-gray-900 p-4 relative group hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase bg-gray-900 text-white px-2 py-0.5">{inv.category || 'NA'}</span>
                  <span className="text-[10px] font-bold text-gray-400">{inv.createdAt?.slice(0, 10)}</span>
                </div>
                <h3 className="font-black uppercase italic text-sm text-gray-900 mb-1">{inv.name}</h3>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter mb-4 italic">Handled by {inv.staff}</p>
                <div className="text-xl font-black text-[#ec2b25]">₹{inv.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Integration */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/60">
          <div className="bg-white w-full max-w-sm border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-lg font-black uppercase italic mb-6">Investment Entry</h2>
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase italic text-gray-400">Description</label>
                 <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border-2 border-gray-900 p-2 font-bold text-xs focus:outline-none" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-[10px] font-black uppercase italic text-gray-400">Class</label>
                   <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border-2 border-gray-900 p-2 font-bold text-xs uppercase focus:outline-none">
                     <option value="">Select</option>
                     <option value="equipment">Equipment</option>
                     <option value="renovation">Service</option>
                     <option value="marketing">Ad/Mkt</option>
                     <option value="other">Other</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase italic text-gray-400">Amount</label>
                   <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full border-2 border-gray-900 p-2 font-bold text-xs focus:outline-none" />
                 </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase italic text-gray-400">In-Charge Staff</label>
                  <input type="text" value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value }))} className="w-full border-2 border-gray-900 p-2 font-bold text-xs focus:outline-none" />
               </div>
            </div>
            <div className="flex gap-3 mt-8">
               <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-900 font-bold uppercase text-xs hover:bg-gray-100 transition-colors">Cancel</button>
               <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-gray-900 text-white font-black uppercase text-xs disabled:opacity-50">
                 {saving ? 'Processing...' : 'Authorize'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investment;
