import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/http';

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const auth = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      await auth.register(values);
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Registration failed'));
    }
  };

  return (
    <section className="page" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2>Create account</h2>
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Full name</label>
          <input {...register('name', { required: true, minLength: 2 })} />
          {errors.name && <p className="error-text">Name is required</p>}
        </div>
        <div>
          <label>Email</label>
          <input type="email" {...register('email', { required: true })} />
          {errors.email && <p className="error-text">Email is required</p>}
        </div>
        <div>
          <label>Phone</label>
          <input {...register('phone', { required: true })} />
          {errors.phone && <p className="error-text">Phone is required</p>}
        </div>
        <div>
          <label>Password</label>
          <input type="password" {...register('password', { required: true, minLength: 8 })} />
          {errors.password && <p className="error-text">Use at least 8 characters</p>}
        </div>
        <button type="submit" className="btn" disabled={isSubmitting}>Create account</button>
      </form>
      <p>Already registered? <Link to="/login">Login</Link></p>
    </section>
  );
};

export default RegisterPage;
