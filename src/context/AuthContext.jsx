import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDescope } from '@descope/react-sdk';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const sdk = useDescope();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRestaurants, setUserRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, check if there's an existing Descope session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try to get session token
        const sessionToken = sdk.getSessionToken?.();
        const isExpired = sessionToken ? sdk.isSessionTokenExpired?.(sessionToken) : true;
        
        if (sessionToken && !isExpired) {
          // Session exists — fetch user info from Descope
          const meResponse = await sdk.me();
          if (meResponse.ok && meResponse.data) {
            setUser(meResponse.data);
            setIsAuthenticated(true);
            await fetchUserRestaurants(meResponse.data);
            return;
          }
        }
      } catch (e) {
        console.log('No existing Descope session:', e.message || e);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const sendOTP = async (phoneNumber) => {
    try {
      const response = await sdk.otp.signUpOrIn.sms(phoneNumber);
      if (response.ok) {
        toast.success('OTP sent successfully!');
        return true;
      } else {
        console.error("Descope Error:", response.error);
        toast.error('Failed to send OTP: ' + response.error.errorMessage);
        return false;
      }
    } catch (error) {
      console.error('OTP Send Error:', error);
      toast.error('Connection error. Please try again.');
      return false;
    }
  };

  const verifyOTP = async (phoneNumber, code) => {
    try {
      const response = await sdk.otp.verify.sms(phoneNumber, code);
      if (response.ok) {
        // Extract user from verify response
        const verifiedUser = response.data?.user;
        if (verifiedUser) {
          setUser(verifiedUser);
          setIsAuthenticated(true);
          toast.success('Login successful!');
          // Fetch restaurants in background
          fetchUserRestaurants(verifiedUser);
          return true;
        }
      } else {
        toast.error('Verification failed: ' + response.error?.errorMessage);
        return false;
      }
    } catch (error) {
      console.error('OTP Verify Error:', error);
      toast.error('Invalid OTP. Please try again.');
      return false;
    }
  };

  const fetchUserRestaurants = async (dUser) => {
    if (!dUser) return;
    const uid = dUser.userId;
    const phoneNumber = dUser.phone || dUser.verifiedPhone || '';
    
    try {
      setLoading(true);
      let userRef = doc(db, 'users', uid);
      let userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newUser = {
          uid,
          phoneNumber: phoneNumber,
          email: dUser.email || '',
          name: dUser.name || '',
          createdAt: new Date().toISOString(),
          onboarded: false
        };
        await setDoc(userRef, newUser);
        setUserData(newUser);
      } else {
        setUserData(userSnap.data());
      }

      const ownerQuery = query(collection(db, 'restaurants'), where('ownerId', '==', uid));
      const ownerSnap = await getDocs(ownerQuery);
      const owned = ownerSnap.docs.map(d => ({ id: d.id, ...d.data(), role: 'owner' }));

      let staffOf = [];
      if (phoneNumber) {
        const staffQuery = query(collection(db, 'restaurants'), where('staffPhoneNumbers', 'array-contains', phoneNumber));
        const staffSnap = await getDocs(staffQuery);
        staffOf = staffSnap.docs.map(d => {
          const data = d.data();
          const staffMember = data.staffMembers?.find(s => s.phoneNumber === phoneNumber);
          return { 
            id: d.id, 
            ...data, 
            role: 'staff',
            permissions: staffMember?.permissions || [] 
          };
        });
      }

      // Combine and filter duplicates, prioritizing owner role
      const restaurantsMap = new Map();
      owned.forEach(res => restaurantsMap.set(res.id, res));
      staffOf.forEach(res => {
        if (!restaurantsMap.has(res.id)) {
          restaurantsMap.set(res.id, res);
        }
      });
      
      const all = Array.from(restaurantsMap.values());
      setUserRestaurants(all);

      if (all.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(all[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Firestore fetch error:', error);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await sdk.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setSelectedRestaurant(null);
    setUserRestaurants([]);
    setUserData(null);
  };

  const getActiveSubscription = (restaurant) => {
    if (!restaurant) return { isActive: false, status: 'inactive', endDate: null };
    const now = new Date();
    const endDate = restaurant.endDate ? new Date(restaurant.endDate) : null;
    const isActive = restaurant.subscriptionStatus === 'active' && (!endDate || endDate > now);
    return { isActive, status: restaurant.subscriptionStatus || 'inactive', endDate };
  };

  const value = {
    user,
    userData,
    userRestaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    loading,
    logout,
    sendOTP,
    verifyOTP,
    getActiveSubscription,
    refreshUser: () => user && fetchUserRestaurants(user),
    isAuthenticated,
    hasAccess: (menuValue) => {
      if (!selectedRestaurant) return false;
      if (selectedRestaurant.role === 'owner') return true;
      return selectedRestaurant.permissions?.includes(menuValue);
    },
    isSubscriptionActive: () => {
      const sub = getActiveSubscription(selectedRestaurant);
      return sub.isActive;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
