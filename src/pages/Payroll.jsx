import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Plus, X, Users, IndianRupee, Calendar, SquarePen, Trash2, Loader2 } from 'lucide-react';
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
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchStaff();
      fetchPayrolls();
    }
  }, [selectedRestaurant, selectedMonth, selectedYear]);

  const fetchStaff = async () => {
    if (!selectedRestaurant) return;
    try {
      const staffSnap = await getDocs(
        query(collection(db, 'staff'), where('restaurantId', '==', selectedRestaurant.id))
      );
      const staffList = staffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaff(staffList);
      
      const initialSalaries = {};
      staffList.forEach(s => {
        initialSalaries[s.id] = s.salary || 0;
      });
      setSalaries(initialSalaries);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    }
  };

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

  const handleSalaryChange = (staffId, value) => {
    setSalaries({
      ...salaries,
      [staffId]: parseFloat(value) || 0
    });
  };

  const handleSavePayroll = async () => {
    try {
      const hasValidSalary = Object.values(salaries).some(salary => salary > 0);
      if (!hasValidSalary) {
        toast.error('Please enter at least one salary amount');
        return;
      }

      const existingPayrollCount = payrolls.length;
      // In add mode, we usually don't want to double pay. 
      // But the original code allowed it if payrolls was empty for that month.

      const payrollPromises = staff.map(async (s) => {
        const salary = salaries[s.id] || 0;
        if (salary > 0) {
          // Check if this specific staff already has payroll for this month
          const exists = payrolls.some(p => p.staffId === s.id);
          if (exists) return null;

          return addDoc(collection(db, 'payrolls'), {
            staffId: s.id,
            staffName: s.name,
            staffEmail: s.email,
            salary: salary,
            month: selectedMonth,
            year: selectedYear,
            monthName: months[selectedMonth],
            restaurantId: selectedRestaurant.id,
            createdAt: new Date().toISOString(),
          });
        }
      });

      await Promise.all(payrollPromises.filter(Boolean));
      
      toast.success('Payroll saved successfully');
      setShowModal(false);
      fetchPayrolls();
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Failed to save payroll');
    }
  };

  const handleEditPayroll = (payroll) => {
    setEditingPayroll(payroll);
    setSalaries({ [payroll.staffId]: payroll.salary });
    setShowModal(true);
  };

  const handleUpdatePayroll = async () => {
    try {
      const newSalary = salaries[editingPayroll.staffId];
      if (!newSalary || newSalary <= 0) {
        toast.error('Please enter a valid salary amount');
        return;
      }

      await updateDoc(doc(db, 'payrolls', editingPayroll.id), {
        salary: parseFloat(newSalary),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Payroll updated successfully');
      setShowModal(false);
      setEditingPayroll(null);
      fetchPayrolls();
    } catch (error) {
      console.error('Error updating payroll:', error);
      toast.error('Failed to update payroll');
    }
  };

  const handleDeletePayroll = async (payrollId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete payroll for ${staffName}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'payrolls', payrollId));
      toast.success('Payroll deleted successfully');
      fetchPayrolls();
    } catch (error) {
      console.error('Error deleting payroll:', error);
      toast.error('Failed to delete payroll');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTotalPayroll = () => {
    return payrolls.reduce((sum, p) => sum + (parseFloat(p.salary) || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ec2b25] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payroll...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Summary */}
      <div className="bg-white border border-gray-200 p-3 md:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">{months[selectedMonth]} {selectedYear} Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
          <div className="bg-blue-50 border border-blue-200 p-2 md:p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Total Staff</p>
            <p className="text-lg md:text-xl font-bold text-blue-700">{staff.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-2 md:p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Paid</p>
            <p className="text-lg md:text-xl font-bold text-green-700">{payrolls.length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">Pending</p>
            <p className="text-lg md:text-xl font-bold text-yellow-700">{staff.length - payrolls.length}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-2 md:p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">Total Amount</p>
            <p className="text-lg md:text-xl font-bold text-purple-700">₹{getTotalPayroll().toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight italic">Payroll Control</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{selectedRestaurant?.name}</p>
        </div>

        <button
          onClick={() => {
            setEditingPayroll(null);
            const initialSalaries = {};
            staff.forEach(s => initialSalaries[s.id] = s.salary || 0);
            setSalaries(initialSalaries);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#ec2b25] text-white px-6 py-3 font-black uppercase text-sm hover:bg-[#d12520] transition-transform active:scale-95 cursor-pointer shadow-lg shadow-rose-200"
        >
          <Plus className="w-5 h-5" />
          <span>Pay Salaries</span>
        </button>
      </div>

      <div className="bg-white border-2 border-gray-100 p-4 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 font-black text-xs uppercase tracking-widest">Period Select</span>
          </div>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border-2 border-gray-100 px-4 py-2 bg-gray-50 text-gray-700 font-bold text-sm focus:outline-none focus:border-[#ec2b25] appearance-none cursor-pointer"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border-2 border-gray-100 px-4 py-2 bg-gray-50 text-gray-700 font-bold text-sm focus:outline-none focus:border-[#ec2b25] appearance-none cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
            {months[selectedMonth]} {selectedYear} Disbursement Audit
          </h2>
          <span className="bg-white border border-gray-200 px-3 py-1 text-xs font-black text-gray-900 shadow-sm">
            {payrolls.length} Entries
          </span>
        </div>

        {payrolls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-black tracking-widest text-gray-400">
                  <th className="px-6 py-4">Staff Asset</th>
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4 text-center">Allocation</th>
                  <th className="px-6 py-4">Date/Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center rounded-full text-xs font-black text-gray-500 group-hover:bg-[#ec2b25] group-hover:text-white transition-colors">
                          {payroll.staffName.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-900">{payroll.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {payroll.staffEmail}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-[#ec2b25]">{formatCurrency(payroll.salary)}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                      {new Date(payroll.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditPayroll(payroll)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePayroll(payroll.id, payroll.staffName)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 flex items-center justify-center mx-auto rounded-3xl">
              <IndianRupee className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-gray-900 font-bold uppercase tracking-tight">Zero Disbursements</p>
              <p className="text-gray-400 text-xs font-medium max-w-[240px] mx-auto mt-1">No active payroll recorded for this period. Start disbursement by clicking 'Pay Salaries'.</p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-white">
            <div className="p-6 bg-[#111827] text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  {editingPayroll ? 'Modify Record' : 'Disbursement Audit'}
                </h2>
                <p className="text-rose-500 font-black text-xs uppercase tracking-[0.2em] mt-1">
                  {editingPayroll ? `Editing Allocation for ${editingPayroll.staffName}` : `${months[selectedMonth]} ${selectedYear} Batch`}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingPayroll(null); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="space-y-3">
                {editingPayroll ? (
                  <div className="bg-white border-2 border-[#ec2b25] p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1">
                        <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight">{editingPayroll.staffName}</h3>
                        <p className="text-xs text-gray-500 font-bold">{editingPayroll.staffEmail}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 border border-gray-200">
                        <span className="text-gray-400 font-black text-lg">₹</span>
                        <input
                          type="number"
                          value={salaries[editingPayroll.staffId] || ''}
                          onChange={(e) => handleSalaryChange(editingPayroll.staffId, e.target.value)}
                          className="bg-transparent text-gray-900 font-black text-xl w-32 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  staff.length > 0 ? (
                    staff.map((s) => (
                      <div key={s.id} className={`bg-white border p-5 transition-shadow hover:shadow-md ${salaries[s.id] > 0 ? 'border-[#ec2b25]' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex-1">
                             <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#ec2b25]" />
                                <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight">{s.name}</h3>
                             </div>
                             <p className="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-widest">{s.role || 'Staff Member'}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 border border-gray-100">
                            <span className="text-gray-400 font-black text-lg">₹</span>
                            <input
                              type="number"
                              value={salaries[s.id] || ''}
                              onChange={(e) => handleSalaryChange(s.id, e.target.value)}
                              placeholder="0"
                              className="bg-transparent text-gray-900 font-black text-xl w-32 focus:outline-none placeholder:text-gray-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-white border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-bold">No registered staff found in this restaurant.</p>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Batch Total</span>
                <span className="text-3xl font-black text-gray-900">
                  {formatCurrency(Object.values(salaries).reduce((sum, sal) => sum + (parseFloat(sal) || 0), 0))}
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => { setShowModal(false); setEditingPayroll(null); }}
                  className="px-8 py-3 bg-gray-100 text-gray-500 font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={editingPayroll ? handleUpdatePayroll : handleSavePayroll}
                  disabled={staff.length === 0}
                  className="px-10 py-4 bg-[#ec2b25] text-white font-black uppercase text-sm tracking-tighter hover:bg-[#d12520] transition-transform active:scale-95 cursor-pointer shadow-lg shadow-rose-100 disabled:opacity-50"
                >
                  {editingPayroll ? 'Update Allocation' : 'Commit Disbursement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
