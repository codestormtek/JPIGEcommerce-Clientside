import { sendEmail } from './mailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import prisma from './prisma';

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

// ─── Newsletter Confirmation (to subscriber) ──────────────────────────────────

export async function sendNewsletterConfirmation(email: string): Promise<void> {
  const subject = `You're subscribed to ${config.store.name}!`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#ff8c00;padding:24px;text-align:center;">
      <img src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png" alt="${config.store.name}" style="max-height:60px;" />
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#1F1F25;font-size:22px;margin:0 0 16px;">You're on the list!</h1>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Thanks for subscribing to the <strong>${config.store.name}</strong> newsletter. You'll be the first to hear about new products, specials, and where we're popping up next in the metro DC area.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${config.store.url}/shop" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:15px;">
          Shop Now
        </a>
      </div>
      <p style="color:#999;font-size:13px;line-height:1.5;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px;">
        If you didn't sign up for this, please ignore this email or contact us at
        <a href="mailto:${config.store.adminEmail}" style="color:#ff8c00;">${config.store.adminEmail}</a>.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999;">
      &copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
  const text = `You're subscribed to ${config.store.name}!\n\nThanks for signing up. You'll hear about new products, specials, and our latest BBQ locations.\n\nShop: ${config.store.url}/shop`;

  try {
    const providerId = await sendEmail({ to: email, subject, html, text });
    await logToOutbox({ toAddress: email, subject, bodyHtml: html, bodyText: text, templateKey: 'subscriber.confirmation', providerMessageId: providerId });
    logger.info('Newsletter confirmation sent', { to: email });
  } catch (err) {
    logger.error('Failed to send newsletter confirmation', { to: email, error: err });
    await logToOutbox({ toAddress: email, subject, bodyHtml: html, bodyText: text, templateKey: 'subscriber.confirmation', providerMessageId: null }).catch(() => {});
  }
}

// ─── Admin: New Subscriber ────────────────────────────────────────────────────

export async function sendAdminNewSubscriberNotification(email: string): Promise<void> {
  const subject = `New Newsletter Subscriber: ${email}`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#1F1F25;padding:20px 24px;">
      <h2 style="color:#ff8c00;margin:0;font-size:18px;">New Newsletter Subscriber</h2>
    </div>
    <div style="padding:24px;">
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px;">
        A new visitor just subscribed to the <strong>${config.store.name}</strong> mailing list.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;width:120px;">Email</td>
          <td style="padding:8px 12px;border:1px solid #eee;"><a href="mailto:${email}" style="color:#ff8c00;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Subscribed At</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      ${config.store.name} — Admin Notification
    </div>
  </div>
</body>
</html>`;
  const text = `New newsletter subscriber on ${config.store.name}\n\nEmail: ${email}\nSubscribed: ${new Date().toLocaleString()}`;

  try {
    const providerId = await sendEmail({ to: config.store.adminEmail, subject, html, text });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-subscriber', providerMessageId: providerId });
    logger.info('Admin new-subscriber notification sent', { to: email });
  } catch (err) {
    logger.error('Failed to send admin new-subscriber notification', { to: email, error: err });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-subscriber', providerMessageId: null }).catch(() => {});
  }
}

// ─── Admin: New Product Review ────────────────────────────────────────────────

export async function sendAdminNewReviewNotification(opts: {
  reviewerName: string;
  productName: string;
  productId: string;
  ratingValue: number;
  comment?: string | null;
}): Promise<void> {
  const { reviewerName, productName, productId, ratingValue, comment } = opts;
  const stars = '★'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue);
  const subject = `New Product Review: ${productName} (${ratingValue}/5)`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#1F1F25;padding:20px 24px;">
      <h2 style="color:#ff8c00;margin:0;font-size:18px;">New Product Review Pending Approval</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;width:130px;">Product</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${productName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Reviewer</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${reviewerName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Rating</td>
          <td style="padding:8px 12px;border:1px solid #eee;font-size:18px;color:#ff8c00;">${stars} (${ratingValue}/5)</td>
        </tr>
        ${comment ? `<tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Comment</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${comment}</td>
        </tr>` : ''}
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${config.store.url}/admin/reviews?productId=${productId}" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;">
          Review &amp; Approve
        </a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      ${config.store.name} — Admin Notification
    </div>
  </div>
</body>
</html>`;
  const text = `New product review on ${productName}\n\nReviewer: ${reviewerName}\nRating: ${ratingValue}/5\n${comment ? `Comment: ${comment}\n` : ''}`;

  try {
    const providerId = await sendEmail({ to: config.store.adminEmail, subject, html, text });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-review', providerMessageId: providerId });
    logger.info('Admin new-review notification sent', { productId });
  } catch (err) {
    logger.error('Failed to send admin new-review notification', { productId, error: err });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-review', providerMessageId: null }).catch(() => {});
  }
}

