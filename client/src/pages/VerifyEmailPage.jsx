import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/http';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { email } });
  const auth = useAuth();

  const onSubmit = async (values) => {
    try {
      await auth.verifyEmail(values);
      navigate('/login');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Verification failed'));
    }
  };

  const resend = async () => {
    if (!email) return;
    try {
      await auth.resendVerification(email);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to resend OTP'));
    }
  };

  return (
    <section className="page" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2>Verify email</h2>
      <p>Enter the OTP sent to your email.</p>
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Email</label>
          <input type="email" {...register('email', { required: true })} readOnly={Boolean(email)} />
        </div>
        <div>
          <label>OTP</label>
          <input {...register('otp', { required: true })} placeholder="6-digit OTP" />
        </div>
        <button type="submit" className="btn" disabled={isSubmitting}>Verify</button>
      </form>
      <button type="button" className="link-btn" onClick={resend}>Resend OTP</button>
    </section>
  );
};

export default VerifyEmailPage;
