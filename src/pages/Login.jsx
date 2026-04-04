import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RESTAURANT_NAME } from '../data/menuData';
import toast from 'react-hot-toast';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendOTP, verifyOTP, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, navigate]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter phone number');
      return;
    }

    // Format phone number (add +91 if not present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    setLoading(true);
    const sent = await sendOTP(formattedPhone);
    if (sent) {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter OTP');
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    setLoading(true);
    try {
      const success = await verifyOTP(formattedPhone, otp);
      if (success) {
        navigate('/onboarding');
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo/Brand Section */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-[#ec2b25] mb-4">
            <LogIn className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{RESTAURANT_NAME} PRO</h1>
          <p className="text-gray-600">Secure Restaurant Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-gray-200 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {otpSent ? 'Verify OTP' : 'Login'}
          </h2>
          
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors"
                    placeholder="Enter 10-digit mobile number"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 italic">
                  We will send a 6-digit OTP to your mobile number.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ec2b25] text-white py-4 font-bold hover:bg-[#d12620] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors tracking-[0.5em] font-bold text-center text-xl"
                    placeholder="000000"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ec2b25] text-white py-4 font-bold hover:bg-[#d12620] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Verify & Login</span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-sm text-gray-600 hover:text-[#ec2b25] transition-colors font-medium text-center py-2"
                >
                  Back to Phone Number
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-sm text-gray-500">
          <p>© 2026 {RESTAURANT_NAME} PRO. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
