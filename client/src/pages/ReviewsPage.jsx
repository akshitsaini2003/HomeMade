import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import client from '../api/client';
import { getErrorMessage } from '../utils/http';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try {
      const { data } = await client.get('/reviews/my');
      setReviews(data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load reviews'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values) => {
    try {
      await client.post('/reviews', {
        ...values,
        rating: Number(values.rating),
        tasteRating: Number(values.tasteRating),
        quantityRating: Number(values.quantityRating),
        packagingRating: Number(values.packagingRating),
        valueRating: Number(values.valueRating)
      });
      toast.success('Review submitted');
      reset();
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to submit review'));
    }
  };

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <h2>Submit review</h2>
        <p>Rate only after order delivery. Enter order and menu IDs from order details.</p>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid cols-2">
            <div>
              <label>Order ID</label>
              <input {...register('orderId', { required: true })} />
            </div>
            <div>
              <label>Menu ID</label>
              <input {...register('menuId', { required: true })} />
            </div>
          </div>
          <div className="grid cols-3">
            <div>
              <label>Overall</label>
              <input type="number" min="1" max="5" {...register('rating', { required: true })} />
            </div>
            <div>
              <label>Taste</label>
              <input type="number" min="1" max="5" {...register('tasteRating', { required: true })} />
            </div>
            <div>
              <label>Quantity</label>
              <input type="number" min="1" max="5" {...register('quantityRating', { required: true })} />
            </div>
            <div>
              <label>Packaging</label>
              <input type="number" min="1" max="5" {...register('packagingRating', { required: true })} />
            </div>
            <div>
              <label>Value</label>
              <input type="number" min="1" max="5" {...register('valueRating', { required: true })} />
            </div>
          </div>
          <div>
            <label>Comment</label>
            <textarea {...register('comment')} />
          </div>
          <button type="submit" className="btn" disabled={isSubmitting}>Submit review</button>
        </form>
      </article>

      <article className="page">
        <h3>My reviews</h3>
        {reviews.length === 0 ? (
          <p>No reviews submitted yet.</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {reviews.map((review) => (
              <article key={review._id} className="panel">
                <strong>{review.orderId?.orderCode || review.orderId}</strong>
                <p>Rating: {review.rating}/5</p>
                <p>{review.comment || 'No comment'}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
};

export default ReviewsPage;
