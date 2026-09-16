# Texmaco Digital Brochure

Full-stack brochure platform with an immersive public presentation and a protected content-management dashboard.

## Included

- Fullscreen, swipe-first public brochure
- Access gate after slide six
- Email OTP verification and visitor capture
- MongoDB storage for slides, navigation tabs and leads
- Cloudinary image uploads and deletion
- Secure JWT-based admin sessions
- Slide creation, editing, image replacement, ordering and visibility
- Editable navigation-tab labels
- Searchable list of verified visitors
- Responsive admin dashboard at `/admin`

## Configure

Copy `.env.example` to `.env` and provide:

- `MONGODB_URI`: MongoDB Atlas or local MongoDB connection string
- `JWT_SECRET`: a long random secret
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: dashboard credentials
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- SMTP settings for production email verification

For local development without SMTP, keep `ALLOW_DEMO_OTP=true`. The verification code will be returned by the API and displayed in the OTP window. Set it to `false` in production.

## Run locally

Use two terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Open:

- Public brochure: `http://localhost:5173`
- Admin dashboard: `http://localhost:5173/admin`
- API health: `http://localhost:5000/api/health`

The Vite app reads `VITE_API_URL` from `.env`. The default local value is `http://localhost:5000/api`.

## Production

```bash
npm run build
npm start
```

Express serves the compiled `dist/` application and API from one process. If the frontend and API use different origins, update `VITE_API_URL` and `CLIENT_ORIGINS` before building.

## Data behavior

- Six default navigation tabs are created automatically when the database is empty.
- Until the first database slide is uploaded, the public presentation uses its bundled demonstration slides.
- Once database slides exist, the public brochure uses the live ordered and published content.
- Hidden slides remain visible in the admin area but are excluded from the public brochure.
- Deleting or replacing a slide also removes the superseded asset from Cloudinary.
- Only visitors who successfully verify their email appear in the admin lead table.

For security, never commit `.env`, Cloudinary secrets, SMTP credentials or the admin password.
