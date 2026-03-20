import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/http';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const auth = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    try {
      await auth.login(values);
      navigate('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    }
  };

  return (
    <section className="page" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2>Login</h2>
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Email</label>
          <input type="email" {...register('email', { required: true })} />
          {errors.email && <p className="error-text">Email is required</p>}
        </div>
        <div>
          <label>Password</label>
          <input type="password" {...register('password', { required: true })} />
          {errors.password && <p className="error-text">Password is required</p>}
        </div>
        <button type="submit" className="btn" disabled={isSubmitting}>Sign in</button>
      </form>
      <p>
        No account? <Link to="/register">Create one</Link>
      </p>
      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </section>
  );
};

export default LoginPage;
