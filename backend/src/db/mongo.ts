import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  if (config.nodeEnv === 'development') {
    mongoose.set('debug', false);
  }
}

// Activity log (user actions, request lifecycle)
const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    role: String,
    action: { type: String, required: true, index: true },
    resourceType: String,
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'activity_logs' }
);

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Notification log (delivery status for SMS/Email/WS)
const notificationLogSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    channel: { type: String, required: true, enum: ['email', 'sms', 'websocket'] },
    type: String,
    payload: mongoose.Schema.Types.Mixed,
    sentAt: { type: Date, default: Date.now, index: true },
    success: Boolean,
    error: String,
  },
  { collection: 'notification_logs' }
);

export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
