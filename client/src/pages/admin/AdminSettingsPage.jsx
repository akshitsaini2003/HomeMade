import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import client from '../../api/client';
import AdminNav from '../../components/admin/AdminNav';
import { getErrorMessage } from '../../utils/http';

const AdminSettingsPage = () => {
  const settingsForm = useForm();
  const notifyForm = useForm({ defaultValues: { channel: 'both' } });
  const couponForm = useForm({
    defaultValues: {
      code: '',
      title: '',
      description: '',
      discountPercent: 10,
      maxDiscountAmount: 100,
      minOrderAmount: 0
    }
  });
  const [coupons, setCoupons] = React.useState([]);

  const loadSettings = async () => {
    try {
      const { data } = await client.get('/admin/settings');
      settingsForm.reset(data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load settings'));
    }
  };

  const loadCoupons = async () => {
    try {
      const { data } = await client.get('/admin/coupons');
      setCoupons(data.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load coupons'));
    }
  };

  useEffect(() => {
    loadSettings();
    loadCoupons();
  }, []);

  const saveSettings = async (values) => {
    try {
      await client.patch('/admin/settings', values);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Save failed'));
    }
  };

  const sendAnnouncement = async (values) => {
    try {
      await client.post('/admin/notify', values);
      toast.success('Announcement sent');
      notifyForm.reset({ channel: 'both', title: '', message: '' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to send announcement'));
    }
  };

  const createCoupon = async (values) => {
    try {
      await client.post('/admin/coupons', values);
      toast.success('Coupon created');
      couponForm.reset({
        code: '',
        title: '',
        description: '',
        discountPercent: 10,
        maxDiscountAmount: 100,
        minOrderAmount: 0
      });
      await loadCoupons();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to create coupon'));
    }
  };

  const toggleCoupon = async (couponId) => {
    try {
      await client.patch(`/admin/coupons/${couponId}/toggle`);
      await loadCoupons();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to toggle coupon'));
    }
  };

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <AdminNav />
        <h2>Platform settings</h2>
        <form className="form-grid" onSubmit={settingsForm.handleSubmit(saveSettings)}>
          <div className="grid cols-2">
            <div>
              <label>Business name</label>
              <input {...settingsForm.register('businessName')} />
            </div>
            <div>
              <label>Contact</label>
              <input {...settingsForm.register('contact')} />
            </div>
            <div>
              <label>Address</label>
              <input {...settingsForm.register('address')} />
            </div>
            <div>
              <label>Delivery charges (keep 0)</label>
              <input type="number" {...settingsForm.register('deliveryCharges')} />
            </div>
            <div>
              <label>Loyalty points per order</label>
              <input type="number" {...settingsForm.register('loyaltyPointsPerOrder')} />
            </div>
            <div>
              <label>Redeem points threshold</label>
              <input type="number" {...settingsForm.register('loyaltyRedeemPoints')} />
            </div>
            <div>
              <label>Redeem value (INR)</label>
              <input type="number" {...settingsForm.register('loyaltyRedeemValue')} />
            </div>
          </div>
          <button type="submit" className="btn" disabled={settingsForm.formState.isSubmitting}>Save settings</button>
        </form>
      </article>

      <article className="page">
        <h3>Send announcement</h3>
        <form className="form-grid" onSubmit={notifyForm.handleSubmit(sendAnnouncement)}>
          <div>
            <label>Title</label>
            <input {...notifyForm.register('title', { required: true })} />
          </div>
          <div>
            <label>Message</label>
            <textarea {...notifyForm.register('message', { required: true })} />
          </div>
          <div>
            <label>Channel</label>
            <select {...notifyForm.register('channel')}>
              <option value="both">Email + In-app</option>
              <option value="email">Email only</option>
              <option value="inapp">In-app only</option>
            </select>
          </div>
          <button type="submit" className="btn" disabled={notifyForm.formState.isSubmitting}>Send announcement</button>
        </form>
      </article>

      <article className="page">
        <h3>Coupon management</h3>
        <form className="form-grid" onSubmit={couponForm.handleSubmit(createCoupon)}>
          <div className="grid cols-3">
            <div>
              <label>Code</label>
              <input {...couponForm.register('code', { required: true })} placeholder="WELCOME50" />
            </div>
            <div>
              <label>Discount %</label>
              <input type="number" min="1" max="100" {...couponForm.register('discountPercent', { required: true })} />
            </div>
            <div>
              <label>Max discount (INR)</label>
              <input type="number" min="0" {...couponForm.register('maxDiscountAmount', { required: true })} />
            </div>
            <div>
              <label>Min order amount (INR)</label>
              <input type="number" min="0" {...couponForm.register('minOrderAmount')} />
            </div>
            <div>
              <label>Title</label>
              <input {...couponForm.register('title')} placeholder="Festive offer" />
            </div>
            <div>
              <label>Description</label>
              <input {...couponForm.register('description')} placeholder="50% upto 100" />
            </div>
          </div>
          <button type="submit" className="btn" disabled={couponForm.formState.isSubmitting}>Add coupon</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Offer</th>
                <th>Min order</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id}>
                  <td>{coupon.code}</td>
                  <td>{coupon.discountPercent}% upto INR {Number(coupon.maxDiscountAmount || 0).toFixed(2)}</td>
                  <td>INR {Number(coupon.minOrderAmount || 0).toFixed(2)}</td>
                  <td>{coupon.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button type="button" className="btn tiny ghost" onClick={() => toggleCoupon(coupon._id)}>
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5}>No coupons created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default AdminSettingsPage;
