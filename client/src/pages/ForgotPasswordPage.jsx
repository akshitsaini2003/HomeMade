import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/http';

const ForgotPasswordPage = () => {
  const [otpSent, setOtpSent] = useState(false);
  const auth = useAuth();

  const sendOtpForm = useForm();
  const resetForm = useForm();

  const sendOtp = async (values) => {
    try {
      await auth.forgotPassword(values.email);
      setOtpSent(true);
      resetForm.setValue('email', values.email);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to send OTP'));
    }
  };

  const resetPassword = async (values) => {
    try {
      await auth.resetPassword(values);
      toast.success('Password changed, now login');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Reset failed'));
    }
  };

  return (
    <section className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2>Forgot password</h2>
      {!otpSent ? (
        <form className="form-grid" onSubmit={sendOtpForm.handleSubmit(sendOtp)}>
          <div>
            <label>Email</label>
            <input type="email" {...sendOtpForm.register('email', { required: true })} />
          </div>
          <button type="submit" className="btn" disabled={sendOtpForm.formState.isSubmitting}>Send OTP</button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={resetForm.handleSubmit(resetPassword)}>
          <div>
            <label>Email</label>
            <input type="email" {...resetForm.register('email', { required: true })} />
          </div>
          <div>
            <label>OTP</label>
            <input {...resetForm.register('otp', { required: true })} />
          </div>
          <div>
            <label>New Password</label>
            <input type="password" {...resetForm.register('newPassword', { required: true })} />
          </div>
          <button type="submit" className="btn" disabled={resetForm.formState.isSubmitting}>Reset password</button>
        </form>
      )}
    </section>
  );
};

export default ForgotPasswordPage;
