const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const {
  isSmtpConfigured,
  getSmtpMissingFields,
  verifySmtpConnection,
} = require('./services/mailService');

const userRouter = require('./routes/UsersRouter');
const topicsRouter = require('./routes/TopicsRouter');
const seminaryRouter = require('./routes/SeminaryRouter');
const qaRouter = require('./routes/QuestionsAnswersRouter');
const materialsRouter = require('./routes/MaterialsRouter');
const galleryRouter = require('./routes/ImageGalleryRouter');
const commentsRouter = require('./routes/CommentsRouter');
const enrollmentRouter = require('./routes/EnrollmentRouter');
const managerRouter = require('./routes/ManagerRouter');
const notificationRouter = require('./routes/NotificationRouter');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ===============================
// Routes
// ===============================

app.use('/users', userRouter);
app.use('/topics', topicsRouter);
app.use('/seminary', seminaryRouter);
app.use('/questions', qaRouter);
app.use('/materials', materialsRouter);
app.use('/gallery', galleryRouter);
app.use('/comments', commentsRouter);
app.use('/enrollment', enrollmentRouter);
app.use('/manager', managerRouter);
app.use('/notifications', notificationRouter);


// ===============================
// Server
// ===============================

async function startServer() {
  try {
    await connectDB({
      // Keep retrying until MongoDB is up (no crash loop).
      // Set DB_FAIL_FAST=true if you prefer to exit immediately on failure.
      failFast: process.env.DB_FAIL_FAST === 'true',
    });

    if (!isSmtpConfigured()) {
      const missing = getSmtpMissingFields();
      console.warn(
        '⚠️  [mail] SMTP לא מוגדר — מיילים לא יישלחו.\n' +
          `    חסר/ריק ב-server/.env: ${missing.join(', ')}\n` +
          '    מלאי SMTP_USER (מייל Gmail) ו-SMTP_PASS (סיסמת אפליקציה).\n' +
          '    עזרה: node scripts/setup-smtp.js'
      );
    } else {
      await verifySmtpConnection();
    }

    const port = process.env.PORT ?? 5000;
    app.listen(port, () => {
      console.log(`🚀 Server running at: http://localhost:${port}`);
    });
  } catch (err) {
    console.log('❌ Server failed to start (DB not connected)');
    process.exit(1);
  }
}

startServer();