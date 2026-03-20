import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import client from '../api/client';
import { getErrorMessage } from '../utils/http';

const ContactPage = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      await client.post('/contact', values);
      toast.success('Inquiry submitted successfully');
      reset();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit inquiry'));
    }
  };

  return (
    <section className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2>Contact us</h2>
      <p>Have a question or menu request? Send us a message.</p>
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid cols-2">
          <div>
            <label>Name</label>
            <input {...register('name', { required: true })} />
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
        </div>
        <div>
          <label>Message</label>
          <textarea {...register('message', { required: true, minLength: 10 })} />
          {errors.message && <p className="error-text">Message must be at least 10 characters</p>}
        </div>
        <button type="submit" className="btn" disabled={isSubmitting}>Send message</button>
      </form>
    </section>
  );
};

export default ContactPage;
