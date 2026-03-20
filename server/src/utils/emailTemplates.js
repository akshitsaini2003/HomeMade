const dayjs = require('dayjs');

const base = ({ title, subtitle, body, ctaText, ctaUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#fdf7ef;font-family:Arial,sans-serif;color:#2a2a2a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf7ef;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#ff7f11,#ff3f34);padding:24px;color:#fff;">
              <h1 style="margin:0;font-size:24px;">${title}</h1>
              <p style="margin:8px 0 0;opacity:0.9;">${subtitle || ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;line-height:1.6;font-size:15px;">
              ${body}
              ${ctaText && ctaUrl ? `<p style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;background:#ff5a1f;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">${ctaText}</a></p>` : ''}
              <p style="margin-top:24px;color:#6b7280;font-size:12px;">This is an automated email from HomeMade.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const templates = {
  welcome: ({ name }) => ({
    subject: 'Welcome to HomeMade',
    html: base({
      title: 'Welcome to HomeMade',
      subtitle: 'Fresh home-cooked meals for your college routine',
      body: `<p>Hi ${name},</p><p>Your account is ready. Start booking tomorrow's lunch and dinner before cutoff time.</p>`
    })
  }),
  emailVerification: ({ name, otp }) => ({
    subject: 'Verify your email - HomeMade',
    html: base({
      title: 'Email Verification',
      subtitle: 'Use the OTP below to verify your account',
      body: `<p>Hi ${name},</p><p>Your verification OTP is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:3px;">${otp}</p><p>OTP expires in 10 minutes.</p>`
    })
  }),
  orderConfirmation: ({ name, order }) => ({
    subject: `Order Confirmed #${order.orderCode}`,
    html: base({
      title: 'Order Confirmed',
      subtitle: `Meal date: ${dayjs(order.mealDate).format('DD MMM YYYY')}`,
      body: `<p>Hi ${name},</p><p>Your order has been confirmed.</p><ul><li>Slot: ${order.slot}</li><li>Quantity: ${order.quantity}</li><li>Total: INR ${order.totalAmount.toFixed(2)}</li><li>Pickup type: ${order.fulfillmentType}</li></ul>`
    })
  }),
  paymentSuccess: ({ name, order }) => ({
    subject: `Payment Received #${order.orderCode}`,
    html: base({
      title: 'Payment Successful',
      subtitle: 'Your booking is secured',
      body: `<p>Hi ${name},</p><p>Payment for order <b>${order.orderCode}</b> was successful.</p><p>Amount paid: INR ${order.totalAmount.toFixed(2)}</p>`
    })
  }),
  orderReady: ({ name, order }) => ({
    subject: `Order Ready for ${order.slot}`,
    html: base({
      title: 'Order Ready',
      subtitle: 'Please collect your meal',
      body: `<p>Hi ${name},</p><p>Your meal for <b>${order.slot}</b> is now ready for pickup/dine-in.</p>`
    })
  }),
  passwordReset: ({ name, otp }) => ({
    subject: 'Password Reset OTP',
    html: base({
      title: 'Password Reset',
      subtitle: 'Use OTP to reset your password',
      body: `<p>Hi ${name},</p><p>Your password reset OTP is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:3px;">${otp}</p><p>OTP expires in 10 minutes.</p>`
    })
  }),
  contactConfirmation: ({ name }) => ({
    subject: 'We received your message',
    html: base({
      title: 'Contact Request Received',
      subtitle: 'Our team will respond shortly',
      body: `<p>Hi ${name},</p><p>Thanks for contacting HomeMade. We have received your inquiry and will reply soon.</p>`
    })
  }),
  menuUpdate: ({ name, mealDate }) => ({
    subject: 'Tomorrow menu is live',
    html: base({
      title: 'New Menu Live',
      subtitle: dayjs(mealDate).format('DD MMM YYYY'),
      body: `<p>Hi ${name},</p><p>Tomorrow's home-cooked menu is now available. Book before cutoff.</p>`
    })
  }),
  refundConfirmation: ({ name, amount }) => ({
    subject: 'Refund Processed',
    html: base({
      title: 'Refund Confirmed',
      subtitle: 'Amount credited successfully',
      body: `<p>Hi ${name},</p><p>A refund of INR ${amount.toFixed(2)} has been processed to your wallet/payment source.</p>`
    })
  })
};

module.exports = templates;