// ─── Order Confirmation (to customer) ────────────────────────────────────────

export async function sendOrderConfirmationToCustomer(opts: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  lines: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
  shippingAddress?: string | null;
}): Promise<void> {
  const { customerEmail, customerName, orderNumber, orderId, lines, subtotal, discountTotal, taxTotal, shippingTotal, grandTotal, currency, shippingAddress } = opts;
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;
  const subject = `Order Confirmed — ${orderNumber}`;

  const lineRows = lines.map(l => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">${l.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${l.qty}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(l.lineTotal)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e0e0e0;">
      <tr><td style="background:#ff8c00;padding:24px;text-align:center;">
        <img src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png" alt="${config.store.name}" style="max-height:55px;" />
      </td></tr>
      <tr><td style="padding:32px 24px;">
        <h1 style="color:#1F1F25;font-size:22px;margin:0 0 8px;">Order Confirmed!</h1>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi ${customerName}, thanks for your order. We're getting it ready for you.</p>
        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <table width="100%"><tr>
            <td style="font-size:13px;color:#888;">Order Number</td>
            <td style="font-size:15px;font-weight:700;color:#1F1F25;text-align:right;">${orderNumber}</td>
          </tr></table>
          ${shippingAddress ? `<p style="font-size:13px;color:#888;margin:12px 0 4px;">Shipping to</p><p style="font-size:14px;color:#333;margin:0;">${shippingAddress}</p>` : ''}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;">
          <thead><tr style="background:#f5f6fa;">
            <th style="padding:10px 8px;text-align:left;font-size:12px;color:#8094ae;text-transform:uppercase;">Item</th>
            <th style="padding:10px 8px;text-align:center;font-size:12px;color:#8094ae;text-transform:uppercase;">Qty</th>
            <th style="padding:10px 8px;text-align:right;font-size:12px;color:#8094ae;text-transform:uppercase;">Total</th>
          </tr></thead>
          <tbody>${lineRows}</tbody>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
          <tr><td style="padding:6px 8px;color:#526484;">Subtotal</td><td style="padding:6px 8px;text-align:right;">${fmt(subtotal)}</td></tr>
          ${discountTotal > 0 ? `<tr><td style="padding:6px 8px;color:#526484;">Discount</td><td style="padding:6px 8px;text-align:right;color:#e85347;">-${fmt(discountTotal)}</td></tr>` : ''}
          ${taxTotal > 0 ? `<tr><td style="padding:6px 8px;color:#526484;">Tax</td><td style="padding:6px 8px;text-align:right;">${fmt(taxTotal)}</td></tr>` : ''}
          ${shippingTotal > 0 ? `<tr><td style="padding:6px 8px;color:#526484;">Shipping</td><td style="padding:6px 8px;text-align:right;">${fmt(shippingTotal)}</td></tr>` : ''}
          <tr style="border-top:2px solid #1c2b46;">
            <td style="padding:10px 8px;font-weight:700;color:#1c2b46;">Grand Total</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:#1c2b46;font-size:18px;">${fmt(grandTotal)}</td>
          </tr>
        </table>
        <div style="text-align:center;margin:28px 0;">
          <a href="${config.store.url}/orders" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:15px;">
            View My Order
          </a>
        </div>
        <p style="color:#888;font-size:13px;line-height:1.5;margin:16px 0 0;border-top:1px solid #eee;padding-top:16px;">
          Questions? Email us at <a href="mailto:${config.store.adminEmail}" style="color:#ff8c00;">${config.store.adminEmail}</a>
        </p>
      </td></tr>
      <tr><td style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999;">
        &copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  const text = `Order Confirmed — ${orderNumber}\n\nHi ${customerName}, your order has been placed.\nGrand Total: ${fmt(grandTotal)}\n\nView your order: ${config.store.url}/orders`;

  try {
    const providerId = await sendEmail({ to: customerEmail, subject, html, text });
    await logToOutbox({ toAddress: customerEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'order.confirmation', providerMessageId: providerId });
    logger.info('Order confirmation sent to customer', { to: customerEmail, orderNumber });
  } catch (err) {
    logger.error('Failed to send order confirmation', { to: customerEmail, orderNumber, error: err });
    await logToOutbox({ toAddress: customerEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'order.confirmation', providerMessageId: null }).catch(() => {});
  }
}

// ─── Admin: New Order ─────────────────────────────────────────────────────────

export async function sendAdminNewOrderNotification(opts: {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  grandTotal: number;
  currency: string;
  itemCount: number;
}): Promise<void> {
  const { orderNumber, orderId, customerName, customerEmail, grandTotal, currency, itemCount } = opts;
  const subject = `New Order Received — ${orderNumber}`;
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#1F1F25;padding:20px 24px;">
      <h2 style="color:#ff8c00;margin:0;font-size:18px;">New Order Received</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;width:140px;">Order #</td><td style="padding:8px 12px;border:1px solid #eee;font-weight:700;">${orderNumber}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Customer</td><td style="padding:8px 12px;border:1px solid #eee;">${customerName}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Email</td><td style="padding:8px 12px;border:1px solid #eee;"><a href="mailto:${customerEmail}" style="color:#ff8c00;">${customerEmail}</a></td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Items</td><td style="padding:8px 12px;border:1px solid #eee;">${itemCount}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Grand Total</td><td style="padding:8px 12px;border:1px solid #eee;font-weight:700;font-size:16px;color:#1c2b46;">${fmt(grandTotal)}</td></tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${config.store.adminUrl ?? config.store.url}/admin/orders/${orderId}" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;">
          View Order &amp; Capture Payment
        </a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      ${config.store.name} — Admin Notification
    </div>
  </div>
</body>
</html>`;
  const text = `New order ${orderNumber} from ${customerName} (${customerEmail})\nTotal: ${fmt(grandTotal)} — ${itemCount} item(s)`;

  try {
    const providerId = await sendEmail({ to: config.store.adminEmail, subject, html, text });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-order', providerMessageId: providerId });
    logger.info('Admin new-order notification sent', { orderNumber });
  } catch (err) {
    logger.error('Failed to send admin new-order notification', { orderNumber, error: err });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-order', providerMessageId: null }).catch(() => {});
  }
}

// ─── Admin: New Blog Comment ──────────────────────────────────────────────────

export async function sendAdminNewCommentNotification(opts: {
  commenterName: string;
  postTitle: string;
  postId: string;
  body: string;
}): Promise<void> {
  const { commenterName, postTitle, postId, body } = opts;
  const subject = `New Blog Comment on: ${postTitle}`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9f9f9;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#1F1F25;padding:20px 24px;">
      <h2 style="color:#ff8c00;margin:0;font-size:18px;">New Blog Comment</h2>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;width:130px;">Post</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${postTitle}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Commenter</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${commenterName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Comment</td>
          <td style="padding:8px 12px;border:1px solid #eee;">${body}</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${config.store.url}/admin/blog/${postId}" style="display:inline-block;background:#ff8c00;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:600;font-size:14px;">
          View Post
        </a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:12px 24px;text-align:center;font-size:12px;color:#999;">
      ${config.store.name} — Admin Notification
    </div>
  </div>
</body>
</html>`;
  const text = `New blog comment on "${postTitle}"\n\nCommenter: ${commenterName}\nComment: ${body}`;

  try {
    const providerId = await sendEmail({ to: config.store.adminEmail, subject, html, text });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-comment', providerMessageId: providerId });
    logger.info('Admin new-comment notification sent', { postId });
  } catch (err) {
    logger.error('Failed to send admin new-comment notification', { postId, error: err });
    await logToOutbox({ toAddress: config.store.adminEmail, subject, bodyHtml: html, bodyText: text, templateKey: 'admin.new-comment', providerMessageId: null }).catch(() => {});
  }
}
