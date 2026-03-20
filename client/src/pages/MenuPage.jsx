import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import client from '../api/client';
import CountdownBadge from '../components/common/CountdownBadge';
import Loader from '../components/common/Loader';
import MenuCard from '../components/menu/MenuCard';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getErrorMessage } from '../utils/http';

const LOYALTY_REDEEM_POINTS = Number(import.meta.env.VITE_LOYALTY_REDEEM_POINTS || 100);
const LOYALTY_REDEEM_VALUE = Number(import.meta.env.VITE_LOYALTY_REDEEM_VALUE || 50);

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const MenuPage = () => {
  const { user, isAuthenticated, refreshMe } = useAuth();
  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      slot: 'lunch',
      quantity: 1,
      walletUse: 0,
      couponCode: '',
      fulfillmentType: 'pickup',
      useLoyalty: false
    }
  });
  const { setTomorrowMenu } = useApp();

  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [lastBreakdown, setLastBreakdown] = useState(null);
  const [lastSuccessfulOrder, setLastSuccessfulOrder] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const watched = watch();
  const quantity = Number(watched.quantity || 1);
  const plannedWalletUse = Number(watched.walletUse || 0);
  const wantsLoyalty = Boolean(watched.useLoyalty);
  const watchedCouponCode = String(watched.couponCode || '').trim().toUpperCase();

  const activeAddons = useMemo(
    () => (menu?.addons || []).filter((addon) => addon.isActive !== false),
    [menu]
  );

  const addonTotalEstimate = useMemo(
    () => activeAddons.reduce((sum, addon) => {
      const addonQty = Number(watched[`addon_${addon._id}`] || 0);
      if (addonQty <= 0) return sum;
      return sum + addon.price * addonQty;
    }, 0),
    [activeAddons, watched]
  );

  const thaliTotalEstimate = useMemo(
    () => (menu ? menu.platePrice * quantity : 0),
    [menu, quantity]
  );

  const loyaltyEstimate = useMemo(() => {
    if (!wantsLoyalty) return 0;
    if ((user?.loyaltyPoints || 0) < LOYALTY_REDEEM_POINTS) return 0;
    return LOYALTY_REDEEM_VALUE;
  }, [wantsLoyalty, user?.loyaltyPoints]);

  const couponEstimate = useMemo(() => {
    if (!watchedCouponCode) return 0;
    const coupon = availableCoupons.find((item) => item.code === watchedCouponCode);
    if (!coupon) return 0;

    const subtotal = thaliTotalEstimate + addonTotalEstimate;
    if (subtotal < Number(coupon.minOrderAmount || 0)) return 0;

    const raw = (subtotal * Number(coupon.discountPercent || 0)) / 100;
    return Math.min(raw, Number(coupon.maxDiscountAmount || 0));
  }, [watchedCouponCode, availableCoupons, thaliTotalEstimate, addonTotalEstimate]);

  const estimatedTotal = useMemo(() => {
    const subtotal = thaliTotalEstimate + addonTotalEstimate;
    return Math.max(subtotal - loyaltyEstimate - couponEstimate, 0);
  }, [thaliTotalEstimate, addonTotalEstimate, loyaltyEstimate, couponEstimate]);

  const creditsEstimate = useMemo(
    () => Math.min(plannedWalletUse, user?.walletBalance || 0, estimatedTotal),
    [plannedWalletUse, user?.walletBalance, estimatedTotal]
  );

  const bankEstimate = useMemo(
    () => Math.max(estimatedTotal - creditsEstimate, 0),
    [estimatedTotal, creditsEstimate]
  );

  const formatAmount = (value) => Number(value || 0).toFixed(2);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/menus/tomorrow');
      setMenu(data.data);
      setTomorrowMenu(data.data);
      if (isAuthenticated) {
        setValue('walletUse', Number(user?.walletBalance || 0));
      }
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Menu not available'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    if (!isAuthenticated) {
      setAvailableCoupons([]);
      return;
    }

    try {
      const { data } = await client.get('/users/coupons/active');
      setAvailableCoupons(data.data || []);
    } catch (_error) {
      setAvailableCoupons([]);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setValue('walletUse', Number(user?.walletBalance || 0));
    }
  }, [isAuthenticated, user?.walletBalance, setValue]);

  const handlePayment = async ({ localOrder, razorpayOrder, keyId, paymentBreakdown }) => {
    const scriptReady = await loadRazorpayScript();
    if (!scriptReady) {
      toast.error('Unable to load Razorpay');
      return null;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finalize = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const options = {
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: 'HomeMade',
        description: `Order ${localOrder.orderCode} | Credits INR ${paymentBreakdown.creditsUsed.toFixed(2)} | Bank INR ${paymentBreakdown.bankAmount.toFixed(2)}`,
        handler: async (response) => {
          try {
            const { data } = await client.post('/payments/verify', {
              orderId: localOrder._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            toast.success('Order placed successfully');
            await Promise.all([fetchMenu(), refreshMe()]);
            finalize(data.data);
          } catch (error) {
            toast.error(getErrorMessage(error, 'Payment verification failed'));
            finalize(null);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: { color: '#f56600' },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. Pending order auto-cancels in 5 minutes if unpaid.');
            finalize(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      if (typeof rzp.on === 'function') {
        rzp.on('payment.failed', () => {
          toast.error('Payment failed. Please try again.');
          finalize(null);
        });
      }

      rzp.open();
    });
  };

  const onBook = async (values) => {
    setBooking(true);
    setLastSuccessfulOrder(null);
    try {
      const addonSelections = activeAddons
        .map((addon) => ({
          addonId: addon._id,
          quantity: Number(values[`addon_${addon._id}`] || 0)
        }))
        .filter((item) => item.quantity > 0);

      const payload = {
        menuId: menu._id,
        slot: values.slot,
        quantity: Number(values.quantity),
        walletUse: Number(values.walletUse || 0),
        fulfillmentType: values.fulfillmentType,
        useLoyalty: Boolean(values.useLoyalty),
        addonSelections
      };
      const normalizedCouponCode = String(values.couponCode || '').trim();
      if (normalizedCouponCode) {
        payload.couponCode = normalizedCouponCode;
      }

      const { data } = await client.post('/orders', payload);
      const result = data.data;
      setLastBreakdown(result.paymentBreakdown || null);
      let confirmedOrder = result.order;

      if (result.needsOnlinePayment) {
        confirmedOrder = await handlePayment({
          localOrder: result.order,
          razorpayOrder: result.razorpayOrder,
          keyId: result.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          paymentBreakdown: result.paymentBreakdown
        });
        if (!confirmedOrder) return;
      } else {
        toast.success('Order placed successfully');
        await Promise.all([fetchMenu(), refreshMe()]);
      }

      setLastSuccessfulOrder({
        order: confirmedOrder,
        paymentBreakdown: result.paymentBreakdown
      });

      if (result.paymentBreakdown) {
        toast.info(`Credits used: INR ${result.paymentBreakdown.creditsUsed.toFixed(2)} | Bank paid: INR ${result.paymentBreakdown.bankAmount.toFixed(2)}`);
      }

      const resetValues = {
        slot: 'lunch',
        quantity: 1,
        walletUse: Number(user?.walletBalance || 0),
        couponCode: '',
        fulfillmentType: 'pickup',
        useLoyalty: false
      };
      activeAddons.forEach((addon) => {
        resetValues[`addon_${addon._id}`] = 0;
      });
      reset(resetValues);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Booking failed'));
    } finally {
      setBooking(false);
    }
  };

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <div className="panel-head">
          <div>
            <h2>Tomorrow menu</h2>
            {menu && <p>{dayjs(menu.date).format('dddd, DD MMM YYYY')}</p>}
          </div>
          {menu && <CountdownBadge cutoffTime={menu.cutoffTime} />}
        </div>

        {loading && <Loader text="Loading menu" />}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && menu && (
          <>
            <p className={`badge ${menu.remainingPlates <= 15 ? 'low' : ''}`}>Only {menu.remainingPlates} plates left</p>
            <p>Thali price: <strong>INR {menu.platePrice}</strong></p>
            <div className="menu-grid">
              {menu.items.map((item) => (
                <MenuCard key={`${item.name}-${item.image}`} item={item} />
              ))}
            </div>

            {activeAddons.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h3>Extra Menu</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAddons.map((addon) => (
                        <tr key={addon._id}>
                          <td>{addon.name}</td>
                          <td>{addon.description || '-'}</td>
                          <td>INR {addon.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </article>

      <article className="page">
        <h3>Book your slot</h3>
        {!isAuthenticated ? (
          <p>Please <Link to="/login">login</Link> to place an order.</p>
        ) : !menu ? (
          <p>No menu to book.</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit(onBook)}>
            <div className="panel" style={{ background: '#fffaf2' }}>
              <p><strong>Available credits:</strong> INR {formatAmount(user?.walletBalance)}</p>
              <p><strong>Loyalty points available:</strong> {Number(user?.loyaltyPoints || 0)} pts</p>
              <p>Minimum redeem: {LOYALTY_REDEEM_POINTS} pts = INR {LOYALTY_REDEEM_VALUE}</p>
            </div>

            <div className="grid cols-2">
              <div>
                <label>Meal slot</label>
                <select {...register('slot')}>
                  {menu.slots.includes('lunch') && <option value="lunch">Lunch (12-2 PM)</option>}
                  {menu.slots.includes('dinner') && <option value="dinner">Dinner (7-9 PM)</option>}
                </select>
              </div>
              <div>
                <label>Thali quantity</label>
                <input type="number" min="1" max="20" {...register('quantity')} />
              </div>
              <div>
                <label>Fulfillment type</label>
                <select {...register('fulfillmentType')}>
                  <option value="pickup">Pickup</option>
                  <option value="dinein">Dine-in</option>
                </select>
              </div>
              <div>
                <label>Use credits (INR)</label>
                <input type="number" min="0" step="1" {...register('walletUse')} placeholder={`Balance ${user.walletBalance || 0}`} />
              </div>
              <div>
                <label>Coupon code</label>
                <input {...register('couponCode')} placeholder="Enter coupon code (optional)" />
              </div>
            </div>

            {availableCoupons.length > 0 && (
              <div className="panel" style={{ background: '#fffdf8' }}>
                <h4>Available coupons</h4>
                {availableCoupons.map((coupon) => (
                  <p key={coupon._id}>
                    <strong>{coupon.code}</strong> - {coupon.discountPercent}% off up to INR {formatAmount(coupon.maxDiscountAmount)}
                    {Number(coupon.minOrderAmount || 0) > 0 && ` | Min order INR ${formatAmount(coupon.minOrderAmount)}`}
                  </p>
                ))}
              </div>
            )}

            {activeAddons.length > 0 && (
              <div className="panel">
                <h4>Add extra items</h4>
                <div className="grid cols-2">
                  {activeAddons.map((addon) => (
                    <div key={`pick-${addon._id}`}>
                      <label>{addon.name} (INR {addon.price})</label>
                      <input type="number" min="0" max="20" {...register(`addon_${addon._id}`)} defaultValue={0} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" {...register('useLoyalty')} style={{ width: 'auto' }} />
              Redeem loyalty if available ({LOYALTY_REDEEM_POINTS} pts = INR {LOYALTY_REDEEM_VALUE})
            </label>

            <div className="panel">
              <h4>Payment split (estimate)</h4>
              <p>Thali total: <strong>INR {thaliTotalEstimate.toFixed(2)}</strong></p>
              <p>Extra items total: <strong>INR {addonTotalEstimate.toFixed(2)}</strong></p>
              <p>Coupon discount: <strong>INR {couponEstimate.toFixed(2)}</strong></p>
              <p>Loyalty discount: <strong>INR {loyaltyEstimate.toFixed(2)}</strong></p>
              <p>Total payable: <strong>INR {estimatedTotal.toFixed(2)}</strong></p>
              <p>Credits used: <strong>INR {creditsEstimate.toFixed(2)}</strong></p>
              <p>Bank payment: <strong>INR {bankEstimate.toFixed(2)}</strong></p>
            </div>

            {lastBreakdown && (
              <div className="panel" style={{ borderColor: '#b7eac2', background: '#f2fff5' }}>
                <h4>Last Order Split</h4>
                <p>Coupon discount: INR {formatAmount(lastBreakdown.couponDiscount)}</p>
                <p>Loyalty discount: INR {formatAmount(lastBreakdown.loyaltyDiscount)}</p>
                <p>Credits used: INR {lastBreakdown.creditsUsed.toFixed(2)}</p>
                <p>Bank paid: INR {lastBreakdown.bankAmount.toFixed(2)}</p>
              </div>
            )}

            {lastSuccessfulOrder && (
              <div className="panel" style={{ borderColor: '#9fdcb0', background: '#f2fff5' }}>
                <h4>Order placed successfully</h4>
                <p>Order code: <strong>{lastSuccessfulOrder.order.orderCode}</strong></p>
                <p>Daily order no: <strong>{lastSuccessfulOrder.order.dailyOrderNumber || '-'}</strong></p>
                <p>Meal: {dayjs(lastSuccessfulOrder.order.mealDate).format('DD MMM YYYY')} | {lastSuccessfulOrder.order.slot} | Qty {lastSuccessfulOrder.order.quantity}</p>
                <p>Thali: x{lastSuccessfulOrder.order.quantity}</p>
                {lastSuccessfulOrder.order.addonItems?.length > 0 ? (
                  <p>
                    Add-ons: {lastSuccessfulOrder.order.addonItems.map((addon) => `${addon.name} x${addon.quantity}`).join(', ')}
                  </p>
                ) : (
                  <p>Add-ons: none</p>
                )}
                <p>Coupon used: {lastSuccessfulOrder.order.couponCode || 'none'}</p>
                <p>Credits paid: INR {formatAmount(lastSuccessfulOrder.paymentBreakdown?.creditsUsed)}</p>
                <p>Bank paid: INR {formatAmount(lastSuccessfulOrder.paymentBreakdown?.bankAmount)}</p>
                <p>Total paid: INR {formatAmount(lastSuccessfulOrder.paymentBreakdown?.totalAmount || lastSuccessfulOrder.order.totalAmount)}</p>
                <Link to="/orders" className="btn tiny ghost" style={{ marginTop: 6, display: 'inline-block' }}>
                  View in My Orders
                </Link>
              </div>
            )}

            <button type="submit" className="btn" disabled={booking}>Proceed to pay</button>
          </form>
        )}
      </article>
    </section>
  );
};

export default MenuPage;
