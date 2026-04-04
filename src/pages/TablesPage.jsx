import React, { useState, useEffect } from 'react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import AddTableModal from '../components/AddTableModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const TablesPage = () => {
  const { selectedRestaurant } = useAuth();
  const [showTableModal, setShowTableModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTable, setEditingTable] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '', name: '' });

  // Fetch tables from Firestore
  const fetchTables = async () => {
    if (!selectedRestaurant) return;
    try {
      const q = query(
        collection(db, 'tables'), 
        where('restaurantId', '==', selectedRestaurant.id),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const tablesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRestaurant) {
      fetchTables();
    }
  }, [selectedRestaurant]);

  // Save table to Firestore
  const handleSaveTable = async (tableIdOrData, tableData) => {
    try {
      if (typeof tableIdOrData === 'string') {
        // Edit mode
        await updateDoc(doc(db, 'tables', tableIdOrData), tableData);
        toast.success('Table updated successfully!');
      } else {
        // Add mode
        await addDoc(collection(db, 'tables'), {
          ...tableIdOrData,
          restaurantId: selectedRestaurant.id,
          createdAt: new Date().toISOString()
        });
        toast.success('Table added successfully!');
      }
      fetchTables();
      setEditingTable(null);
    } catch (error) {
      console.error('Error saving table:', error);
      toast.error('Failed to save table');
    }
  };

  // Delete table from Firestore
  const handleDeleteTable = async (tableId) => {
    const table = tables.find(t => t.id === tableId);
    setDeleteConfirm({
      show: true,
      type: 'table',
      id: tableId,
      name: table ? `${table.shortCode} - ${table.name}` : 'this table'
    });
  };

  // Confirm delete table
  const confirmDeleteTable = async () => {
    try {
      await deleteDoc(doc(db, 'tables', deleteConfirm.id));
      fetchTables();
      toast.success('Table deleted successfully!');
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    } finally {
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    }
  };

  const tableStats = {
    totalTables: tables.length,
    totalCapacity: tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Tables Stats */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Tables Summary</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Total Tables</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{tableStats.totalTables}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tables Management</h1>
        <button
          onClick={() => setShowTableModal(true)}
          className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base w-full sm:w-auto"
        >
          <Plus className="w-3 md:w-4 h-3 md:h-4" />
          <span>Add Table</span>
        </button>
      </div>

      {/* Tables List Section */}
      <div className="bg-white border border-gray-200 p-3 md:p-6">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Tables List</h2>
        {loading ? (
          <div className="text-center py-6 md:py-8">Loading...</div>
        ) : tables.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">No tables found. Click "Add Table" to create one.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {tables.map(table => (
              <div key={table.id} className="border border-gray-200 p-3 md:p-4 hover:border-[#ec2b25] transition-colors relative flex flex-col items-center justify-center min-h-[100px] md:min-h-[120px]">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => { setEditingTable(table); setShowTableModal(true); }} className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer">
                    <SquarePen className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTable(table.id)} className="p-1 hover:bg-red-50 text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-mono font-bold text-lg md:text-xl text-[#ec2b25] mb-1">{table.shortCode}</div>
                <div className="text-xs md:text-sm text-gray-500 text-center">{table.name}</div>
                <div className="text-xs text-gray-400 mt-2">Capacity: {table.capacity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AddTableModal
        isOpen={showTableModal}
        onClose={() => { setShowTableModal(false); setEditingTable(null); }}
        onSave={handleSaveTable}
        editData={editingTable}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-[rgba(0,0,0,0.5)]">
          <div className="bg-white w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Confirm Delete</h2>
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
              Are you sure you want to delete table <span className="font-semibold">{deleteConfirm.name}</span>?
            </p>
            <div className="flex justify-end space-x-2 md:space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: '', name: '' })}
                className="px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTable}
                className="px-3 md:px-4 py-2 text-sm md:text-base bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablesPage;
