import React, { useState } from 'react';
import { X, Loader2, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const AddTableModal = ({ isOpen, onClose, onSave, editData }) => {
  const [tableName, setTableName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Update form when editData changes
  React.useEffect(() => {
    if (editData) {
      setTableName(editData.name || '');
      setShortCode(editData.shortCode || '');
    } else {
      setTableName('');
      setShortCode('');
    }
  }, [editData, isOpen]);

  const handleSave = async () => {
    if (!tableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }
    if (!shortCode.trim()) {
      toast.error('Please enter a short code');
      return;
    }

    setLoading(true);
    try {
      const tableData = {
        name: tableName,
        shortCode: shortCode.toUpperCase(),
      };

      if (editData) {
        // Editing existing table
        await onSave(editData.id, tableData);
      } else {
        // Adding new table
        tableData.createdAt = new Date().toISOString();
        await onSave(tableData);
      }

      // Reset form
      setTableName('');
      setShortCode('');
      onClose();
    } catch (error) {
      console.error('Error saving table:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white w-full max-w-md p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editData ? 'Edit Table' : 'Add Table'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Table Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
              placeholder="Enter table name"
            />
          </div>

          {/* Table Short Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Short Code
            </label>
            <input
              type="text"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
              placeholder="Enter short code (e.g., T1)"
              maxLength={10}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTableModal;
