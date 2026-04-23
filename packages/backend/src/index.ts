import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocketServer } from './realtime/socketServer.js';
import { authRoutes } from './routes/auth.routes.js';
import { permissionsRoutes } from './routes/permissions.routes.js';
import { branchRoutes } from './routes/branches.routes.js';
import { profileRoutes } from './routes/profiles.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { configRoutes } from './routes/config.routes.js';
import { storageRoutes } from './routes/storage.routes.js';
import { menuRoutes } from './routes/menu.routes.js';
import { orderRoutes } from './routes/orders.routes.js';
import { hrRoutes } from './routes/hr.routes.js';
import { webappRoutes } from './routes/webapp.routes.js';
import { paymentRoutes } from './routes/payments.routes.js';
import { fiscalRoutes } from './routes/fiscal.routes.js';
import { financialRoutes } from './routes/financial.routes.js';
import { coachingRoutes } from './routes/coaching.routes.js';
import { meetingRoutes } from './routes/meetings.routes.js';
import { communicationRoutes } from './routes/communications.routes.js';
import { inspectionRoutes } from './routes/inspections.routes.js';
import { supplierRoutes } from './routes/suppliers.routes.js';
import { stockRoutes } from './routes/stock.routes.js';
import { promotionRoutes } from './routes/promotions.routes.js';
import { contactRoutes } from './routes/contacts.routes.js';
import { notificationRoutes } from './routes/notifications.routes.js';
import { whatsappRoutes } from './routes/whatsapp.routes.js';
import { deliveryRoutes } from './routes/delivery.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.resolve(__dirname, '../data/uploads');
app.use('/uploads', express.static(uploadsPath));

initSocketServer(httpServer);

app.use('/api/auth', authRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/webapp', webappRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/delivery', deliveryRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

httpServer.listen(PORT, () => {
  console.log(`Hoppiness backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export { app };
