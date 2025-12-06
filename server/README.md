# Rentify Upload Helper

This folder contains a small Express microservice that accepts multipart file uploads and streams them to Cloudinary.

Setup

- Copy environment variables into your host (Render / production):
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

Install and run (from the `server` folder):

```powershell
npm install
npm run dev   # requires nodemon if you want auto-restart
node index.js # or npm start
```

Endpoints
- `POST /api/upload` — accepts multipart file uploads (`upload.any()`), returns JSON `{ success: true, files: [{ fileName, url }] }`.

Notes
- Limits uploads to 5MB per file via multer memory storage. Adjust in `middleware/uploadMiddleware.js` if needed.
- This microservice is optional — you can also implement the single-step upload directly inside your API server.
