import { sendEmail } from './mailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import prisma from './prisma';

interface NewUserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string;
  phoneNumber?: string | null;
  createdAt: Date;
}

async function logToOutbox(data: {
  toAddress: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  templateKey: string;
  providerMessageId: string | null;
}) {
  await prisma.messageOutbox.create({
    data: {
      channel: 'email',
      templateKey: data.templateKey,
      status: data.providerMessageId ? 'sent' : 'failed',
      toAddress: data.toAddress,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
      payloadJson: JSON.stringify({ toAddress: data.toAddress }),
      providerMessageId: data.providerMessageId,
      sentAt: data.providerMessageId ? new Date() : null,
    },
  });
}

export async function sendWelcomeEmail(user: NewUserInfo): Promise<void> {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Valued Customer';
  const subject = `Welcome to ${config.store.name}!`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#ff8c00;padding:24px;text-align:center;">
      <img src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png" alt="${config.store.name}" style="max-height:60px;" />
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#1F1F25;font-size:22px;margin:0 0 16px;">Welcome, ${fullName}!</h1>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Thank you for creating an account with <strong>${config.store.name}</strong>. We're excited to have you as part of our community!
      </p>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
        With your new account you can:
      </p>
      <ul style="color:#555;font-size:15px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>Browse and shop our full product line</li>
        <li>Track your orders and view invoices</li>
        <li>Save your favorite items to your wishlist</li>
        <li>Leave reviews and join the conversation</li>
      </ul>
      <div style="text-align:center;margin:24px 0;">
        <a href="${config.store.url}/shop" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:15px;">
          Start Shopping
        </a>
      </div>
      <p style="color:#999;font-size:13px;line-height:1.5;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px;">
        If you didn't create this account, please ignore this email or contact us at
        <a href="mailto:${config.store.adminEmail}" style="color:#ff8c00;">${config.store.adminEmail}</a>.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999;">
      &copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const text = `Welcome to ${config.store.name}, ${fullName}!\n\nThank you for creating an account. You can now browse our products, track orders, and more.\n\nStart shopping: ${config.store.url}/shop`;

  try {
    const providerId = await sendEmail({ to: user.emailAddress, subject, html, text });
    await logToOutbox({
      toAddress: user.emailAddress,
      subject,
      bodyHtml: html,
      bodyText: text,
      templateKey: 'customer.welcome',
      providerMessageId: providerId,
    });
    logger.info('Welcome email sent', { userId: user.id, to: user.emailAddress });
  } catch (err) {
    logger.error('Failed to send welcome email', { userId: user.id, error: err });
    await logToOutbox({
      toAddress: user.emailAddress,
      subject,
      bodyHtml: html,
      bodyText: text,
      templateKey: 'customer.welcome',
      providerMessageId: null,
    }).catch(() => {});
  }
}

export async function sendAdminNewUserNotification(user: NewUserInfo): Promise<void> {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A';
  const subject = `New Customer Registration: ${fullName}`;
  const registeredAt = user.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#1F1F25;padding:20px 24px;">
      <h2 style="color:#ff8c00;margin:0;font-size:18px;">New Customer Registration</h2>
    </div>
    <div style="padding:24px;">
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">
        A new customer has registered on <strong>${config.store.name}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;width:140px;">Name</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${fullName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Email</td>
          <td style="padding:8px 12px;border:1px solid #eee;"><a href="mailto:${user.emailAddress}" style="color:#ff8c00;">${user.emailAddress}</a></td>
        </tr>
        ${user.phoneNumber ? `<tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Phone</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${user.phoneNumber}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Customer ID</td>
          <td style="padding:8px 12px;border:1px solid #eee;font-family:monospace;font-size:12px;">${user.id}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Registered At</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${registeredAt}</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${config.store.url}/admin/customers/${user.id}" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;">
          View Customer
        </a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      ${config.store.name} — Admin Notification
    </div>
  </div>
</body>
</html>`;

  const text = `New customer registered on ${config.store.name}\n\nName: ${fullName}\nEmail: ${user.emailAddress}${user.phoneNumber ? `\nPhone: ${user.phoneNumber}` : ''}\nID: ${user.id}\nRegistered: ${registeredAt}`;

  try {
    const providerId = await sendEmail({ to: config.store.adminEmail, subject, html, text });
    await logToOutbox({
      toAddress: config.store.adminEmail,
      subject,
      bodyHtml: html,
      bodyText: text,
      templateKey: 'admin.new-customer',
      providerMessageId: providerId,
    });
    logger.info('Admin new-user notification sent', { userId: user.id });
  } catch (err) {
    logger.error('Failed to send admin new-user notification', { userId: user.id, error: err });
    await logToOutbox({
      toAddress: config.store.adminEmail,
      subject,
      bodyHtml: html,
      bodyText: text,
      templateKey: 'admin.new-customer',
      providerMessageId: null,
    }).catch(() => {});
  }
}
