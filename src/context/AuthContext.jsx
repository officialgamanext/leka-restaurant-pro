import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signOut, 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
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
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRestaurants, setUserRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Initialize Recaptcha
  const setupRecaptcha = (elementId) => {
    // If it already exists and is for the same element, return it
    if (window.recaptchaVerifier) {
      if (window.recaptchaVerifier.container.id === elementId) {
        return window.recaptchaVerifier;
      }
      // If it exists but for a different element, clear it
      window.recaptchaVerifier.clear();
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        // Reset verifier if expired
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      }
    });

    return window.recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber, elementId) => {
    try {
      const appVerifier = setupRecaptcha(elementId);
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      toast.success('OTP sent successfully!');
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Clear verifier on error so it can be re-initialized
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      if (error.code === 'auth/invalid-app-credential') {
        toast.error('Firebase Error: Please ensure Phone Authentication is enabled in the Firebase Console and your domain is white-listed.');
      } else {
        toast.error('Failed to send OTP: ' + error.message);
      }
      return false;
    }
  };

  const verifyOTP = async (otp) => {
    try {
      const result = await confirmationResult.confirm(otp);
      toast.success('Login successful!');
      return result.user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Invalid OTP. Please try again.');
      throw error;
    }
  };

  const fetchUserRestaurants = async (firebaseUser) => {
    const uid = firebaseUser.uid;
    const phoneNumber = firebaseUser.phoneNumber;
    
    try {
      // 1. Get restaurants where user is owner
      const ownerQuery = query(collection(db, 'restaurants'), where('ownerId', '==', uid));
      const ownerSnap = await getDocs(ownerQuery);
      const owned = ownerSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'owner' }));

      // 2. Get restaurants where user is staff
      // Firestore 'array-contains' only works for simple values, for objects we might need a different structure or query
      // For now, let's assume we store staff phone numbers in a simple array 'staffPhoneNumbers' for easy querying
      const staffQuery = query(collection(db, 'restaurants'), where('staffPhoneNumbers', 'array-contains', phoneNumber));
      const staffSnap = await getDocs(staffQuery);
      const staffOf = staffSnap.docs.map(doc => {
        const data = doc.data();
        const staffMember = data.staffMembers?.find(s => s.phoneNumber === phoneNumber);
        return { 
          id: doc.id, 
          ...data, 
          role: 'staff',
          permissions: staffMember?.permissions || []
        };
      });

      const allRestaurants = [...owned, ...staffOf];
      setUserRestaurants(allRestaurants);

      // If only one restaurant, auto-select it if it's active? 
      // Actually, user wants a selection screen if not new.
      return allRestaurants;
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return [];
    }
  };

  const checkSubscription = (restaurant) => {
    if (!restaurant) return false;
    if (restaurant.subscriptionStatus !== 'active') return false;
    if (!restaurant.endDate) return false;
    
    const now = new Date();
    const expiry = new Date(restaurant.endDate);
    return now < expiry;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch/Create user profile in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // New user
          const newUser = {
            uid: firebaseUser.uid,
            phoneNumber: firebaseUser.phoneNumber,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newUser);
          setUserData(newUser);
        } else {
          setUserData(userSnap.data());
        }

        // Fetch associated restaurants
        await fetchUserRestaurants(firebaseUser);
        
        // Try to recover selected restaurant from localStorage
        const savedRestaurantId = localStorage.getItem('selectedRestaurantId');
        if (savedRestaurantId) {
          const resDoc = await getDoc(doc(db, 'restaurants', savedRestaurantId));
          if (resDoc.exists()) {
            const resData = { id: resDoc.id, ...resDoc.data() };
            // Double check if user still has access
            const restaurants = await fetchUserRestaurants(firebaseUser);
            const found = restaurants.find(r => r.id === savedRestaurantId);
            if (found) {
              setSelectedRestaurant({ ...resData, role: found.role, permissions: found.permissions });
            }
          }
        }
      } else {
        setUser(null);
        setUserData(null);
        setUserRestaurants([]);
        setSelectedRestaurant(null);
        localStorage.removeItem('selectedRestaurantId');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    localStorage.setItem('selectedRestaurantId', restaurant.id);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const hasAccess = (menuValue) => {
    if (!selectedRestaurant) return false;
    
    // Owner has full access
    if (selectedRestaurant.role === 'owner') return true;
    
    // Staff have restricted access
    if (selectedRestaurant.role === 'staff') {
      // Dashboard is strictly for owners
      if (menuValue === 'dashboard') return false;
      
      // Check assigned permissions
      return selectedRestaurant.permissions?.includes(menuValue);
    }
    
    return false;
  };

  const isSubscriptionActive = () => {
    return checkSubscription(selectedRestaurant);
  };

  const value = {
    user,
    userData,
    userRestaurants,
    selectedRestaurant,
    loading,
    sendOTP,
    verifyOTP,
    fetchUserRestaurants,
    selectRestaurant,
    logout,
    hasAccess,
    isSubscriptionActive,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

