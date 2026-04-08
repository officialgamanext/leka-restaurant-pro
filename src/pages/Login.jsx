import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RESTAURANT_NAME } from '../data/menuData';
import toast from 'react-hot-toast';
import '../styles/Login.css';
import logo from '../assets/logo.png';

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
    <div className="login-container">
      <div className="login-card">
        {/* Logo/Brand Section */}
        <div className="brand-section">
          <img src={logo} alt="Leka Restaurant" className="login-logo" />
        </div>

        <h2 className="form-title">
          {otpSent ? 'Login' : 'Login'}
        </h2>

        {!otpSent ? (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div className="input-wrapper">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="form-input"
                  placeholder="10-digit mobile number"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="input-hint">
                We'll send a 6-digit OTP to your number
              </p>
            </div>

            <button type="submit" disabled={loading} className="submit-button">
              {loading ? <div className="spinner"></div> : <span>Get OTP</span>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label className="input-label">Enter 6-digit OTP</label>
              <div className="input-wrapper">
                <ShieldCheck className="input-icon" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="form-input otp-input"
                  placeholder="000000"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? <div className="spinner"></div> : <span>Verify & Authenticate</span>}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="back-button"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        )}

        <div className="footer">
          <p>© 2026 {RESTAURANT_NAME}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

