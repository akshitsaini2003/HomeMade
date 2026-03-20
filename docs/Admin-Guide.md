# Admin User Guide

## 1. Login
- Use admin credentials seeded from `server/.env` values (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## 2. Dashboard
- Open `/admin`.
- Review:
  - today revenue
  - average order value
  - slot-wise performance
  - top customers
  - tomorrow inventory snapshot

## 3. Create Menu (Tomorrow)
- Go to `/admin/menu`.
- Fill date, cutoff time, total plates, plate price.
- Add thali items with name, description, image.
- Add optional extra add-ons with their own price.
- Use Edit to update an existing menu.
- Publish menu.

## 4. Manage Orders
- Go to `/admin/orders`.
- Filter by date/slot/payment status.
- Update order status (`confirmed -> preparing -> ready -> delivered`).
- Export CSV for kitchen operations.

## 5. Manage Users
- Go to `/admin/users`.
- Search by name/email/phone.
- Block/unblock problematic accounts.

## 6. Platform Settings
- Go to `/admin/settings`.
- Update business details and loyalty rules.
- Send announcements to users (email/in-app).

## 7. Contact Inquiries
- Use `/admin/inquiries` API or admin panel integration to review incoming messages.

## 8. Refunds
- Track refund requests via `/admin/refunds`.
- Approve wallet/source refund using `/admin/refunds/:orderId`.
