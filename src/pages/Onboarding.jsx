import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Building2, Plus, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Onboarding = () => {
  const { user, userRestaurants, selectRestaurant, logout, fetchUserRestaurants } = useAuth();
  const [showAddBusiness, setShowAddBusiness] = useState(userRestaurants.length === 0);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddBusiness = async (e) => {
    e.preventDefault();
    if (!businessName || !address) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Restaurant Document
      const restaurantData = {
        name: businessName,
        address: address,
        ownerId: user.uid,
        ownerPhone: user.phoneNumber,
        subscriptionStatus: 'inactive',
        startDate: null,
        endDate: null,
        staffPhoneNumbers: [user.phoneNumber],
        staffMembers: [
          {
            phoneNumber: user.phoneNumber,
            role: 'owner',
            name: 'Owner',
            permissions: []
          }
        ],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'restaurants'), restaurantData);
      
      // 2. Update User Document
      await updateDoc(doc(db, 'users', user.uid), {
        restaurantIds: arrayUnion(docRef.id)
      });

      toast.success('Business added successfully!');
      
      // Refresh user restaurants
      await fetchUserRestaurants(user);
      setShowAddBusiness(false);
      setBusinessName('');
      setAddress('');
      
    } catch (error) {
      console.error('Error adding business:', error);
      toast.error('Failed to add business');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = (res) => {
    const isSubscriptionActive = () => {
      if (res.subscriptionStatus !== 'active') return false;
      if (!res.endDate) return false;
      return new Date() < new Date(res.endDate);
    };

    if (isSubscriptionActive()) {
      selectRestaurant(res);
      navigate('/');
    } else {
      toast.error('Subscription inactive or expired. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
            <p className="text-gray-600">{user?.phoneNumber}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-600 hover:text-[#ec2b25] transition-colors font-medium px-4 py-2 border-2 border-gray-200 bg-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {showAddBusiness ? (
          <div className="bg-white border-2 border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#ec2b25] text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add Your Business</h2>
            </div>

            <form onSubmit={handleAddBusiness} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant / Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors"
                  placeholder="e.g. Leka Restaurant"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors h-32"
                  placeholder="Enter complete business address"
                  required
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#ec2b25] text-white py-4 font-bold hover:bg-[#d12620] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Business</span>
                    </>
                  )}
                </button>
                
                {userRestaurants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddBusiness(false)}
                    className="px-6 py-4 border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select Restaurant</h2>
              <button
                onClick={() => setShowAddBusiness(true)}
                className="flex items-center gap-2 text-[#ec2b25] font-bold hover:underline"
              >
                <Plus className="w-4 h-4" />
                <span>Add New</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {userRestaurants.map((res) => {
                const isActive = res.subscriptionStatus === 'active' && res.endDate && new Date() < new Date(res.endDate);
                
                return (
                  <button
                    key={res.id}
                    onClick={() => handleSelectRestaurant(res)}
                    className={`flex items-center justify-between p-6 bg-white border-2 transition-all text-left ${isActive ? 'border-gray-200 hover:border-[#ec2b25] cursor-pointer' : 'border-gray-100 opacity-75'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{res.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-1">{res.address}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${res.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {res.role}
                          </span>
                          {isActive ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Active until {new Date(res.endDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Inactive / Expired
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
