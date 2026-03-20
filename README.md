# HomeMade - MERN Meal Pre-Ordering Platform

Production-oriented MERN stack web application for a **home-cooked food pre-order business** focused on college students.

Business constraints implemented:
- Booking allowed only for **tomorrow**
- **Pickup / Dine-in only** (no delivery flow)
- Admin-controlled plate limits and cutoff time
- Lunch and Dinner slot based bookings
- Wallet + Razorpay hybrid payment support

## 1. Tech Stack

### Frontend
- React + Vite
- React Router
- Context API
- Axios
- React Hook Form
- React Toastify

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT access/refresh token auth
- bcrypt password hashing
- express-validator
- multer + Cloudinary
- Razorpay integration + webhook verification
- Nodemailer templated emails
- Swagger UI (`/api/v1/docs`)

## 2. Implemented Modules

### User side
- Registration, login, email verification, forgot/reset password (OTP)
- JWT + refresh token session flow
- Tomorrow menu view with plate count + cutoff countdown
- Booking with:
  - slot selection (`lunch` / `dinner`)
  - quantity
  - thali + extra add-on items
  - wallet usage
  - loyalty redeem option
  - payment split preview (credits vs bank)
  - Razorpay (or wallet-only) payment flow
- Upcoming/history orders
- Cancel before cutoff with refund to wallet
- Invoice PDF download
- Wallet transactions and loyalty points
- Auto credit on delivered orders (env-configurable)
- Notifications center (in-app)
- Contact form + acknowledgement email
- Review/rating submission after delivered order

### Admin side
- Revenue dashboard
- Inventory insights
- Menu creation + activation toggle
- Menu edit support
- Orders list/filter/status update
- Forward-only status transitions
- CSV export for daily orders
- User search + block/unblock
- Settings update
- Bulk announcement (email/in-app)
- Contact inquiries listing

## 3. Critical Business Logic

- Booking race condition prevention with MongoDB transactions and atomic plate decrement.
- Reservation release on failed payment/cancellation.
- Cutoff-time validation in backend before order and cancellation operations.
- Wallet + loyalty adjustments executed in transaction-sensitive paths.
- Payment signature verification for Razorpay checkout and webhook.

## 4. Project Structure

```text
HomeMade/
  client/               # React app
  server/               # Express API
  docs/
    API.md
    Admin-Guide.md
    postman_collection.json
```

## 5. Environment Setup

### Server env (`server/.env`)
Copy `server/.env.example` to `server/.env` and fill:
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DELIVERED_ORDER_CREDIT` (auto credit on delivered orders)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- SMTP settings (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`)

### Client env (`client/.env`)
Copy `client/.env.example` to `client/.env` and set:
- `VITE_API_BASE_URL`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_LOYALTY_REDEEM_POINTS`
- `VITE_LOYALTY_REDEEM_VALUE`

## 6. Installation

### Backend
```bash
cd server
npm install
npm run seed
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### Optional root shortcuts
```bash
npm run install:all
npm run seed
npm run dev:server
npm run dev:client
```

## 7. Seeded Test Credentials

After `npm run seed` in `server`:
- Admin:
  - Email: value of `ADMIN_EMAIL` from env
  - Password: value of `ADMIN_PASSWORD` from env
- User 1:
  - `student1@example.com / Student@123`
- User 2:
  - `student2@example.com / Student@123`

## 8. API Docs

- Swagger UI: `http://localhost:5000/api/v1/docs`
- Postman collection: `docs/postman_collection.json`
- Endpoint summary: `docs/API.md`

## 9. Deployment Guide

### Backend (Render / Railway / DigitalOcean)
1. Deploy `server` directory as Node service.
2. Set all `server/.env.example` variables.
3. Run `npm run seed` once after first deploy.
4. Set webhook URL in Razorpay:
   - `https://<backend-domain>/api/v1/payments/webhook`

### Database (MongoDB Atlas)
1. Create Atlas cluster.
2. Add DB user and network access.
3. Use Atlas connection URI in `MONGO_URI`.

### Frontend (Vercel / Netlify)
1. Deploy `client` directory.
2. Set:
   - `VITE_API_BASE_URL=https://<backend-domain>/api/v1`
   - `VITE_RAZORPAY_KEY_ID=<public_razorpay_key>`

## 10. Razorpay Test Checklist

1. Create order from menu page.
2. Complete payment in Razorpay test mode.
3. Verify order transitions to `paymentStatus=completed`, `orderStatus=confirmed`.
4. Test failure path and verify plate release.

## 11. Email Templates Included

- Welcome
- Email verification OTP
- Order confirmation
- Payment success
- Order ready
- Password reset OTP
- Contact confirmation
- Menu update
- Refund confirmation

## 12. Notes

- This project intentionally excludes delivery-address workflows per your requirement.
- For production hardening, enable centralized logging/monitoring and add automated API tests (Jest + supertest).
