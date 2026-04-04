import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Plus, X, DollarSign, Users, IndianRupee, Calendar, SquarePen, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Payroll = () => {
  const { selectedRestaurant } = useAuth();
  const [staff, setStaff] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaries, setSalaries] = useState({});
  const [editingPayroll, setEditingPayroll] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (selectedRestaurant) {
      // Use staff from the selected restaurant context
      const staffList = selectedRestaurant.staffMembers || [];
      setStaff(staffList);
      
      // Initialize salaries with default 0
      const initialSalaries = {};
      staffList.forEach(s => {
        initialSalaries[s.phoneNumber] = 0;
      });
      setSalaries(initialSalaries);
      
      fetchPayrolls();
    }
  }, [selectedRestaurant, selectedMonth, selectedYear]);

  const fetchPayrolls = async () => {
    if (!selectedRestaurant) return;
    try {
      setLoading(true);
      const payrollsSnap = await getDocs(
        query(
          collection(db, 'payrolls'),
          where('restaurantId', '==', selectedRestaurant.id),
          where('month', '==', selectedMonth),
          where('year', '==', selectedYear)
        )
      );
      const payrollList = payrollsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayrolls(payrollList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      setLoading(false);
    }
  };

  const handleSalaryChange = (staffPhone, value) => {
    setSalaries({
      ...salaries,
      [staffPhone]: parseFloat(value) || 0
    });
  };

  const handleSavePayroll = async () => {
    if (!selectedRestaurant) return;
    try {
      const hasValidSalary = Object.values(salaries).some(salary => salary > 0);
      if (!hasValidSalary) {
        toast.error('Please enter at least one salary amount');
        return;
      }

      const payrollPromises = staff.map(async (s) => {
        const salary = salaries[s.phoneNumber] || 0;
        if (salary > 0) {
          // Check if this specific staff already has payroll for this month
          const exists = payrolls.find(p => p.staffPhone === s.phoneNumber);
          if (!exists) {
            return addDoc(collection(db, 'payrolls'), {
              restaurantId: selectedRestaurant.id,
              staffPhone: s.phoneNumber,
              staffName: s.name,
              salary: salary,
              month: selectedMonth,
              year: selectedYear,
              monthName: months[selectedMonth],
              createdAt: new Date().toISOString(),
            });
          }
        }
      });

      await Promise.all(payrollPromises.filter(Boolean));
      toast.success('Payroll processed successfully');
      setShowModal(false);
      fetchPayrolls();
    } catch (error) {
      console.error('Save payroll error:', error);
      toast.error('Failed to save payroll');
    }
  };

  const handleUpdatePayroll = async () => {
    try {
      const newSalary = salaries[editingPayroll.staffPhone];
      if (!newSalary || newSalary <= 0) {
        toast.error('Please enter a valid salary amount');
        return;
      }

      await updateDoc(doc(db, 'payrolls', editingPayroll.id), {
        salary: parseFloat(newSalary),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Payroll updated');
      setShowModal(false);
      setEditingPayroll(null);
      fetchPayrolls();
    } catch (error) {
      console.error('Update payroll error:', error);
      toast.error('Failed to update');
    }
  };

  const handleDeletePayroll = async (payrollId, staffName) => {
    if (!window.confirm(`Delete payroll for ${staffName}?`)) return;
    try {
      await deleteDoc(doc(db, 'payrolls', payrollId));
      toast.success('Deleted');
      fetchPayrolls();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-[#ec2b25] animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Processing Disbursement Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 italic uppercase">Payroll</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{months[selectedMonth]} {selectedYear} Cycle</p>
        </div>

        <button
          onClick={() => {
            setEditingPayroll(null);
            setShowModal(true);
          }}
          className="px-6 py-2 bg-[#ec2b25] text-white border-2 border-gray-900 font-black uppercase text-sm cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
        >
          Add DISBURSEMENT
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase italic mb-1">Total Payout</p>
          <p className="text-2xl font-black text-[#ec2b25]">{formatCurrency(payrolls.reduce((s, p) => s + (p.salary || 0), 0))}</p>
        </div>
        <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase italic mb-1">Staff Paid</p>
          <p className="text-2xl font-black">{payrolls.length} / {staff.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-gray-900 p-3 flex flex-wrap gap-4 items-center">
         <Calendar className="w-4 h-4 ml-2" />
         <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-black uppercase italic focus:ring-0 cursor-pointer">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
         </select>
         <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-black uppercase italic focus:ring-0 cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
         </select>
      </div>

      {/* List */}
      <div className="bg-white border-2 border-gray-900">
        {payrolls.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-bold uppercase italic text-xs tracking-widest">No payroll records for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#111827] text-white border-b-2 border-gray-900">
                <tr className="text-[10px] font-black uppercase tracking-widest italic">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Disbursement</th>
                  <th className="px-6 py-4">Authorization Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-100 font-bold italic">
                {payrolls.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{p.staffName}</p>
                      <p className="text-[10px] text-gray-400">{p.staffPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-[#ec2b25]">₹{p.salary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditPayroll(p)} className="p-2 text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-200"><SquarePen size={14}/></button>
                          <button onClick={() => handleDeletePayroll(p.id, p.staffName)} className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200"><Trash2 size={14}/></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/60">
          <div className="bg-white w-full max-w-lg border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
             <div className="p-6 border-b-2 border-gray-900 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase italic">Disbursement Ledger</h2>
                <button onClick={() => setShowModal(false)}><X/></button>
             </div>
             <div className="p-6 overflow-y-auto space-y-4">
                {editingPayroll ? (
                   <div className="border-2 border-gray-900 p-4 bg-gray-50">
                      <p className="text-[10px] font-black uppercase text-gray-400 italic">Editing Payment for</p>
                      <p className="font-black italic uppercase text-gray-900 mt-1">{editingPayroll.staffName}</p>
                      <input 
                        type="number" 
                        value={salaries[editingPayroll.staffPhone] || ''} 
                        onChange={e => handleSalaryChange(editingPayroll.staffPhone, e.target.value)}
                        className="w-full mt-4 border-2 border-gray-900 p-2 font-black text-xs"
                        placeholder="Enter modified amount"
                      />
                   </div>
                ) : (
                  staff.length === 0 ? (
                    <p className="text-center text-gray-500 italic text-sm">No staff added to this restaurant yet.</p>
                  ) : (
                    staff.map(s => (
                      <div key={s.phoneNumber} className="flex items-center justify-between p-4 border-2 border-gray-900">
                         <div className="flex-1">
                            <p className="font-black italic uppercase text-xs">{s.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{s.role}</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="font-black text-gray-400 text-sm">₹</span>
                            <input 
                              type="number" 
                              value={salaries[s.phoneNumber] || ''} 
                              onChange={e => handleSalaryChange(s.phoneNumber, e.target.value)}
                              className="w-24 border-2 border-gray-900 p-1 font-black text-xs text-center"
                              placeholder="0"
                            />
                         </div>
                      </div>
                    ))
                  )
                )}
             </div>
             <div className="p-6 border-t-2 border-gray-900 bg-gray-50 flex justify-between items-center font-black uppercase italic">
                <div className="text-xs">Aggregate: <span className="text-[#ec2b25] text-lg">₹{Object.values(salaries).reduce((a, b) => a + (parseFloat(b) || 0), 0).toLocaleString()}</span></div>
                <button onClick={editingPayroll ? handleUpdatePayroll : handleSavePayroll} className="px-6 py-3 bg-gray-900 text-white text-xs">Confirm Disbursement</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
