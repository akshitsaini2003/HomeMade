# API Overview

Base URL: `/api/v1`

## Auth
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout`
- `GET /auth/me`

## Menu
- `GET /menus/tomorrow`
- `GET /menus/by-date?date=YYYY-MM-DD`
- `GET /menus/admin/list` (admin)
- `POST /menus/admin` (admin)
- `PATCH /menus/admin/:menuId`
- `PATCH /menus/admin/:menuId/toggle`
- `DELETE /menus/admin/:menuId`

## Orders
- `POST /orders`
  - Supports `addonSelections` and returns payment split (`creditsUsed`, `bankAmount`)
- `GET /orders/my?type=all|upcoming|history`
- `GET /orders/my/:orderId`
- `POST /orders/my/:orderId/cancel`
- `GET /orders/my/:orderId/invoice`
- `PATCH /orders/admin/:orderId/status` (admin)

## Payments
- `POST /payments/verify`
- `POST /payments/webhook`

## Users
- `GET /users/profile`
- `PATCH /users/profile`
- `GET /users/dashboard`
- `GET /users/wallet`
- `GET /users/stats`
- `POST /users/loyalty/redeem`

## Reviews
- `GET /reviews/menu/:menuId`
- `POST /reviews`
- `GET /reviews/my`

## Contact
- `POST /contact`
- `GET /contact/admin` (admin)
- `PATCH /contact/admin/:inquiryId` (admin)

## Notifications
- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/read-all`

## Admin
- `GET /admin/dashboard`
- `GET /admin/inventory`
- `GET /admin/orders`
- `GET /admin/orders/export`
- `GET /admin/orders/daily-summary`
- `GET /admin/users`
- `GET /admin/users/:userId/orders`
- `PATCH /admin/users/:userId/block`
- `GET /admin/refunds`
- `PATCH /admin/refunds/:orderId`
- `GET /admin/settings`
- `PATCH /admin/settings`
- `POST /admin/notify`
- `GET /admin/inquiries`

## Authentication Header
Use:
`Authorization: Bearer <access_token>`
