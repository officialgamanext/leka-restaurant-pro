import React, { useState, useEffect } from 'react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AddTableModal from '../components/AddTableModal';
import toast from 'react-hot-toast';

const TablesPage = () => {
  const [showTableModal, setShowTableModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTable, setEditingTable] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '', name: '' });

  // Fetch tables from Firestore
  const fetchTables = async () => {
    try {
      const q = query(collection(db, 'tables'), orderBy('createdAt', 'desc'));
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
    fetchTables();
  }, []);

  // Save table to Firestore
  const handleSaveTable = async (tableIdOrData, tableData) => {
    try {
      if (typeof tableIdOrData === 'string') {
        // Edit mode
        await updateDoc(doc(db, 'tables', tableIdOrData), tableData);
        toast.success('Table updated successfully!');
      } else {
        // Add mode
        await addDoc(collection(db, 'tables'), tableIdOrData);
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
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowTableModal(true)}
            className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base flex-1 sm:flex-initial"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Section */}
      <div className="bg-white p-3 md:p-6 border border-gray-200">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">All Tables</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : tables.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
            No tables yet. Click "Add Table" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {tables.map((table) => {
              return (
                <div
                  key={table.id}
                  className="border border-gray-200 p-3 md:p-4 hover:border-gray-300 transition-colors relative"
                >
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingTable(table);
                        setShowTableModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer"
                      title="Edit table"
                    >
                      <SquarePen className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1 hover:bg-red-50 text-red-600 cursor-pointer"
                      title="Delete table"
                    >
                      <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                    </button>
                  </div>
                  <div className="pr-12">
                    <h3 className="font-medium text-sm md:text-base text-gray-900 mb-1 truncate">{table.name}</h3>
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-gray-500">{table.shortCode}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTableModal
        isOpen={showTableModal}
        onClose={() => {
          setShowTableModal(false);
          setEditingTable(null);
        }}
        onSave={handleSaveTable}
        editData={editingTable}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Confirm Delete</h2>
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span>?
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
