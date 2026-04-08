import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Building2, Plus, LogOut, CheckCircle2, AlertCircle, Mail, Phone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/Onboarding.css';

const Onboarding = () => {
  const { user, userRestaurants, setSelectedRestaurant, logout, refreshUser, loading: authLoading } = useAuth();
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // When restaurants finish loading, decide what to show
  useEffect(() => {
    if (!authLoading) {
      if (userRestaurants.length === 0) {
        setShowAddBusiness(true);
      } else {
        setShowAddBusiness(false);
      }
    }
  }, [authLoading, userRestaurants]);

  // Map Descope user fields to what the app expects
  const userPhone = user?.phone || '';

  const handleAddBusiness = async (e) => {
    e.preventDefault();
    if (!businessName || !address) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const restaurantData = {
        name: businessName,
        address: address,
        ownerId: user?.userId,
        ownerPhone: userPhone,
        subscriptionStatus: 'inactive',
        startDate: null,
        endDate: null,
        staffPhoneNumbers: [],
        staffMembers: [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'restaurants'), restaurantData);
      
      await updateDoc(doc(db, 'users', user?.userId), {
        restaurantIds: arrayUnion(docRef.id)
      });

      toast.success('Business added successfully!');
      await refreshUser();
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
    const isActive = res.subscriptionStatus === 'active' && res.endDate && new Date() < new Date(res.endDate);
    if (isActive) {
      setSelectedRestaurant(res);
      navigate('/');
    } else {
      toast.error('Subscription inactive or expired. Please contact support.');
    }
  };

  if (authLoading) {
    return (
      <div className="spinner-container">
        <div className="custom-spinner"></div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Syncing your businesses...</p>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <div className="onboarding-welcome">
            <h1>Welcome back</h1>
            <p>{userPhone}</p>
          </div>
          <div className="logout-link" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </div>
        </div>

        <div className="onboarding-card">
          {showAddBusiness ? (
            <div>
              <div className="section-title-row">
                <h2 className="section-title">
                  <div className="res-icon-box" style={{ color: '#ec2b25' }}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  Add Your Business
                </h2>
              </div>

              <form onSubmit={handleAddBusiness} className="space-y-6">
                <div className="input-group">
                  <label className="input-label">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. Leka Restaurant"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Physical Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '1rem', height: '100px', resize: 'none' }}
                    placeholder="Enter complete business location"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" disabled={loading} className="submit-button" style={{ flex: 1 }}>
                    {loading ? <div className="spinner"></div> : <span>Create Business</span>}
                  </button>
                  
                  {userRestaurants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddBusiness(false)}
                      className="back-button"
                      style={{ marginTop: 0, width: 'auto', padding: '0 1.5rem' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="section-title-row">
                <h2 className="section-title">Select Restaurant</h2>
                <button onClick={() => setShowAddBusiness(true)} className="add-new-btn">
                  <Plus className="w-4 h-4" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="restaurant-list">
                {userRestaurants.map((res) => {
                  const isActive = res.subscriptionStatus === 'active' && res.endDate && new Date() < new Date(res.endDate);
                  
                  return (
                    <button
                      key={res.id}
                      onClick={() => handleSelectRestaurant(res)}
                      className={`restaurant-item ${!isActive ? 'inactive' : ''}`}
                    >
                      <div className="res-info-main">
                        <div className="res-icon-box">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="res-name">{res.name}</h3>
                          <p className="res-address">{res.address}</p>
                          <div className="res-badges">
                            <span className={`badge ${res.role === 'owner' ? 'badge-owner' : 'badge-staff'}`}>
                              {res.role}
                            </span>
                            {isActive ? (
                              <span className="badge badge-active">Active</span>
                            ) : (
                              <span className="badge badge-expired">Inactive</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5" style={{ color: '#cbd5e1' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <div className="support-contacts">
            <div className="contact-item">
              <div className="contact-icon">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="contact-label">Helpline</p>
                <p className="contact-value">+91 91544 51336</p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="contact-label">Email Support</p>
                <p className="contact-value">officialgamanext@gmail.com</p>
              </div>
            </div>
          </div>
          <div className="premium-tag">
            <p className="premium-label">Premium Support</p>
            <p className="premium-desc">Available 24/7 for you</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

