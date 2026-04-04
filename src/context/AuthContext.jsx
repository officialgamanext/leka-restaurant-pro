import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, useUser, useDescope } from '@descope/react-sdk';
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
  const { isSessionLoading, sessionToken, authenticated } = useSession();
  const { user: descopeUser, isUserLoading } = useUser();
  const sdk = useDescope();
  const [userData, setUserData] = useState(null);
  const [userRestaurants, setUserRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSessionLoading && !isUserLoading) {
      if (authenticated && descopeUser) {
        fetchUserRestaurants(descopeUser);
      } else {
        setUserData(null);
        setUserRestaurants([]);
        setSelectedRestaurant(null);
        setLoading(false);
      }
    }
  }, [authenticated, descopeUser, isSessionLoading, isUserLoading]);

  // NEW: Descope Custom OTP Logic to replace Firebase
  const sendOTP = async (phoneNumber) => {
    try {
      const response = await sdk.otp.signUpOrIn.sms(phoneNumber);
      if (response.ok) {
        toast.success('Descope OTP sent successfully!');
        return true;
      } else {
        console.error("Descope Error:", response.error);
        toast.error('Failed to send OTP: ' + response.error.errorMessage);
        return false;
      }
    } catch (error) {
      console.error('OTP Send Error:', error);
      toast.error('Connection error with Descope Identity.');
      return false;
    }
  };

  const verifyOTP = async (phoneNumber, code) => {
    try {
      const response = await sdk.otp.verify.sms(phoneNumber, code);
      if (response.ok) {
        toast.success('Login authorized!');
        // Note: useSession and useUser hooks will automatically update
        // once the SDK manages the new session cookies/tokens.
        return true;
      } else {
        toast.error('Verification failed: ' + response.error.errorMessage);
        throw response.error;
      }
    } catch (error) {
       console.error('OTP Verify Error:', error);
       toast.error('Invalid code. Please try again.');
       throw error;
    }
  };

  const fetchUserRestaurants = async (dUser) => {
    if (!dUser) return;
    const uid = dUser.userId;
    const phoneNumber = dUser.phone;
    
    try {
      setLoading(true);
      let userRef = doc(db, 'users', uid);
      let userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newUser = {
          uid,
          phoneNumber: phoneNumber || '',
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
      const owned = ownerSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'owner' }));

      let staffOf = [];
      if (phoneNumber) {
        const staffQuery = query(collection(db, 'restaurants'), where('staffPhoneNumbers', 'array-contains', phoneNumber));
        const staffSnap = await getDocs(staffQuery);
        staffOf = staffSnap.docs.map(doc => {
          const data = doc.data();
          const staffMember = data.staffMembers?.find(s => s.phoneNumber === phoneNumber);
          return { 
            id: doc.id, 
            ...data, 
            role: 'staff',
            permissions: staffMember?.permissions || [] 
          };
        });
      }

      const all = [...owned, ...staffOf];
      setUserRestaurants(all);

      if (all.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(all[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
      setLoading(false);
    }
  };

  const logout = async () => {
    await sdk.logout();
    setSelectedRestaurant(null);
    setUserRestaurants([]);
    setUserData(null);
  };

  const getActiveSubscription = (restaurant) => {
    if (!restaurant) return null;
    const now = new Date();
    const endDate = restaurant.endDate ? new Date(restaurant.endDate) : null;
    const isActive = restaurant.subscriptionStatus === 'active' && (!endDate || endDate > now);
    return { isActive, status: restaurant.subscriptionStatus || 'inactive', endDate };
  };

  const value = {
    user: descopeUser,
    userData,
    userRestaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    loading: loading || isSessionLoading || isUserLoading,
    logout,
    sendOTP,
    verifyOTP,
    getActiveSubscription,
    refreshUser: () => fetchUserRestaurants(descopeUser),
    isAuthenticated: !!authenticated,
    hasAccess: (menuValue) => {
      if (!selectedRestaurant) return false;
      if (selectedRestaurant.role === 'owner') return true;
      return selectedRestaurant.permissions?.includes(menuValue);
    },
    isSubscriptionActive: () => {
      const { isActive } = getActiveSubscription(selectedRestaurant);
      return isActive;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
