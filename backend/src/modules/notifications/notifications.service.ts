import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { config } from '../../config/index.js';
import { NotificationLog } from '../../db/mongo.js';
import type { BloodRequestRow } from '../../db/postgres.js';
import type { EligibleDonor } from '../matching/matching.service.js';
import { getWsServer } from '../../ws/server.js';

let mailTransporter: nodemailer.Transporter | null = null;
let twilioClient: ReturnType<typeof twilio> | null = null;

function getMailer(): nodemailer.Transporter | null {
  if (mailTransporter) return mailTransporter;
  if (config.smtp.host && config.smtp.user && config.smtp.pass) {
    mailTransporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
    return mailTransporter;
  }
  return null;
}

function getTwilio() {
  if (twilioClient) return twilioClient;
  if (config.twilio.accountSid && config.twilio.authToken) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    return twilioClient;
  }
  return null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getMailer();
  if (!transporter) {
    if (config.nodeEnv === 'development') console.log('[Email] (no SMTP)', { to, subject });
    return false;
  }
  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Send email error:', err);
    return false;
  }
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilio();
  if (!client || !config.twilio.phoneNumber) {
    if (config.nodeEnv === 'development') console.log('[SMS] (no Twilio)', { to, body: body.slice(0, 50) });
    return false;
  }
  try {
    await client.messages.create({
      from: config.twilio.phoneNumber,
      to,
      body,
    });
    return true;
  } catch (err) {
    console.error('Send SMS error:', err);
    return false;
  }
}

export async function logNotification(
  userId: string,
  channel: 'email' | 'sms' | 'websocket',
  type: string,
  payload: Record<string, unknown>,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await NotificationLog.create({
      userId,
      channel,
      type,
      payload,
      success,
      error,
    });
  } catch {
    // MongoDB may be unavailable
  }
}

export async function broadcastNewRequest(
  request: BloodRequestRow,
  eligibleDonors: EligibleDonor[]
): Promise<void> {
  const ws = getWsServer();
  if (!ws) return;
  const payload = {
    type: 'blood_request',
    request: {
      id: request.id,
      bloodGroup: request.blood_group,
      unitsRequired: request.units_required,
      urgency: request.urgency,
      createdAt: request.created_at,
    },
  };
  const donorUserIds = new Set(eligibleDonors.map((d) => d.userId));
  ws.broadcastToDonors(donorUserIds, payload);
}

export async function notifyDonorsSmsEmail(
  request: BloodRequestRow,
  eligibleDonors: EligibleDonor[]
): Promise<void> {
  const { query } = await import('../../db/postgres.js');
  const link = `${config.frontendUrl}/requests/${request.id}`;
  const subject = `[LifeLink] Emergency blood request: ${request.blood_group} - ${request.urgency}`;
  const html = `
    <h2>Emergency blood request</h2>
    <p>Blood group needed: <strong>${request.blood_group}</strong></p>
    <p>Units: ${request.units_required} | Urgency: ${request.urgency}</p>
    <p><a href="${link}">View and respond</a></p>
  `;
  const smsBody = `LifeLink: Blood ${request.blood_group} needed (${request.urgency}). Respond: ${link}`;

  for (const donor of eligibleDonors.slice(0, 100)) {
    const userRes = await query<{ email: string; phone: string | null }>(
      'SELECT email, phone FROM users WHERE id = $1',
      [donor.userId]
    );
    const user = userRes.rows[0];
    if (!user) continue;
    if (user.email) {
      const ok = await sendEmail(user.email, subject, html);
      await logNotification(donor.userId, 'email', 'blood_request_alert', { requestId: request.id }, ok);
    }
    if (user.phone) {
      const ok = await sendSms(user.phone, smsBody);
      await logNotification(donor.userId, 'sms', 'blood_request_alert', { requestId: request.id }, ok);
    }
  }
}
