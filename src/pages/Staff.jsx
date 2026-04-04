import React, { useState, useEffect } from 'react';
import { Plus, Loader2, SquarePen, Trash2, Shield } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, addDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { MENU_ITEMS } from '../data/menuData';

const Staff = () => {
  const { selectedRestaurant } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    permissions: [],
  });
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    if (!selectedRestaurant) return;

    setLoading(true);
    // Fetch staff from the current restaurant's staffMembers array
    const unsub = onSnapshot(doc(db, 'restaurants', selectedRestaurant.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Filter out the owner from the staff list display if needed, or show everyone
        setStaffList(data.staffMembers || []);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedRestaurant]);

  const handleOpenModal = (staff = null) => {
    if (staff) {
      setForm({
        name: staff.name || '',
        phoneNumber: staff.phoneNumber || '',
        permissions: staff.permissions || [],
      });
      setEditingStaff(staff);
    } else {
      setForm({
        name: '',
        phoneNumber: '',
        permissions: [],
      });
      setEditingStaff(null);
    }
    setShowModal(true);
  };

  const handlePermissionChange = (value) => {
    setForm(f => ({ 
      ...f, 
      permissions: f.permissions.includes(value) 
        ? f.permissions.filter(v => v !== value) 
        : [...f.permissions, value] 
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.phoneNumber) {
      toast.error('Name and Phone Number are required');
      return;
    }

    // Format phone number
    const formattedPhone = form.phoneNumber.startsWith('+') ? form.phoneNumber : `+91${form.phoneNumber}`;
    
    setSaving(true);
    try {
      const resRef = doc(db, 'restaurants', selectedRestaurant.id);
      const resSnap = await getDoc(resRef);
      const currentData = resSnap.data();
      
      let updatedStaffMembers = [...(currentData.staffMembers || [])];
      let updatedPhoneNumbers = [...(currentData.staffPhoneNumbers || [])];

      if (editingStaff) {
        // Remove old entry
        updatedStaffMembers = updatedStaffMembers.filter(s => s.phoneNumber !== editingStaff.phoneNumber);
        updatedPhoneNumbers = updatedPhoneNumbers.filter(p => p !== editingStaff.phoneNumber);
      }

      // Add/Update entry
      updatedStaffMembers.push({
        name: form.name,
        phoneNumber: formattedPhone,
        permissions: form.permissions,
        role: 'staff'
      });
      
      if (!updatedPhoneNumbers.includes(formattedPhone)) {
        updatedPhoneNumbers.push(formattedPhone);
      }

      await updateDoc(resRef, {
        staffMembers: updatedStaffMembers,
        staffPhoneNumbers: updatedPhoneNumbers
      });

      toast.success(editingStaff ? 'Staff updated' : 'Staff added successfully');
      setShowModal(false);
    } catch (e) {
      console.error('Error saving staff:', e);
      toast.error('Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Are you sure you want to remove ${staff.name}?`)) return;
    
    try {
      const resRef = doc(db, 'restaurants', selectedRestaurant.id);
      
      await updateDoc(resRef, {
        staffMembers: arrayRemove(staff),
        staffPhoneNumbers: arrayRemove(staff.phoneNumber)
      });
      
      toast.success('Staff removed');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to remove staff');
    }
  };

  if (!selectedRestaurant || selectedRestaurant.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p>Only restaurant owners can manage staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage restaurant staff and their permissions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer font-bold w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Staff List */}
      <div className="bg-white border-2 border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Active Staff Members</h2>
          <span className="bg-gray-200 px-2 py-1 text-xs font-bold text-gray-600 rounded">
            {staffList.filter(s => s.role === 'staff').length} Total
          </span>
        </div>
        
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#ec2b25]" />
          </div>
        ) : staffList.filter(s => s.role === 'staff').length === 0 ? (
          <div className="p-20 text-center text-gray-500 font-medium">
            No staff members added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y border-t border-gray-200">
            {staffList.filter(s => s.role === 'staff').map((staff, idx) => (
              <div key={idx} className="p-6 hover:bg-gray-50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{staff.name}</h3>
                    <p className="text-gray-500 font-mono text-sm">{staff.phoneNumber}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(staff)} 
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(staff)} 
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Permissions</span>
                  <div className="flex flex-wrap gap-1">
                    {staff.permissions && staff.permissions.length > 0 ? (
                      staff.permissions.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#ec2b25]/10 text-[#ec2b25] text-[10px] font-bold rounded capitalize">
                          {MENU_ITEMS.find(m => m.value === p)?.label || p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">No permissions assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white w-full max-w-xl shadow-2xl">
            <div className="px-6 py-4 border-b-2 border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 transition-colors">
                <Plus className="w-6 h-6 rotate-45 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-2">Staff Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] font-medium"
                    placeholder="Enter 10-digit number"
                    disabled={!!editingStaff}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-4">Module Permissions</label>
                <div className="grid grid-cols-2 gap-3">
                  {MENU_ITEMS.filter(m => m.value !== 'dashboard' && m.value !== 'staff').map(m => (
                    <button
                      key={m.value}
                      onClick={() => handlePermissionChange(m.value)}
                      className={`flex items-center gap-3 p-3 border-2 text-left transition-all ${form.permissions.includes(m.value) ? 'border-[#ec2b25] bg-[#ec2b25]/5 text-[#ec2b25]' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                    >
                      <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${form.permissions.includes(m.value) ? 'border-[#ec2b25] bg-[#ec2b25]' : 'border-gray-300'}`}>
                        {form.permissions.includes(m.value) && <div className="w-1.5 h-1.5 bg-white"></div>}
                      </div>
                      <span className="text-sm font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#ec2b25] text-white py-4 font-bold hover:bg-[#d12620] transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{editingStaff ? 'Update Permissions' : 'Assign Staff Member'}</span>
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-4 border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;

