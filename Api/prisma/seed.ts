/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// ─── User seed data ──────────────────────────────────────────────────────────

interface UserSeedInput {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  optInEmail?: boolean;
  optInSms?: boolean;
}

/** 2 admin accounts — Jerome Harrison is the primary. */
const adminUsers: UserSeedInput[] = [
  {
    firstName: 'Jerome',
    lastName: 'Harrison',
    emailAddress: 'jeromeharrison@gmail.com',
    password: 'N0dice2d@y',
    phoneNumber: '555-300-0001',
    role: 'admin',
    optInEmail: true,
    optInSms: false,
  },
  {
    firstName: 'Admin',
    lastName: 'JPIG',
    emailAddress: 'admin@jpig.com',
    password: 'Adm!nJpig2024',
    phoneNumber: '555-300-0002',
    role: 'admin',
    optInEmail: true,
    optInSms: false,
  },
];

/** 3 regular (non-customer) user accounts. */
const regularUsers: UserSeedInput[] = [
  {
    firstName: 'Alex',
    lastName: 'Morgan',
    emailAddress: 'alex.morgan@example.com',
    password: 'User@Secure1!',
    phoneNumber: '555-100-1001',
    role: 'user',
    optInEmail: true,
    optInSms: false,
  },
  {
    firstName: 'Sam',
    lastName: 'Rivera',
    emailAddress: 'sam.rivera@example.com',
    password: 'User@Secure2!',
    phoneNumber: '555-100-1002',
    role: 'user',
    optInEmail: false,
    optInSms: false,
  },
  {
    firstName: 'Taylor',
    lastName: 'Brooks',
    emailAddress: 'taylor.brooks@example.com',
    password: 'User@Secure3!',
    role: 'user',
    optInEmail: true,
    optInSms: false,
  },
];

/** 5 customer accounts with phone numbers and email opt-ins. */
const customerUsers: UserSeedInput[] = [
  {
    firstName: 'Maria',
    lastName: 'Gonzalez',
    emailAddress: 'maria.gonzalez@example.com',
    password: 'Cust@Secure1!',
    phoneNumber: '555-200-2001',
    role: 'user',
    optInEmail: true,
    optInSms: true,
  },
  {
    firstName: 'James',
    lastName: 'Chen',
    emailAddress: 'james.chen@example.com',
    password: 'Cust@Secure2!',
    phoneNumber: '555-200-2002',
    role: 'user',
    optInEmail: true,
    optInSms: false,
  },
  {
    firstName: 'Priya',
    lastName: 'Patel',
    emailAddress: 'priya.patel@example.com',
    password: 'Cust@Secure3!',
    phoneNumber: '555-200-2003',
    role: 'user',
    optInEmail: true,
    optInSms: true,
  },
  {
    firstName: 'David',
    lastName: 'Okafor',
    emailAddress: 'david.okafor@example.com',
    password: 'Cust@Secure4!',
    phoneNumber: '555-200-2004',
    role: 'user',
    optInEmail: false,
    optInSms: false,
  },
  {
    firstName: 'Sarah',
    lastName: 'Whitfield',
    emailAddress: 'sarah.whitfield@example.com',
    password: 'Cust@Secure5!',
    phoneNumber: '555-200-2005',
    role: 'user',
    optInEmail: true,
    optInSms: true,
  },
];

// ─── Template helper types ───────────────────────────────────────────────────

interface TemplateInput {
  eventKey: string;
  channel: 'email' | 'sms';
  audience: 'customer' | 'admin';
  locale: string;
  name: string;
  subject?: string;
  bodyHtml?: string;
  bodyText: string;
  variablesSchema?: string;
}

// ─── Template definitions ────────────────────────────────────────────────────

const templates: TemplateInput[] = [
  // ── Customer: Welcome ──────────────────────────────────────────────────────
  {
    eventKey: 'Customer.WelcomeMessage',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Customer Welcome Message',
    subject: 'Welcome to {{storeName}}, {{email}}!',
    bodyHtml: `<p>Hi there,</p>
<p>Welcome to <strong>{{storeName}}</strong>! Your account has been created successfully.</p>
<p>You can now browse our menu, place orders, and track deliveries.</p>
<p>If you have any questions, reply to this email or visit our <a href="{{storeUrl}}">website</a>.</p>
<p>Thanks for joining us!<br/>The {{storeName}} Team</p>`,
    bodyText: `Welcome to {{storeName}}!\n\nYour account has been created. Visit us at {{storeUrl}}.\n\nThanks,\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', storeUrl: 'string', email: 'string' }),
  },
  {
    eventKey: 'Customer.WelcomeMessage',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Customer Welcome SMS',
    bodyText: `Welcome to {{storeName}}! Your account is ready. Visit {{storeUrl}} to explore our menu.`,
    variablesSchema: JSON.stringify({ storeName: 'string', storeUrl: 'string' }),
  },

  // ── Customer: New Registration (Admin Notification) ────────────────────────
  {
    eventKey: 'NewCustomer.Notification',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'New Customer Registration (Admin)',
    subject: 'New customer registered: {{email}}',
    bodyHtml: `<p>A new customer registered on <strong>{{storeName}}</strong>.</p>
<ul>
  <li><strong>Email:</strong> {{email}}</li>
  <li><strong>Date:</strong> {{registeredAt}}</li>
  <li><strong>IP:</strong> {{ip}}</li>
</ul>`,
    bodyText: `New customer registered on {{storeName}}.\nEmail: {{email}}\nDate: {{registeredAt}}\nIP: {{ip}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', email: 'string', registeredAt: 'string', ip: 'string' }),
  },

  // ── Customer: Email Validation ─────────────────────────────────────────────
  {
    eventKey: 'Customer.EmailValidationMessage',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Customer Email Validation',
    subject: 'Please verify your email address',
    bodyHtml: `<p>Hi,</p>
<p>Please verify your email address by clicking the link below:</p>
<p><a href="{{verifyUrl}}">Verify My Email</a></p>
<p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Please verify your email by visiting:\n{{verifyUrl}}\n\nThis link expires in 24 hours.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', verifyUrl: 'string' }),
  },

  // ── Customer: Password Recovery ────────────────────────────────────────────
  {
    eventKey: 'Customer.PasswordRecovery',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Customer Password Recovery',
    subject: 'Reset your {{storeName}} password',
    bodyHtml: `<p>Hi,</p>
<p>We received a request to reset the password for your {{storeName}} account.</p>
<p><a href="{{resetUrl}}">Reset My Password</a></p>
<p>This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Password reset requested for your {{storeName}} account.\n\nVisit: {{resetUrl}}\n\nThis link expires in 1 hour.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', resetUrl: 'string' }),
  },
  {
    eventKey: 'Customer.PasswordRecovery',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Customer Password Recovery SMS',
    bodyText: `{{storeName}}: Your password reset link is {{resetUrl}} — expires in 1 hour. Ignore if you didn't request this.`,
    variablesSchema: JSON.stringify({ storeName: 'string', resetUrl: 'string' }),
  },

  // ── Order: Placed (Customer) ───────────────────────────────────────────────
  {
    eventKey: 'OrderPlaced.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Placed - Customer Notification',
    subject: 'Order Confirmation #{{orderNumber}} — {{storeName}}',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Thank you for your order! Here are your order details:</p>
<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;">
  <tr><th>Order #</th><td>{{orderNumber}}</td></tr>
  <tr><th>Date</th><td>{{orderDate}}</td></tr>
  <tr><th>Total</th><td>{{orderTotal}}</td></tr>
  <tr><th>Status</th><td>{{orderStatus}}</td></tr>
</table>
<p>We will notify you when your order status changes.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Order Confirmed!\n\nOrder #{{orderNumber}}\nDate: {{orderDate}}\nTotal: {{orderTotal}}\nStatus: {{orderStatus}}\n\nThank you for ordering from {{storeName}}!`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', orderDate: 'string', orderTotal: 'string', orderStatus: 'string' }),
  },
  {
    eventKey: 'OrderPlaced.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Order Placed - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} confirmed! Total: {{orderTotal}}. We'll keep you updated on your order status.`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string', orderTotal: 'string' }),
  },
  {
    eventKey: 'OrderPlaced.StoreOwnerNotification',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'Order Placed - Store Owner Notification',
    subject: 'New Order #{{orderNumber}} received',
    bodyHtml: `<p>A new order has been placed on <strong>{{storeName}}</strong>.</p>
<ul>
  <li><strong>Order #:</strong> {{orderNumber}}</li>
  <li><strong>Customer:</strong> {{customerEmail}}</li>
  <li><strong>Total:</strong> {{orderTotal}}</li>
  <li><strong>Date:</strong> {{orderDate}}</li>
</ul>`,
    bodyText: `New order received on {{storeName}}.\nOrder #{{orderNumber}}\nCustomer: {{customerEmail}}\nTotal: {{orderTotal}}\nDate: {{orderDate}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', orderDate: 'string', orderTotal: 'string' }),
  },

  // ── Order: Paid ────────────────────────────────────────────────────────────
  {
    eventKey: 'OrderPaid.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Paid - Customer Notification',
    subject: 'Payment received for Order #{{orderNumber}}',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>We have received your payment for Order #<strong>{{orderNumber}}</strong>.</p>
<p><strong>Amount Paid:</strong> {{orderTotal}}</p>
<p>Your order is now being processed. We'll notify you when it ships.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Payment confirmed for Order #{{orderNumber}}.\nAmount: {{orderTotal}}\n\nYour order is now being processed.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', orderTotal: 'string' }),
  },
  {
    eventKey: 'OrderPaid.StoreOwnerNotification',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'Order Paid - Store Owner Notification',
    subject: 'Payment received for Order #{{orderNumber}}',
    bodyHtml: `<p>Payment has been received for Order #<strong>{{orderNumber}}</strong> on {{storeName}}.</p>
<ul>
  <li><strong>Customer:</strong> {{customerEmail}}</li>
  <li><strong>Amount:</strong> {{orderTotal}}</li>
  <li><strong>Payment Method:</strong> {{paymentMethod}}</li>
</ul>`,
    bodyText: `Payment received for Order #{{orderNumber}} on {{storeName}}.\nCustomer: {{customerEmail}}\nAmount: {{orderTotal}}\nMethod: {{paymentMethod}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', orderTotal: 'string', paymentMethod: 'string' }),
  },

  // ── Order: Processing ──────────────────────────────────────────────────────
  {
    eventKey: 'OrderProcessing.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Processing - Customer Notification',
    subject: 'Your order #{{orderNumber}} is being prepared',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Great news! Your order #<strong>{{orderNumber}}</strong> is now being prepared.</p>
<p>We'll let you know when it's on its way.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Your order #{{orderNumber}} is now being prepared. We'll update you when it ships.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string' }),
  },
  {
    eventKey: 'OrderProcessing.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Order Processing - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} is now being prepared. We'll notify you when it's on the way!`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string' }),
  },

  // ── Order: Completed ───────────────────────────────────────────────────────
  {
    eventKey: 'OrderCompleted.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Completed - Customer Notification',
    subject: 'Your order #{{orderNumber}} is complete — Thank you!',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Your order #<strong>{{orderNumber}}</strong> has been completed. We hope you enjoyed it!</p>
<p>We'd love to hear your feedback. Please consider leaving a review.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Order #{{orderNumber}} is complete! We hope you enjoyed it. Thank you for choosing {{storeName}}!`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string' }),
  },
  {
    eventKey: 'OrderCompleted.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Order Completed - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} is complete! Thanks for your order. We hope to see you again soon!`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string' }),
  },

  // ── Order: Cancelled ───────────────────────────────────────────────────────
  {
    eventKey: 'OrderCancelled.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Cancelled - Customer Notification',
    subject: 'Your order #{{orderNumber}} has been cancelled',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Your order #<strong>{{orderNumber}}</strong> has been cancelled.</p>
{{#if refundAmount}}<p>A refund of <strong>{{refundAmount}}</strong> will be processed within 5–10 business days.</p>{{/if}}
<p>If you have any questions, please contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Order #{{orderNumber}} has been cancelled.\n{{#if refundAmount}}Refund of {{refundAmount}} will be processed within 5-10 days.\n{{/if}}\nQuestions? Contact {{supportEmail}}\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', refundAmount: 'string?', supportEmail: 'string' }),
  },
  {
    eventKey: 'OrderCancelled.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Order Cancelled - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} has been cancelled. Questions? Contact us at {{supportEmail}}.`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string', supportEmail: 'string' }),
  },

  // ── Order: Refunded ────────────────────────────────────────────────────────
  {
    eventKey: 'OrderRefunded.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Order Refunded - Customer Notification',
    subject: 'Refund processed for Order #{{orderNumber}}',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>A refund of <strong>{{refundAmount}}</strong> has been processed for Order #{{orderNumber}}.</p>
<p>Please allow 5–10 business days for the funds to appear in your account.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Refund of {{refundAmount}} processed for Order #{{orderNumber}}.\nAllow 5-10 business days for the funds to appear.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', refundAmount: 'string' }),
  },
  {
    eventKey: 'OrderRefunded.StoreOwnerNotification',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'Order Refunded - Store Owner Notification',
    subject: 'Refund issued for Order #{{orderNumber}}',
    bodyHtml: `<p>A refund has been issued for Order #<strong>{{orderNumber}}</strong> on {{storeName}}.</p>
<ul>
  <li><strong>Customer:</strong> {{customerEmail}}</li>
  <li><strong>Refund Amount:</strong> {{refundAmount}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>`,
    bodyText: `Refund issued on {{storeName}}.\nOrder #{{orderNumber}}\nCustomer: {{customerEmail}}\nAmount: {{refundAmount}}\nReason: {{reason}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', refundAmount: 'string', reason: 'string' }),
  },

  // ── Order: New Note ────────────────────────────────────────────────────────
  {
    eventKey: 'Customer.NewOrderNote',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'New Order Note - Customer Notification',
    subject: 'New note added to your order #{{orderNumber}}',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>A note has been added to your order #<strong>{{orderNumber}}</strong>:</p>
<blockquote style="border-left:4px solid #ccc;padding-left:12px;">{{noteText}}</blockquote>
<p>The {{storeName}} Team</p>`,
    bodyText: `A note was added to Order #{{orderNumber}}:\n\n"{{noteText}}"\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', noteText: 'string' }),
  },

  // ── Shipment: Sent ─────────────────────────────────────────────────────────
  {
    eventKey: 'ShipmentSent.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Shipment Sent - Customer Notification',
    subject: 'Your order #{{orderNumber}} is on its way!',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Your order #<strong>{{orderNumber}}</strong> has been dispatched!</p>
{{#if trackingNumber}}<p><strong>Tracking Number:</strong> {{trackingNumber}}</p>{{/if}}
{{#if trackingUrl}}<p><a href="{{trackingUrl}}">Track My Order</a></p>{{/if}}
<p>Estimated delivery: <strong>{{estimatedDelivery}}</strong></p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Your order #{{orderNumber}} has been dispatched!\n{{#if trackingNumber}}Tracking: {{trackingNumber}}\n{{/if}}Estimated delivery: {{estimatedDelivery}}\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string', trackingNumber: 'string?', trackingUrl: 'string?', estimatedDelivery: 'string' }),
  },
  {
    eventKey: 'ShipmentSent.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Shipment Sent - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} is on its way! Est. delivery: {{estimatedDelivery}}.{{#if trackingUrl}} Track: {{trackingUrl}}{{/if}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string', estimatedDelivery: 'string', trackingUrl: 'string?' }),
  },

  // ── Shipment: Delivered ────────────────────────────────────────────────────
  {
    eventKey: 'ShipmentDelivered.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Shipment Delivered - Customer Notification',
    subject: 'Your order #{{orderNumber}} has been delivered',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Your order #<strong>{{orderNumber}}</strong> has been delivered. We hope you love it!</p>
<p>Please let us know how we did by leaving a review.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Order #{{orderNumber}} has been delivered. Thank you for ordering from {{storeName}}! We'd love your feedback.`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', orderNumber: 'string' }),
  },
  {
    eventKey: 'ShipmentDelivered.CustomerNotification',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Shipment Delivered - Customer SMS',
    bodyText: `{{storeName}}: Order #{{orderNumber}} delivered! Enjoy! Leave a review to let us know how we did.`,
    variablesSchema: JSON.stringify({ storeName: 'string', orderNumber: 'string' }),
  },

  // ── Newsletter: Activation ─────────────────────────────────────────────────
  {
    eventKey: 'NewsLetterSubscription.ActivationMessage',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Newsletter Subscription Activation',
    subject: 'Confirm your subscription to {{storeName}}',
    bodyHtml: `<p>Hi,</p>
<p>Thank you for subscribing to the <strong>{{storeName}}</strong> newsletter!</p>
<p>Please confirm your subscription by clicking the link below:</p>
<p><a href="{{activationUrl}}">Confirm My Subscription</a></p>
<p>If you did not sign up, please ignore this email.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `Confirm your {{storeName}} newsletter subscription:\n{{activationUrl}}\n\nIf you did not sign up, ignore this email.\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', activationUrl: 'string' }),
  },

  // ── Newsletter: Deactivation ───────────────────────────────────────────────
  {
    eventKey: 'NewsLetterSubscription.DeactivationMessage',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Newsletter Subscription Deactivation',
    subject: "You've been unsubscribed from {{storeName}}",
    bodyHtml: `<p>Hi,</p>
<p>You have successfully unsubscribed from the <strong>{{storeName}}</strong> newsletter.</p>
<p>We're sorry to see you go! If this was a mistake, you can <a href="{{resubscribeUrl}}">re-subscribe here</a>.</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `You've been unsubscribed from {{storeName}} newsletter.\nWant to re-subscribe? Visit: {{resubscribeUrl}}\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', resubscribeUrl: 'string' }),
  },

  // ── Product: New Review (Admin) ────────────────────────────────────────────
  {
    eventKey: 'Product.ProductReview',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'New Product Review - Admin Notification',
    subject: 'New review submitted for "{{productName}}"',
    bodyHtml: `<p>A new review has been submitted for <strong>{{productName}}</strong> on {{storeName}}.</p>
<ul>
  <li><strong>Customer:</strong> {{customerEmail}}</li>
  <li><strong>Rating:</strong> {{rating}}/5</li>
  <li><strong>Comment:</strong> {{comment}}</li>
</ul>
<p>Please review and approve or reject it in the admin panel.</p>`,
    bodyText: `New review for "{{productName}}" on {{storeName}}.\nCustomer: {{customerEmail}}\nRating: {{rating}}/5\nComment: {{comment}}\n\nPlease approve or reject in the admin panel.`,
    variablesSchema: JSON.stringify({ storeName: 'string', productName: 'string', customerEmail: 'string', rating: 'number', comment: 'string' }),
  },

  // ── Product: Review Reply (Customer) ──────────────────────────────────────
  {
    eventKey: 'ProductReview.Reply.CustomerNotification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Product Review Reply - Customer Notification',
    subject: 'A reply to your review of "{{productName}}"',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>The store has replied to your review of <strong>{{productName}}</strong>:</p>
<blockquote style="border-left:4px solid #ccc;padding-left:12px;">{{replyText}}</blockquote>
<p>The {{storeName}} Team</p>`,
    bodyText: `Reply to your review of "{{productName}}":\n\n"{{replyText}}"\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', productName: 'string', replyText: 'string' }),
  },

  // ── Inventory: Low Stock ───────────────────────────────────────────────────
  {
    eventKey: 'QuantityBelow.StoreOwnerNotification',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'Low Stock Alert - Admin Notification',
    subject: 'Low stock alert: {{productName}} (SKU: {{sku}})',
    bodyHtml: `<p>Stock for <strong>{{productName}}</strong> (SKU: {{sku}}) has fallen below the minimum threshold.</p>
<ul>
  <li><strong>Current Qty:</strong> {{currentQty}}</li>
  <li><strong>Threshold:</strong> {{threshold}}</li>
</ul>
<p>Please restock this item soon.</p>`,
    bodyText: `Low stock alert on {{storeName}}!\n{{productName}} (SKU: {{sku}})\nCurrent Qty: {{currentQty}}\nThreshold: {{threshold}}\n\nPlease restock soon.`,
    variablesSchema: JSON.stringify({ storeName: 'string', productName: 'string', sku: 'string', currentQty: 'number', threshold: 'number' }),
  },

  // ── Product: Back In Stock ─────────────────────────────────────────────────
  {
    eventKey: 'Customer.BackInStock',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Back In Stock - Customer Notification',
    subject: '"{{productName}}" is back in stock!',
    bodyHtml: `<p>Hi {{customerEmail}},</p>
<p>Great news! <strong>{{productName}}</strong> is back in stock at <strong>{{storeName}}</strong>.</p>
<p><a href="{{productUrl}}">Shop Now</a></p>
<p>Hurry — quantities are limited!</p>
<p>The {{storeName}} Team</p>`,
    bodyText: `{{productName}} is back in stock at {{storeName}}!\n\nShop now: {{productUrl}}\n\nQuantities are limited!\n\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', customerEmail: 'string', productName: 'string', productUrl: 'string' }),
  },
  {
    eventKey: 'Customer.BackInStock',
    channel: 'sms',
    audience: 'customer',
    locale: 'en',
    name: 'Back In Stock - Customer SMS',
    bodyText: `{{storeName}}: "{{productName}}" is back in stock! Grab it before it's gone: {{productUrl}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', productName: 'string', productUrl: 'string' }),
  },

  // ── Service: Contact Us ────────────────────────────────────────────────────
  {
    eventKey: 'Service.ContactUs',
    channel: 'email',
    audience: 'admin',
    locale: 'en',
    name: 'Contact Us - Admin Notification',
    subject: 'New contact inquiry from {{senderName}}',
    bodyHtml: `<p>A new contact form submission was received on <strong>{{storeName}}</strong>.</p>
<ul>
  <li><strong>Name:</strong> {{senderName}}</li>
  <li><strong>Email:</strong> {{senderEmail}}</li>
  <li><strong>Subject:</strong> {{subject}}</li>
</ul>
<blockquote style="border-left:4px solid #ccc;padding-left:12px;">{{message}}</blockquote>`,
    bodyText: `New contact inquiry on {{storeName}}.\nFrom: {{senderName}} <{{senderEmail}}>\nSubject: {{subject}}\n\n{{message}}`,
    variablesSchema: JSON.stringify({ storeName: 'string', senderName: 'string', senderEmail: 'string', subject: 'string', message: 'string' }),
  },

  // ── Gift Card ──────────────────────────────────────────────────────────────
  {
    eventKey: 'GiftCard.Notification',
    channel: 'email',
    audience: 'customer',
    locale: 'en',
    name: 'Gift Card Notification',
    subject: "You've received a {{storeName}} gift card!",
    bodyHtml: `<p>Hi {{recipientName}},</p>
<p>You've received a gift card for <strong>{{storeName}}</strong>!</p>
<ul>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Code:</strong> <code>{{giftCardCode}}</code></li>
  <li><strong>Expires:</strong> {{expiresAt}}</li>
</ul>
<p>Use your code at checkout to redeem it.</p>
{{#if senderMessage}}<p>Message from {{senderName}}: <em>{{senderMessage}}</em></p>{{/if}}
<p>The {{storeName}} Team</p>`,
    bodyText: `You've received a {{storeName}} gift card!\nAmount: {{amount}}\nCode: {{giftCardCode}}\nExpires: {{expiresAt}}\n{{#if senderMessage}}\nMessage from {{senderName}}: {{senderMessage}}\n{{/if}}\nThe {{storeName}} Team`,
    variablesSchema: JSON.stringify({ storeName: 'string', recipientName: 'string', amount: 'string', giftCardCode: 'string', expiresAt: 'string', senderName: 'string?', senderMessage: 'string?' }),
  },
];

// ─── Users seed function ─────────────────────────────────────────────────────

async function seedUsers(): Promise<void> {
  const allUsers = [...adminUsers, ...regularUsers, ...customerUsers];
  let created = 0;
  let updated = 0;

  for (const u of allUsers) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    const existing = await prisma.siteUser.findUnique({
      where: { emailAddress: u.emailAddress },
    });

    if (existing) {
      // Update password hash + names + role in case they changed in seed data
      await prisma.siteUser.update({
        where: { emailAddress: u.emailAddress },
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash,
          role: u.role,
          phoneNumber: u.phoneNumber ?? null,
          isActive: true,
          isDeleted: false,
          lastModifiedAt: new Date(),
        },
      });
      updated++;
      console.log(`  🔄 Updated: ${u.firstName} ${u.lastName} <${u.emailAddress}> (${u.role})`);
    } else {
      const user = await prisma.siteUser.create({
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          emailAddress: u.emailAddress,
          passwordHash,
          phoneNumber: u.phoneNumber ?? null,
          role: u.role,
          isActive: true,
        },
      });

      // Create default contact preferences
      await prisma.userContactPreference.create({
        data: {
          userId: user.id,
          optInEmail: u.optInEmail ?? true,
          optInSms: u.optInSms ?? false,
          preferredLanguage: 'en',
          timezone: 'America/New_York',
        },
      });

      created++;
      console.log(`  ✅ Created: ${u.emailAddress} (${u.role})`);
    }
  }

  console.log(`\n👤  Users: ${created} created, ${updated} updated.`);
}

// ─── Product seed data ───────────────────────────────────────────────────────

interface ProductSeedInput {
  name: string;
  description: string;
  price: number;
  quantity: number;
  sku: string;
  qtyInStock: number;
  categoryName: string;
}

const BRAND_NAME = 'The Jiggling Pig, LLC';
const PARENT_CATEGORY_NAME = 'Jiggling Pig Products';

const productSeeds: ProductSeedInput[] = [
  // Sauces
  {
    name: 'Backyard Boogie BBQ Sauce',
    description:
      "Our own signature award winning BBQ sauce – sweet, tangy with a bit of spice.",
    price: 8.0,
    quantity: 100,
    sku: 'JP-SAU-BBQ',
    qtyInStock: 100,
    categoryName: 'Sauces',
  },
  {
    name: 'Carolina Swine Sweat',
    description:
      "A signature vinegar-based sauce that is regional to the Carolinas. There is some added flare to give that extra flavor that makes this sauce perfect for pulled pork or anything else BBQ.",
    price: 7.0,
    quantity: 100,
    sku: 'JP-SAU-CSV',
    qtyInStock: 100,
    categoryName: 'Sauces',
  },
  {
    name: 'Uu Wee Sauce',
    description:
      "This is the best wing sauce on the planet. It was created for chicken but can also be used to spice up your ribs or any other meat.",
    price: 7.0,
    quantity: 100,
    sku: 'JP-SAU-UWS',
    qtyInStock: 100,
    categoryName: 'Sauces',
  },
  {
    name: 'Geechie Gold Mustard Based Sauce',
    description:
      "Birthed out of the low-country region of South Carolina, this is a signature mustard-based BBQ sauce. Its sweet and tangy flavor goes well with smoked sausage, burgers and pulled pork.",
    price: 7.0,
    quantity: 100,
    sku: 'JP-SAU-GGM',
    qtyInStock: 100,
    categoryName: 'Sauces',
  },
  // Rubs
  {
    name: 'Country Dirt Rub',
    description:
      "This is the magic mixture that is the secret to our amazing ribs and chicken: our delicious Country Dirt Rub balances a bit of sweet (brown sugar) with a little bit of heat (chili and chipotle powder). Sprinkle it on, rub it in, then smoke or bake low and slow. Perfect on pork, of course, but you'll want to try it on fish, chicken and veggies, too! Just think, \"A little dirt won't hurt\".",
    price: 7.0,
    quantity: 100,
    sku: 'JP-RUB-CDR',
    qtyInStock: 100,
    categoryName: 'Rubs',
  },
  {
    name: 'Sassy Cow Rub',
    description:
      "Add a little sass to any beef product; steaks, burgers, beef ribs, as well as vegetables.",
    price: 6.0,
    quantity: 100,
    sku: 'JP-RUB-SCR',
    qtyInStock: 100,
    categoryName: 'Rubs',
  },
  // Fry Mixes
  {
    name: 'Fish Outta Waddah Fry Mix',
    description:
      "Whether it's fresh fish or shrimp, it's the best fry mix bar none.",
    price: 8.0,
    quantity: 100,
    sku: 'JP-FRY-FOW',
    qtyInStock: 100,
    categoryName: 'Fry Mixes',
  },
  // Drinks
  {
    name: 'Sweet Tea - Peach',
    description:
      "The name of this product is \"Sweet Tee\", which is a play on words as a tribute to our beautiful wife. The tagline says, \"When life is just sweet\". This is our peach flavor.",
    price: 4.0,
    quantity: 100,
    sku: 'JP-DRK-STP',
    qtyInStock: 100,
    categoryName: 'Drinks',
  },
  {
    name: 'Sweet Tea - Black',
    description:
      "The name of this product is \"Sweet Tee\", which is a play on words as a tribute to our beautiful wife. The tagline says, \"When life is just sweet\". Black Tea.",
    price: 4.0,
    quantity: 100,
    sku: 'JP-DRK-STB',
    qtyInStock: 100,
    categoryName: 'Drinks',
  },
  // Packages
  {
    name: 'Be-Sauce You Love IT',
    description:
      "Try out all four of our amazing BBQ sauces. 10% Off — includes Backyard Boogie, Carolina Swine Sweat, Uu Wee Sauce, and Geechie Gold Mustard Based Sauce.",
    price: 25.2,
    quantity: 50,
    sku: 'JP-PKG-BSY',
    qtyInStock: 50,
    categoryName: 'Packages',
  },
];

async function seedProducts(): Promise<void> {
  console.log('🛍️   Seeding products...\n');

  // ── Brand ──────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { id: 'brand-jiggling-pig' },
    update: { name: BRAND_NAME },
    create: { id: 'brand-jiggling-pig', name: BRAND_NAME },
  });
  console.log(`  ✅ Brand: ${brand.name}`);

  // ── Parent category ────────────────────────────────────────────────────────
  const parentCat = await prisma.productCategory.upsert({
    where: { id: 'cat-jp-products' },
    update: { name: PARENT_CATEGORY_NAME },
    create: { id: 'cat-jp-products', name: PARENT_CATEGORY_NAME },
  });
  console.log(`  ✅ Parent category: ${parentCat.name}`);

  // ── Sub-categories ─────────────────────────────────────────────────────────
  const subCategoryDefs = [
    { id: 'cat-jp-sauces',   name: 'Sauces' },
    { id: 'cat-jp-rubs',     name: 'Rubs' },
    { id: 'cat-jp-frymixes', name: 'Fry Mixes' },
    { id: 'cat-jp-drinks',   name: 'Drinks' },
    { id: 'cat-jp-packages', name: 'Packages' },
  ];

  const categoryMap: Record<string, string> = {};

  for (const sc of subCategoryDefs) {
    const cat = await prisma.productCategory.upsert({
      where: { id: sc.id },
      update: { name: sc.name, parentCategoryId: parentCat.id },
      create: { id: sc.id, name: sc.name, parentCategoryId: parentCat.id },
    });
    categoryMap[sc.name] = cat.id;
    console.log(`  ✅ Sub-category: ${cat.name}`);
  }

  // ── Products, items, and category maps ────────────────────────────────────
  console.log('');
  let createdProducts = 0;
  let updatedProducts = 0;

  for (const p of productSeeds) {
    const productId = `product-${p.sku.toLowerCase()}`;
    const itemId    = `item-${p.sku.toLowerCase()}`;

    // Product
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    await prisma.product.upsert({
      where: { id: productId },
      update: { name: p.name, description: p.description, price: p.price, quantity: p.quantity },
      create: {
        id: productId,
        name: p.name,
        description: p.description,
        price: p.price,
        quantity: p.quantity,
        brandId: brand.id,
      },
    });

    // ProductItem (SKU)
    await prisma.productItem.upsert({
      where: { sku: p.sku },
      update: { price: p.price, qtyInStock: p.qtyInStock, isPublished: true },
      create: {
        id: itemId,
        productId,
        sku: p.sku,
        price: p.price,
        qtyInStock: p.qtyInStock,
        isPublished: true,
      },
    });

    // ProductCategoryMap — primary sub-category
    const catId = categoryMap[p.categoryName];
    await prisma.productCategoryMap.upsert({
      where: { productId_categoryId: { productId, categoryId: catId } },
      update: { isPrimary: true, displayOrder: 0 },
      create: { productId, categoryId: catId, isPrimary: true, displayOrder: 0 },
    });

    // ProductCategoryMap — parent category
    await prisma.productCategoryMap.upsert({
      where: { productId_categoryId: { productId, categoryId: parentCat.id } },
      update: { isPrimary: false, displayOrder: 1 },
      create: { productId, categoryId: parentCat.id, isPrimary: false, displayOrder: 1 },
    });

    if (existing) {
      updatedProducts++;
      console.log(`  🔄 Updated: [${p.sku}] ${p.name} ($${p.price})`);
    } else {
      createdProducts++;
      console.log(`  ✅ Created: [${p.sku}] ${p.name} ($${p.price})`);
    }
  }

  console.log(`\n🛍️   Products: ${createdProducts} created, ${updatedProducts} updated.`);
}

// ─── Blog seed data ────────────────────────────────────────────────────────────

const blogCategories = [
  { id: 'cat-content-bbq-tips', name: 'BBQ Tips & Techniques', slug: 'bbq-tips-techniques' },
  { id: 'cat-content-sc',       name: 'South Carolina',        slug: 'south-carolina' },
  { id: 'cat-content-equipment',name: 'Equipment',             slug: 'equipment' },
  { id: 'cat-content-drinks',   name: 'Drinks',                slug: 'drinks' },
];

const blogTags = [
  { id: 'tag-rubs',          name: 'Rubs',           slug: 'rubs' },
  { id: 'tag-cooking-tips',  name: 'Cooking Tips',   slug: 'cooking-tips' },
  { id: 'tag-south-carolina',name: 'South Carolina', slug: 'south-carolina' },
  { id: 'tag-drinks',        name: 'Drinks',         slug: 'drinks' },
  { id: 'tag-smoking',       name: 'Smoking',        slug: 'smoking' },
  { id: 'tag-bbq-techniques',name: 'BBQ Techniques', slug: 'bbq-techniques' },
  { id: 'tag-bbq-rig',       name: 'BBQ Rig',        slug: 'bbq-rig' },
  { id: 'tag-equipment',     name: 'Equipment',      slug: 'equipment' },
  { id: 'tag-brisket',       name: 'Brisket',        slug: 'brisket' },
  { id: 'tag-how-to',        name: 'How To',         slug: 'how-to' },
  { id: 'tag-bbq-history',   name: 'BBQ History',    slug: 'bbq-history' },
  { id: 'tag-culture',       name: 'Culture',        slug: 'culture' },
];

interface BlogPostSeed {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  categoryIds: string[];
  tagIds: string[];
}

const blogPosts: BlogPostSeed[] = [
  {
    id: 'post-how-to-use-our-rub',
    title: 'How to Use Our Rub?',
    slug: 'how-to-use-our-rub',
    excerpt: "A 'Rub' or 'Dry Rub' is a mixture of spices (sometimes with herbs) combined to produce a dry rub which you apply to food to enhance and/or spice it up.",
    bodyHtml: [
      '<h2>What is a Rub?</h2>',
      '<p>A &ldquo;Rub&rdquo; or &ldquo;Dry Rub&rdquo; is a mixture of spices (sometimes with herbs) combined to produce a dry rub which you apply to food to enhance and/or spice it up.</p>',
      '<p>HBBQ has its own signature rub (<strong>Country Dirt Rub</strong>) used for ribs, chicken, turkey legs, pulled pork, pork chops and vegetables.</p>',
      '<h2>How to Apply Rubs to Your Food</h2>',
      '<ol>',
      '<li>Pat your meat dry with paper towels before applying the rub.</li>',
      '<li>Apply a thin layer of mustard or oil as a binder (optional).</li>',
      '<li>Generously coat all surfaces of the meat with the dry rub.</li>',
      '<li>Press the rub gently into the meat so it adheres well.</li>',
      '<li>Allow the rub to sit for at least 30 minutes, or overnight in the refrigerator for deeper flavor.</li>',
      '<li>Cook low and slow for best results &mdash; smoke, bake, or grill.</li>',
      '</ol>',
    ].join('\n'),
    categoryIds: ['cat-content-bbq-tips'],
    tagIds: ['tag-rubs', 'tag-cooking-tips'],
  },
  {
    id: 'post-sweet-tea-sc',
    title: 'Sweet Tea (Tee), a South Carolina Tradition',
    slug: 'sweet-tea-tee-a-south-carolina-tradition',
    excerpt: 'The birthplace of sweet tea is Summerville, SC.',
    bodyHtml: [
      '<p>The best two places in the world to enjoy <strong>sweet tea</strong> this summer are: 1. your front porch; and 2. Summerville, South Carolina.</p>',
      '<p><strong>Summerville</strong> is a historic town outside Charleston known fittingly as the &ldquo;Birthplace of Sweet Tea.&rdquo;</p>',
      '<p>Today, visitors can experience the beloved Southern elixir via the town&rsquo;s <strong>Sweet Tea Trail</strong> and pose for photos with &ldquo;Mason,&rdquo; the <strong>World&rsquo;s Largest Sweet Tea</strong> &mdash; 15 feet tall, holding up to 2,524 gallons.</p>',
      '<p>Businesses along the trail offer sweet tea-inspired specials including sweet tea cupcakes, sweet tea cinnamon rolls, sweet tea jelly, a sweet tea pork chop sandwich, and even a sweet tea brined chicken salad.</p>',
    ].join('\n'),
    categoryIds: ['cat-content-sc', 'cat-content-drinks'],
    tagIds: ['tag-south-carolina', 'tag-drinks'],
  },
  {
    id: 'post-wood-for-smoking',
    title: 'What Kind of Wood for Smoking',
    slug: 'what-kind-of-wood-for-smoking',
    excerpt: 'Using wood chips, chunks, dust or pellets to create smoke is a great way to transform sometimes bland barbecued foods into meals that will have your friends and family begging for more.',
    bodyHtml: [
      '<p>Using wood chips, chunks, dust or pellets to create smoke is a great way to transform bland barbecued foods into meals your friends and family will beg for more of. Smoke is used as you would a spice or herb &mdash; to impart flavour.</p>',
      '<h2>What to Consider When Choosing Wood</h2>',
      '<h3>Bark</h3>',
      '<p>Wood with bark will impart a bitter flavor and may contain mold or other contaminants. Always use bark-free wood.</p>',
      '<h3>Origin</h3>',
      '<ul>',
      '<li>Buy woods harvested from <strong>sustainable resources</strong>.</li>',
      '<li>If sourcing off-cuts, ensure the wood has not been treated or contains lubricating oil residue.</li>',
      '<li>If harvesting your own wood, use a <strong>hand saw</strong> &mdash; chainsaw oil can contaminate the wood.</li>',
      '</ul>',
      '<h3>Wood Variety</h3>',
      '<p><strong>Fruit woods are mild; nut woods produce a very strong flavor.</strong> Our personal favorites:</p>',
      '<ul>',
      '<li><strong>Hickory</strong> &mdash; Chicken and Pork shoulders</li>',
      '<li><strong>Apple</strong> &mdash; Ribs</li>',
      '<li><strong>Beech</strong> &mdash; Fish</li>',
      '</ul>',
      '<p>Don&rsquo;t be afraid to mix different wood varieties &mdash; the variety of flavors you can create is mind boggling.</p>',
    ].join('\n'),
    categoryIds: ['cat-content-bbq-tips'],
    tagIds: ['tag-smoking', 'tag-cooking-tips', 'tag-bbq-techniques'],
  },
  {
    id: 'post-big-baby-ii',
    title: 'Big Baby II BBQ Rig',
    slug: 'big-baby-ii-bbq-rig',
    excerpt: 'You may have seen many BBQ rigs in your day; upright smokers, stick burners, pig cookers, various tow-behind rigs, but we assure you that you have never seen a rig like Big Baby II BBQ rig.',
    bodyHtml: [
      '<p>You may have seen many BBQ rigs in your day, but you have never seen a rig like <strong>Big Baby II</strong> &mdash; literally a mobile kitchen with all the bells and whistles of modern technology.</p>',
      '<h2>What Powers Big Baby</h2>',
      '<ul><li>1 &mdash; 12 volt 100ah Battery</li><li>2 &mdash; 2000w Solar Generators</li><li>4 &mdash; 100w flat, flexible solar panels on the roof/awning</li></ul>',
      '<h2>Electric Roof Awning System</h2>',
      '<p>The roof/awning uses pulley systems connected to an electric winch, activated remotely. With a click the roof raises and lowers &mdash; giving that Transformers feel.</p>',
      '<h2>Booming Sound System</h2>',
      '<ul><li>1000 watt Pyle Amp</li><li>18&quot; Bass Speaker, 2 &times; 9&quot; Subs</li><li>Jensen Receiver w/Radio, USB, HDMI and Bluetooth</li><li>46&quot; 12-volt outdoor TV with mobile router</li></ul>',
      '<h2>Sink System (Hot and Cold Water)</h2>',
      '<p>Health code compliant: one hand washing sink and a 3-well sink, routed through a Gasland portable tankless hot water heater.</p>',
      '<h2>On Board Fridge/Freezer &amp; Fryer</h2>',
      '<p>100 QT 12-volt Fridge/Freezer. Large capacity gas fryer, two gas burners, and a flat griddle.</p>',
      '<h2>Monstrous Upright Smoker</h2>',
      '<p>Custom-made, 2&quot; insulated smoker. Cooking capacity: 16 Briskets, 30 Racks of Ribs, 24 Pork Butts, 40 Whole Chickens.</p>',
      '<h2>Monstrous Grill</h2>',
      '<p>Two large cook racks &mdash; cook 100+ hamburgers at once and several hundred hotdogs. Can double as a smoker.</p>',
    ].join('\n'),
    categoryIds: ['cat-content-equipment'],
    tagIds: ['tag-bbq-rig', 'tag-equipment'],
  },
  {
    id: 'post-how-to-smoke-brisket',
    title: 'How to Smoke a Brisket',
    slug: 'how-to-smoke-a-brisket',
    excerpt: 'The step-by-step instructions cover the entire process, from preparing and trimming the brisket to applying a rub and preheating the smoker.',
    bodyHtml: [
      '<h2>How to Smoke a Brisket: A Step-by-Step Guide</h2>',
      '<p>Smoking a brisket is a labor of love that rewards you with tender, flavorful meat perfect for any BBQ gathering.</p>',
      '<h3>Ingredients</h3>',
      '<ul><li>Whole packer brisket (10&ndash;14 lbs)</li><li>Your favorite BBQ rub</li><li>Yellow mustard (optional binder)</li><li>Smoking wood (hickory, oak, or mesquite)</li><li>Apple cider vinegar spritz</li></ul>',
      '<h3>Equipment Needed</h3>',
      '<ul><li>Smoker (offset, pellet, or any type)</li><li>Meat thermometer</li><li>Foil or butcher paper</li><li>Cooler (for resting)</li></ul>',
      '<h3>Step-by-Step Instructions</h3>',
      '<ol>',
      '<li><strong>Prepare the Brisket:</strong> Trim excess fat to about &frac14; inch fat cap. Remove hard fat and silverskin.</li>',
      '<li><strong>Apply the Rub:</strong> Optionally apply mustard as a binder, then generously coat all sides with BBQ rub. Rest at room temperature for 1 hour.</li>',
      '<li><strong>Preheat the Smoker:</strong> Heat to a steady 225&deg;F&ndash;250&deg;F (107&deg;C&ndash;121&deg;C).</li>',
      '<li><strong>Smoke the Brisket:</strong> Place fat-side up on the grill grate. Close lid and smoke undisturbed for several hours.</li>',
      '<li><strong>Spritz for Moisture:</strong> After 3&ndash;4 hours, spritz every hour with apple cider vinegar.</li>',
      '<li><strong>Monitor Temperature:</strong> Target 195&deg;F&ndash;205&deg;F. Expect a stall around 150&deg;F &mdash; be patient!</li>',
      '<li><strong>Wrap the Brisket:</strong> At 165&deg;F (74&deg;C), wrap in foil or butcher paper.</li>',
      '<li><strong>Continue Smoking:</strong> Cook until 195&deg;F&ndash;205&deg;F internal.</li>',
      '<li><strong>Rest the Brisket:</strong> Rest for at least 1 hour in a cooler wrapped in towels.</li>',
      '<li><strong>Slice and Serve:</strong> Slice against the grain into thick slices. Enjoy!</li>',
      '</ol>',
      '<h3>Tips for Success</h3>',
      '<ul><li><strong>Patience is Key:</strong> Plan ahead and give yourself plenty of time.</li><li><strong>Experiment:</strong> Try different rubs and wood types.</li><li><strong>Practice Makes Perfect.</strong></li></ul>',
    ].join('\n'),
    categoryIds: ['cat-content-bbq-tips'],
    tagIds: ['tag-brisket', 'tag-smoking', 'tag-how-to'],
  },
  {
    id: 'post-sc-bbq-history',
    title: 'South Carolina BBQ History - The Birthplace',
    slug: 'south-carolina-bbq-history-the-birthplace',
    excerpt: 'This article delves into the rich and diverse history of barbecue in South Carolina, highlighting its significance as a cornerstone of American culinary culture.',
    bodyHtml: [
      '<p>South Carolina is often celebrated as the birthplace of American barbecue, with a culinary tradition dating back to the 1500s when Spanish explorers introduced pigs to the Americas.</p>',
      '<h2>Key Influences on South Carolina BBQ</h2>',
      '<ul>',
      '<li><strong>Native American Techniques:</strong> Indigenous peoples utilized slow-cooking methods and local ingredients.</li>',
      '<li><strong>African Contributions:</strong> Enslaved Africans brought seasoning techniques and cooking styles.</li>',
      '<li><strong>European Settlers:</strong> Germans introduced mustard-based sauces that became a hallmark of SC barbecue.</li>',
      '</ul>',
      '<h2>The Evolution of BBQ Styles</h2>',
      '<h3>Whole Hog Cooking</h3>',
      '<p>Traditionally, South Carolinians cooked whole hogs, a practice that remains popular today.</p>',
      '<h3>Regional Sauces</h3>',
      '<ul>',
      '<li><strong>Mustard-Based Sauce:</strong> Predominantly found in the Midlands &mdash; tangy and slightly sweet.</li>',
      '<li><strong>Vinegar-Pepper Sauce:</strong> Common in the Pee Dee region &mdash; sharp and spicy.</li>',
      '<li><strong>Tomato-Based Sauces:</strong> Found in the western parts of the state.</li>',
      '<li><strong>Rust Gravy:</strong> A unique blend of ketchup and mustard, popular in certain areas.</li>',
      '</ul>',
      '<h2>Notable BBQ Figures</h2>',
      '<p><strong>Maurice Bessinger</strong> popularized mustard-based sauces through his Piggie Park restaurants. Many family-run barbecue joints continue to thrive today, passed down through generations.</p>',
      '<h2>Conclusion</h2>',
      '<p>South Carolina barbecue is a vibrant tradition reflecting the state&rsquo;s history, culture, and community spirit &mdash; a cherished culinary heritage.</p>',
    ].join('\n'),
    categoryIds: ['cat-content-sc'],
    tagIds: ['tag-south-carolina', 'tag-bbq-history', 'tag-culture'],
  },
];

async function seedBlogPosts(): Promise<void> {
  console.log('📝  Seeding blog posts...\n');

  // ── Look up Jerome Harrison (author) ──────────────────────────────────────
  const author = await prisma.siteUser.findUnique({
    where: { emailAddress: 'jeromeharrison@gmail.com' },
    select: { id: true },
  });
  if (!author) throw new Error('Author jeromeharrison@gmail.com not found — seed users first.');

  // ── Content categories ────────────────────────────────────────────────────
  for (const cat of blogCategories) {
    await prisma.contentCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name, slug: cat.slug },
      create: { id: cat.id, name: cat.name, slug: cat.slug },
    });
    console.log(`  ✅ Category: ${cat.name}`);
  }

  // ── Content tags ──────────────────────────────────────────────────────────
  console.log('');
  for (const tag of blogTags) {
    await prisma.contentTag.upsert({
      where: { id: tag.id },
      update: { name: tag.name, slug: tag.slug },
      create: { id: tag.id, name: tag.name, slug: tag.slug },
    });
    console.log(`  ✅ Tag: ${tag.name}`);
  }

  // ── Blog posts ────────────────────────────────────────────────────────────
  console.log('');
  let createdPosts = 0;
  let updatedPosts = 0;

  for (const p of blogPosts) {
    const existing = await prisma.contentPost.findUnique({ where: { id: p.id } });

    await prisma.contentPost.upsert({
      where: { id: p.id },
      update: {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        bodyHtml: p.bodyHtml,
        status: 'published',
        publishedAt: new Date('2024-11-22'),
      },
      create: {
        id: p.id,
        authorUserId: author.id,
        postType: 'blog',
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        bodyHtml: p.bodyHtml,
        status: 'published',
        publishedAt: new Date('2024-11-22'),
      },
    });

    // Upsert category links
    for (const categoryId of p.categoryIds) {
      await prisma.contentPostCategory.upsert({
        where: { postId_categoryId: { postId: p.id, categoryId } },
        update: {},
        create: { postId: p.id, categoryId },
      });
    }

    // Upsert tag links
    for (const tagId of p.tagIds) {
      await prisma.contentPostTag.upsert({
        where: { postId_tagId: { postId: p.id, tagId } },
        update: {},
        create: { postId: p.id, tagId },
      });
    }

    if (existing) {
      updatedPosts++;
      console.log(`  🔄 Updated: "${p.title}"`);
    } else {
      createdPosts++;
      console.log(`  ✅ Created: "${p.title}"`);
    }
  }

  console.log(`\n📝  Blog posts: ${createdPosts} created, ${updatedPosts} updated.`);
}

// ─── News articles seed data ──────────────────────────────────────────────────

const newsCategories = [
  { id: 'cat-news-announcements', name: 'Announcements',    slug: 'announcements'    },
  { id: 'cat-news-events',        name: 'Events & Pop-Ups', slug: 'events-pop-ups'   },
  { id: 'cat-news-products',      name: 'New Products',     slug: 'new-products'     },
];

const newsTags = [
  { id: 'tag-news-award',       name: 'Award',          slug: 'award'           },
  { id: 'tag-news-truck',       name: 'Truck Schedule', slug: 'truck-schedule'  },
  { id: 'tag-news-online',      name: 'Online Store',   slug: 'online-store'    },
  { id: 'tag-news-new-product', name: 'New Product',    slug: 'new-product'     },
  { id: 'tag-news-community',   name: 'Community',      slug: 'community'       },
];

interface NewsArticleSeed {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  publishedAt: string;
  categoryIds: string[];
  tagIds: string[];
}

const newsArticles: NewsArticleSeed[] = [
  {
    id: 'news-award-2024',
    title: 'The Jiggling Pig Wins the 2024 South Carolina BBQ Sauce Award',
    slug: 'jiggling-pig-wins-2024-sc-bbq-sauce-award',
    publishedAt: '2024-10-15',
    excerpt: 'We\'re thrilled to announce that our Backyard Boogie BBQ Sauce has taken home the top prize at the 2024 South Carolina BBQ Festival competition.',
    bodyHtml: `<p>We are beyond honored to share some incredible news — our <strong>Backyard Boogie BBQ Sauce</strong> has been awarded <em>Best BBQ Sauce</em> at the 2024 South Carolina BBQ Festival held in Columbia, SC.</p>
<p>This award means the world to us. When Jerome Harrison first started crafting this sauce in his backyard, the goal was simple: create something that could stand toe-to-toe with anything you'd find at a restaurant — sweet, tangy, and just the right amount of heat.</p>
<p>Over 30 local and regional BBQ brands competed, and our Backyard Boogie came out on top in the judges' blind tasting. We couldn't be prouder.</p>
<h2>What's Next?</h2>
<p>This recognition is just the beginning. We're working on expanding distribution so more people across the Carolinas — and beyond — can experience the flavor that won the crown. Stay tuned for updates on where to find us next.</p>
<p>Thank you to everyone who has supported The Jiggling Pig from day one. This award belongs to all of you. 🏆🐷</p>`,
    categoryIds: ['cat-news-announcements'],
    tagIds: ['tag-news-award'],
  },
  {
    id: 'news-big-baby-ii-spring-2025',
    title: 'Big Baby II Hits the Road — Spring 2025 Pop-Up Schedule',
    slug: 'big-baby-ii-spring-2025-popup-schedule',
    publishedAt: '2025-02-01',
    excerpt: 'Spring is around the corner and Big Baby II is gearing up for another season of bringing authentic low-and-slow BBQ directly to your neighborhood.',
    bodyHtml: `<p>The wait is over! <strong>Big Baby II</strong>, our custom-built BBQ pit trailer, is officially hitting the road again for the Spring 2025 season.</p>
<p>We'll be rolling through Columbia and surrounding areas starting in March. Here's a preview of where you can catch us:</p>
<ul>
  <li><strong>Five Points (Columbia, SC)</strong> — Every first Saturday of the month, 11am–4pm</li>
  <li><strong>Harbison Area (Columbia, SC)</strong> — Select Fridays, 11am–3pm</li>
  <li><strong>Lexington Town Square</strong> — Monthly pop-ups — watch our social media for exact dates</li>
  <li><strong>Private Events & Catering</strong> — Book us for your spring wedding, graduation party, or corporate event!</li>
</ul>
<p>We'll post live location updates on our website and social media channels so you always know where to find us. Sign up for our <a href="/subscribe">truck schedule alerts</a> and we'll text you when we're in your area.</p>
<p>See you out there! 🔥🐷</p>`,
    categoryIds: ['cat-news-events'],
    tagIds: ['tag-news-truck', 'tag-news-community'],
  },
  {
    id: 'news-sweet-tee-launch',
    title: 'Introducing Sweet Tee — Our Signature Peach & Black Tea is Here!',
    slug: 'introducing-sweet-tee-peach-black-tea',
    publishedAt: '2025-01-10',
    excerpt: 'Jerome\'s wife inspired our newest product. Sweet Tee — available in Peach and Black — is the refreshing companion to any BBQ spread.',
    bodyHtml: `<p>We are so excited to officially introduce <strong>Sweet Tee</strong> — our brand new line of hand-crafted sweet teas, now available in our online store.</p>
<p>Sweet Tee was born from a tribute. Jerome's wife has always made the best sweet tea in the room, and we wanted to bottle that love and share it with the world. The tagline says it all: <em>"When life is just sweet."</em></p>
<h2>Two Flavors, Both Perfect</h2>
<ul>
  <li><strong>Sweet Tea - Peach</strong> — Bright, fruity, and perfectly balanced. Summer in a bottle.</li>
  <li><strong>Sweet Tea - Black</strong> — Classic, bold, and smooth. The everyday staple.</li>
</ul>
<p>At just $4.00 a bottle, Sweet Tee pairs perfectly with our rubs, sauces, and anything fresh off the grill. It's the ultimate BBQ sidekick.</p>
<p><a href="/products">Order yours today →</a></p>`,
    categoryIds: ['cat-news-products'],
    tagIds: ['tag-news-new-product'],
  },
  {
    id: 'news-online-store-launch',
    title: 'Order Your Favorites Online — The Jiggling Pig Store is Live!',
    slug: 'jiggling-pig-online-store-launch',
    publishedAt: '2024-12-01',
    excerpt: 'You no longer have to wait for our truck to come to your neighborhood. Our full product lineup is now available to order online with fast shipping directly to your door.',
    bodyHtml: `<p>Big news, Pig Nation — <strong>The Jiggling Pig online store is officially live!</strong></p>
<p>We've heard you loud and clear: people want our sauces, rubs, and fry mixes shipped directly to them, anywhere in the country. We listened, and we delivered (pun intended 😄).</p>
<h2>What's Available</h2>
<ul>
  <li>All 4 signature <strong>BBQ Sauces</strong> — Backyard Boogie, Carolina Swine Sweat, Uu Wee, Geechie Gold</li>
  <li>Both <strong>Rubs</strong> — Country Dirt Rub &amp; Sassy Cow Rub</li>
  <li><strong>Fish Outta Waddah Fry Mix</strong></li>
  <li><strong>Sweet Tee</strong> (Peach &amp; Black)</li>
  <li>The <strong>Be-Sauce You Love IT Bundle</strong> — all 4 sauces at 10% off</li>
</ul>
<h2>Fast Shipping</h2>
<p>We offer Standard, Expedited, and Overnight shipping. Orders placed before 2pm EST on weekdays ship the same day.</p>
<p>This has been a long time coming and we're so grateful to every customer who has supported us at pop-ups, festivals, and catering events over the years. Now the whole country can taste what South Carolina is all about. 🇺🇸🐷</p>
<p><a href="/products">Shop Now →</a></p>`,
    categoryIds: ['cat-news-announcements', 'cat-news-products'],
    tagIds: ['tag-news-online', 'tag-news-new-product'],
  },
];

async function seedNewsArticles(): Promise<void> {
  console.log('📰  Seeding news articles...\n');

  const author = await prisma.siteUser.findUnique({
    where: { emailAddress: 'jeromeharrison@gmail.com' },
    select: { id: true },
  });
  if (!author) throw new Error('Author not found — seed users first.');

  // ── News categories ────────────────────────────────────────────────────────
  for (const cat of newsCategories) {
    await prisma.contentCategory.upsert({
      where:  { id: cat.id },
      update: { name: cat.name, slug: cat.slug },
      create: { id: cat.id, name: cat.name, slug: cat.slug },
    });
    console.log(`  ✅ Category: ${cat.name}`);
  }

  // ── News tags ──────────────────────────────────────────────────────────────
  console.log('');
  for (const tag of newsTags) {
    await prisma.contentTag.upsert({
      where:  { id: tag.id },
      update: { name: tag.name, slug: tag.slug },
      create: { id: tag.id, name: tag.name, slug: tag.slug },
    });
    console.log(`  ✅ Tag: ${tag.name}`);
  }

  // ── Articles ───────────────────────────────────────────────────────────────
  console.log('');
  let created = 0;
  let updated = 0;

  for (const a of newsArticles) {
    const existing = await prisma.contentPost.findUnique({ where: { id: a.id } });
    await prisma.contentPost.upsert({
      where:  { id: a.id },
      update: { title: a.title, slug: a.slug, excerpt: a.excerpt, bodyHtml: a.bodyHtml },
      create: {
        id: a.id, authorUserId: author.id, postType: 'news',
        title: a.title, slug: a.slug, excerpt: a.excerpt, bodyHtml: a.bodyHtml,
        status: 'published', publishedAt: new Date(a.publishedAt),
      },
    });
    for (const categoryId of a.categoryIds) {
      await prisma.contentPostCategory.upsert({
        where:  { postId_categoryId: { postId: a.id, categoryId } },
        update: {},
        create: { postId: a.id, categoryId },
      });
    }
    for (const tagId of a.tagIds) {
      await prisma.contentPostTag.upsert({
        where:  { postId_tagId: { postId: a.id, tagId } },
        update: {},
        create: { postId: a.id, tagId },
      });
    }
    if (existing) { updated++; console.log(`  🔄 Updated: "${a.title}"`); }
    else          { created++; console.log(`  ✅ Created: "${a.title}"`); }
  }

  console.log(`\n📰  News articles: ${created} created, ${updated} updated.`);
}

// ─── Content pages seed data ─────────────────────────────────────────────────

interface ContentPageSeed {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
}

const contentPages: ContentPageSeed[] = [
  {
    id: 'page-conditions-of-use',
    title: 'Conditions of Use',
    slug: 'conditions-of-use',
    excerpt: 'By accessing or using our Site, you agree to be bound by these Conditions of Use.',
    bodyHtml: [
      '<p><strong>Effective Date: 1/1/2022</strong></p>',
      '<p>Welcome to The Jiggling Pig, LLC website (the &ldquo;Site&rdquo;). By accessing or using our Site, you agree to be bound by these Conditions of Use. If you do not agree to these terms, please do not use our Site.</p>',
      '<h2>1. Acceptance of Terms</h2>',
      '<p>By using our Site, you affirm that you are at least 18 years old or have the consent of a parent or guardian. If you are using the Site on behalf of an organization, you represent that you have the authority to bind that organization to these Conditions of Use.</p>',
      '<h2>2. Changes to Conditions of Use</h2>',
      '<p>The Jiggling Pig, LLC reserves the right to modify these Conditions of Use at any time. We will notify you of any changes by posting the new Conditions of Use on our Site with a new effective date. Your continued use of the Site after any changes constitutes your acceptance of the revised terms.</p>',
      '<h2>3. User Accounts</h2>',
      '<p>If you create an account on our Site, you are responsible for maintaining the confidentiality of your account information, including your password, and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.</p>',
      '<h2>4. Use of the Site</h2>',
      '<p>You agree to use the Site only for lawful purposes and in accordance with these Conditions of Use. You agree not to:</p>',
      '<ul>',
      '<li>Use the Site in any way that violates any applicable federal, state, local, or international law or regulation.</li>',
      '<li>Impersonate or attempt to impersonate The Jiggling Pig, LLC, an employee, another user, or any other person or entity.</li>',
      '<li>Engage in any conduct that restricts or inhibits anyone&rsquo;s use or enjoyment of the Site, or which may harm The Jiggling Pig, LLC or users of the Site or expose them to liability.</li>',
      '</ul>',
      '<h2>5. Intellectual Property Rights</h2>',
      '<p>All content, features, and functionality on the Site, including but not limited to text, graphics, logos, images, and software, are the exclusive property of The Jiggling Pig, LLC or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Site without our prior written consent.</p>',
      '<h2>6. Third-Party Links</h2>',
      '<p>Our Site may contain links to third-party websites or services that are not owned or controlled by The Jiggling Pig, LLC. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. We encourage you to review the terms and conditions and privacy policies of any third-party websites you visit.</p>',
      '<h2>7. Disclaimer of Warranties</h2>',
      '<p>The Site is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. The Jiggling Pig, LLC makes no representations or warranties of any kind, express or implied, regarding the operation of the Site or the information, content, materials, or products included on the Site. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.</p>',
      '<h2>8. Limitation of Liability</h2>',
      '<p>To the fullest extent permitted by law, The Jiggling Pig, LLC shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of (or inability to access or use) the Site; (ii) any conduct or content of any third party on the Site; (iii) any content obtained from the Site; and (iv) unauthorized access, use, or alteration of your transmissions or content.</p>',
      '<h2>9. Governing Law</h2>',
      '<p>These Conditions of Use shall be governed by and construed in accordance with the laws of the State of Maryland, without regard to its conflict of law principles. You agree to submit to the personal jurisdiction of the state and federal courts located therein for the resolution of any disputes.</p>',
      '<h2>10. Mobile Information Sharing</h2>',
      '<h3>Types of Messages</h3>',
      '<ul><li>Promotional</li><li>Informational</li><li>Marketing Content</li></ul>',
      '<h3>Message Frequency</h3>',
      '<p>Messages will be sent during promotions, cart abandonment and notice of purchases. Message and data rates may apply.</p>',
      '<h3>User Instructions</h3>',
      '<p>To opt out of messages: Text <strong>STOP</strong>. For assistance: Text <strong>HELP</strong>.</p>',
      '<h2>11. Contact Us</h2>',
      '<p>If you have any questions or concerns about these Conditions of Use, please contact us at:</p>',
      '<p>The Jiggling Pig, LLC<br>Email: <a href="mailto:info@thejigglingpig.com">info@thejigglingpig.com</a><br>Phone: 1.800.513.1713</p>',
    ].join('\n'),
  },
  {
    id: 'page-privacy-notice',
    title: 'Privacy Policy',
    slug: 'privacy-notice',
    excerpt: 'At The Jiggling Pig, LLC, we value your privacy and are committed to protecting your personal information.',
    bodyHtml: [
      '<p><strong>Effective Date: 1/1/2022</strong></p>',
      '<p>At The Jiggling Pig, LLC, we value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website or engage with our services.</p>',
      '<h2>1. Information We Collect</h2>',
      '<p>We may collect personal information that you provide to us directly when you:</p>',
      '<ul><li>Create an account</li><li>Place an order</li><li>Subscribe to our newsletter</li><li>Contact us for customer support</li><li>Participate in surveys or promotions</li></ul>',
      '<p>The types of information we may collect include: name, email address, phone number, shipping address, payment information (processed securely via third-party payment processors), and any other information you choose to provide.</p>',
      '<h2>2. How We Use Your Information</h2>',
      '<p>The Jiggling Pig, LLC may use your information for various purposes, including:</p>',
      '<ul>',
      '<li>To process and fulfill your orders</li>',
      '<li>To communicate with you about your orders and account</li>',
      '<li>To send you promotional materials and newsletters (you can opt-out at any time)</li>',
      '<li>To improve our website and services</li>',
      '<li>To respond to your inquiries and provide customer support</li>',
      '<li>To comply with legal obligations</li>',
      '</ul>',
      '<h2>3. Sharing Your Information</h2>',
      '<p>We do not sell, trade, or otherwise transfer your personal information to outside parties without your consent, except in the following circumstances:</p>',
      '<ul>',
      '<li>To trusted third-party service providers who assist us in operating our website, conducting our business, or servicing you (e.g., payment processors, shipping companies) under strict confidentiality agreements.</li>',
      '<li>When required by law or to protect our rights, property, or safety.</li>',
      '</ul>',
      '<h2>4. Cookies and Tracking Technologies</h2>',
      '<p>Our website may use cookies and similar tracking technologies to enhance your experience. Cookies are small files placed on your device that help us recognize you and improve our services. You can choose to accept or decline cookies through your browser settings. However, declining cookies may limit your ability to use certain features of our website.</p>',
      '<h2>5. Data Security</h2>',
      '<p>We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.</p>',
      '<h2>6. Your Rights</h2>',
      '<p>You have the right to:</p>',
      '<ul>',
      '<li>Access the personal information we hold about you</li>',
      '<li>Request correction of any inaccurate information</li>',
      '<li>Request deletion of your personal information</li>',
      '<li>Opt-out of marketing communications</li>',
      '</ul>',
      '<p>To exercise any of these rights, please contact us using the information provided below.</p>',
      '<h2>7. Changes to This Privacy Policy</h2>',
      '<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on our website with a new effective date. We encourage you to review this Privacy Policy periodically for any updates.</p>',
      '<h2>8. Contact Us</h2>',
      '<p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>',
      '<p>The Jiggling Pig, LLC<br>Email: <a href="mailto:info@thejigglingpig.com">info@thejigglingpig.com</a><br>Phone: 1.800.513.1700</p>',
    ].join('\n'),
  },
  {
    id: 'page-shipping-returns',
    title: 'Shipping & Returns',
    slug: 'shipping-returns',
    excerpt: 'At The Jiggling Pig, we strive to get your delicious BBQ sauce to you as quickly as possible!',
    bodyHtml: [
      '<h2>Shipping</h2>',
      '<p>At The Jiggling Pig, we strive to get your delicious BBQ sauce to you as quickly as possible! Orders are typically processed within <strong>1&ndash;2 business days</strong>. We ship using reliable carriers, and you can expect delivery within <strong>3&ndash;7 business days</strong>, depending on your location.</p>',
      '<ul>',
      '<li><strong>Shipping Rates:</strong> Shipping costs are calculated at checkout based on the weight of your order and your shipping address.</li>',
      '<li><strong>Order Tracking:</strong> Once your order has shipped, you will receive a confirmation email with tracking information so you can monitor your package&rsquo;s journey.</li>',
      '<li><strong>International Shipping:</strong> Currently, we only ship within the United States.</li>',
      '<li><strong>Local Pickup:</strong> If you&rsquo;re in the area, you can choose to pick up your order at our location to save on shipping costs.</li>',
      '</ul>',
      '<h2>Returns Policy</h2>',
      '<p>At The Jiggling Pig, we want you to be completely satisfied with your purchase. However, due to the nature of our products and for safety and health reasons, <strong>we do not accept returns on food items</strong>.</p>',
      '<ul>',
      '<li><strong>Return Window:</strong> If you receive a damaged or incorrect item, please contact us within <strong>7 days of delivery</strong> to initiate a replacement.</li>',
      '<li><strong>Eligibility:</strong> To be eligible for a replacement, please ensure that the product is unopened and in its original packaging.</li>',
      '<li><strong>How to Report Issues:</strong> Please reach out to our customer service team with your order details and any photos of the issue. We will work quickly to resolve the matter.</li>',
      '<li><strong>Refunds:</strong> Unfortunately, we cannot offer refunds for food items. However, if there is an issue with your order, we will gladly send you a replacement at no additional cost.</li>',
      '</ul>',
      '<p>Thank you for choosing The Jiggling Pig, LLC! We appreciate your business and are here to ensure you have a great experience with our products.</p>',
    ].join('\n'),
  },
  {
    id: 'page-about-us',
    title: 'About Us',
    slug: 'about-us',
    excerpt: 'The Jiggling Pig, LLC (JP) can be described as a mobile BBQ pit service — Southern boys who bring that Carolina flavor BBQ to your back yard.',
    bodyHtml: [
      '<h2>The Jiggling Pig Story</h2>',
      '<p>The Jiggling Pig, LLC (JP) can be described as a mobile BBQ pit service more so than a catering service. Although we may use the word &ldquo;catering&rdquo; here and there to describe services we provide, we really like to think of ourselves as just Southern boys who bring that Carolina flavor BBQ to your back yard.</p>',
      '<p>We believe that the most important element to operating a successful pit service business is to place the most importance on client experience. This requires excellent service, phenomenal BBQ and friendly, accommodating staff.</p>',
      '<p>The Jiggling Pig (JP) serves authentic slow cooked, pit smoked barbecue. We serve only the highest quality beef, pork and poultry. Everything is smoked low and slow, daily, using <strong>hickory, maple and oak wood</strong>. We rub our meats with our dry rub prior to cooking. The result is melt in your mouth, authentic (and slightly addictive) Southern style BBQ.</p>',
      '<p>No sauce required, but feel free to add our homemade sauces to enhance the flavor. We also complement each of our meat selections with a choice of delicious homemade sides which are prepared fresh, in our kitchen, each day.</p>',
      '<h2>&ldquo;BIG BABY&rdquo; &mdash; Customized BBQ Trailer</h2>',
      '<p>When I had my first customized BBQ trailer built, it was of moderate size and my little girl would refer to it affectionately as &ldquo;Big Baby&rdquo;. Thanks to the guys down in North Charleston, SC at <strong>Gorilla Fabrication</strong>, Big Baby II is bigger, badder and ready to &ldquo;smoke up a storm&rdquo;.</p>',
      '<p>Since the core of our business is mobile pit service, you will definitely recognize us if you see us parked roadside, at a local farmer&rsquo;s market and fair.</p>',
    ].join('\n'),
  },
];

async function seedContentPages(): Promise<void> {
  console.log('📄  Seeding content pages...\n');

  // ── Look up Jerome Harrison (author) ──────────────────────────────────────
  const author = await prisma.siteUser.findUnique({
    where: { emailAddress: 'jeromeharrison@gmail.com' },
    select: { id: true },
  });
  if (!author) throw new Error('Author jeromeharrison@gmail.com not found — seed users first.');

  let createdPages = 0;
  let updatedPages = 0;

  for (const p of contentPages) {
    const existing = await prisma.contentPost.findUnique({ where: { id: p.id } });

    await prisma.contentPost.upsert({
      where: { id: p.id },
      update: {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        bodyHtml: p.bodyHtml,
        status: 'published',
        publishedAt: new Date('2022-01-01'),
      },
      create: {
        id: p.id,
        authorUserId: author.id,
        postType: 'page',
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        bodyHtml: p.bodyHtml,
        status: 'published',
        publishedAt: new Date('2022-01-01'),
      },
    });

    if (existing) {
      updatedPages++;
      console.log(`  🔄 Updated: "${p.title}"`);
    } else {
      createdPages++;
      console.log(`  ✅ Created: "${p.title}"`);
    }
  }

  console.log(`\n📄  Content pages: ${createdPages} created, ${updatedPages} updated.`);
}

// ─── Geography ────────────────────────────────────────────────────────────────

async function seedGeography(): Promise<void> {
  console.log('🌍  Seeding geography (countries & addresses)...\n');

  await prisma.country.upsert({
    where:  { id: 'country-us' },
    update: { countryName: 'United States', iso2: 'US' },
    create: { id: 'country-us', countryName: 'United States', iso2: 'US' },
  });
  console.log('  ✅ Country: United States');

  const addresses = [
    { id: 'addr-jp-hq',    addressLine1: '2101 Main St',       city: 'Columbia',     region: 'SC', postalCode: '29201' },
    { id: 'addr-jerome',   addressLine1: '123 Elmwood Ave',    city: 'Columbia',     region: 'SC', postalCode: '29205' },
    { id: 'addr-alex',     addressLine1: '456 Gervais St',     city: 'Columbia',     region: 'SC', postalCode: '29201' },
    { id: 'addr-maria',    addressLine1: '789 Forest Dr',      city: 'Forest Acres', region: 'SC', postalCode: '29206' },
    { id: 'addr-david',    addressLine1: '321 Augusta Hwy',    city: 'Lexington',    region: 'SC', postalCode: '29072' },
    { id: 'addr-loc-fp',   addressLine1: '2001 Devine St',     city: 'Columbia',     region: 'SC', postalCode: '29205' },
    { id: 'addr-loc-harb', addressLine1: '120 Harbison Blvd', city: 'Columbia',     region: 'SC', postalCode: '29212' },
    { id: 'addr-loc-lex',  addressLine1: '5390 Augusta Hwy',  city: 'Lexington',    region: 'SC', postalCode: '29072' },
  ];

  for (const a of addresses) {
    await prisma.address.upsert({
      where:  { id: a.id },
      update: { addressLine1: a.addressLine1, city: a.city, region: a.region, postalCode: a.postalCode },
      create: { ...a, countryId: 'country-us' },
    });
  }
  console.log(`  ✅ Addresses: ${addresses.length} upserted`);
}

// ─── User Contact Prefs & Addresses ──────────────────────────────────────────

async function seedUserData(): Promise<void> {
  console.log('👥  Seeding user contact preferences & addresses...\n');

  const lookup = async (email: string) =>
    prisma.siteUser.findUnique({ where: { emailAddress: email } });

  const jerome = await lookup('jeromeharrison@gmail.com');
  const alex   = await lookup('alex.morgan@example.com');
  const maria  = await lookup('maria.gonzalez@example.com');
  const david  = await lookup('david.okafor@example.com');
  const sam    = await lookup('sam.rivera@example.com');
  const sarah  = await lookup('sarah.whitfield@example.com');

  const prefs = [
    { userId: jerome?.id, optInEmail: true,  optInSms: false, smsPhone: null,            timezone: 'America/New_York' },
    { userId: alex?.id,   optInEmail: true,  optInSms: true,  smsPhone: '+18035550011',  timezone: 'America/New_York' },
    { userId: maria?.id,  optInEmail: true,  optInSms: false, smsPhone: null,            timezone: 'America/New_York' },
    { userId: david?.id,  optInEmail: false, optInSms: true,  smsPhone: '+18035550012',  timezone: 'America/New_York' },
    { userId: sam?.id,    optInEmail: true,  optInSms: true,  smsPhone: '+18035550013',  timezone: 'America/Chicago'  },
    { userId: sarah?.id,  optInEmail: true,  optInSms: false, smsPhone: null,            timezone: 'America/New_York' },
  ];

  for (const p of prefs) {
    if (!p.userId) continue;
    await prisma.userContactPreference.upsert({
      where:  { userId: p.userId },
      update: { optInEmail: p.optInEmail, optInSms: p.optInSms, smsPhone: p.smsPhone, timezone: p.timezone, preferredLanguage: 'en' },
      create: { userId: p.userId, optInEmail: p.optInEmail, optInSms: p.optInSms, smsPhone: p.smsPhone, timezone: p.timezone, preferredLanguage: 'en' },
    });
  }
  console.log(`  ✅ Contact preferences: ${prefs.filter(p => p.userId).length} upserted`);

  const userAddrs = [
    { id: 'ua-jerome', userId: jerome?.id, addressId: 'addr-jerome', label: 'Home',   isDefault: true },
    { id: 'ua-alex',   userId: alex?.id,   addressId: 'addr-alex',   label: 'Home',   isDefault: true },
    { id: 'ua-maria',  userId: maria?.id,  addressId: 'addr-maria',  label: 'Home',   isDefault: true },
    { id: 'ua-david',  userId: david?.id,  addressId: 'addr-david',  label: 'Home',   isDefault: true },
  ];
  for (const ua of userAddrs) {
    if (!ua.userId) continue;
    await prisma.userAddress.upsert({
      where:  { id: ua.id },
      update: { label: ua.label, isDefault: ua.isDefault },
      create: { id: ua.id, userId: ua.userId, addressId: ua.addressId, label: ua.label, isDefault: ua.isDefault },
    });
  }
  console.log(`  ✅ User addresses: ${userAddrs.filter(ua => ua.userId).length} upserted`);
}

// ─── Order Infrastructure ─────────────────────────────────────────────────────

async function seedOrderInfrastructure(): Promise<void> {
  console.log('📦  Seeding order statuses & shipping methods...\n');

  const statuses = ['pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'refunded'];
  for (const status of statuses) {
    await prisma.orderStatus.upsert({ where: { status }, update: {}, create: { status } });
  }
  console.log(`  ✅ Order statuses: ${statuses.length} upserted`);

  const methods = [
    { id: 'ship-standard',  name: 'Standard Shipping (5–7 days)', price: 5.99  },
    { id: 'ship-expedited', name: 'Expedited Shipping (2–3 days)', price: 12.99 },
    { id: 'ship-overnight', name: 'Overnight Shipping',            price: 24.99 },
    { id: 'ship-pickup',    name: 'Local Pickup',                  price: 0.00  },
  ];
  for (const m of methods) {
    await prisma.shippingMethod.upsert({
      where:  { id: m.id },
      update: { name: m.name, price: m.price },
      create: { id: m.id, name: m.name, price: m.price },
    });
  }
  console.log(`  ✅ Shipping methods: ${methods.length} upserted`);
}

// ─── Promotions ───────────────────────────────────────────────────────────────

async function seedPromotions(): Promise<void> {
  console.log('🏷️   Seeding promotions & coupons...\n');

  const promotions = [
    {
      id: 'promo-welcome',
      name: 'Welcome Offer',
      description: '10% off your first order — no minimum',
      promotionType: 'percent',
      discountRate: 0.10,
      minSubtotal: null,
      stackable: false,
    },
    {
      id: 'promo-freeship50',
      name: 'Free Shipping Over $50',
      description: 'Free standard shipping when you spend $50 or more',
      promotionType: 'free_shipping',
      discountRate: null,
      minSubtotal: 50.00,
      stackable: true,
    },
    {
      id: 'promo-sauce-bundle',
      name: 'Sauce Bundle Deal',
      description: '10% off the full 4-sauce bundle',
      promotionType: 'percent',
      discountRate: 0.10,
      minSubtotal: null,
      stackable: false,
    },
  ];

  for (const p of promotions) {
    await prisma.promotion.upsert({
      where:  { id: p.id },
      update: { name: p.name, description: p.description, discountRate: p.discountRate, minSubtotal: p.minSubtotal },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        promotionType: p.promotionType,
        discountRate: p.discountRate,
        minSubtotal: p.minSubtotal,
        stackable: p.stackable,
        isActive: true,
        startDate: new Date('2024-01-01'),
      },
    });
  }
  console.log(`  ✅ Promotions: ${promotions.length} upserted`);

  // Link sauce bundle promo → bundle product
  await prisma.promotionProduct.upsert({
    where:  { promotionId_productId: { promotionId: 'promo-sauce-bundle', productId: 'product-jp-pkg-bsy' } },
    update: {},
    create: { promotionId: 'promo-sauce-bundle', productId: 'product-jp-pkg-bsy' },
  });
  // Also link to each individual sauce
  const sauceSKUs = ['jp-sau-bbq', 'jp-sau-csv', 'jp-sau-uws', 'jp-sau-ggm'];
  for (const sku of sauceSKUs) {
    await prisma.promotionProduct.upsert({
      where:  { promotionId_productId: { promotionId: 'promo-sauce-bundle', productId: `product-${sku}` } },
      update: {},
      create: { promotionId: 'promo-sauce-bundle', productId: `product-${sku}` },
    });
  }
  console.log('  ✅ Promotion→Product links seeded');

  const coupons = [
    { id: 'coupon-welcome10', code: 'WELCOME10',   discountAmount: 0, percentage: 10, usageLimit: 1000, promotionId: 'promo-welcome',      expirationDate: null },
    { id: 'coupon-ship50',    code: 'SHIP50FREE',  discountAmount: 0, percentage: null, usageLimit: null, promotionId: 'promo-freeship50',  expirationDate: null },
    { id: 'coupon-sauce20',   code: 'SAUCE20',     discountAmount: 0, percentage: 20, usageLimit: 500,  promotionId: 'promo-sauce-bundle', expirationDate: new Date('2025-12-31') },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where:  { code: c.code },
      update: { percentage: c.percentage, usageLimit: c.usageLimit, expirationDate: c.expirationDate },
      create: { id: c.id, code: c.code, discountAmount: c.discountAmount, percentage: c.percentage, usageLimit: c.usageLimit, expirationDate: c.expirationDate, promotionId: c.promotionId },
    });
  }
  console.log(`  ✅ Coupons: WELCOME10 · SHIP50FREE · SAUCE20`);
}

// ─── Catering Menus ───────────────────────────────────────────────────────────

async function seedMenus(): Promise<void> {
  console.log('🍖  Seeding catering menu...\n');

  // Menu
  await prisma.menu.upsert({
    where:  { id: 'menu-catering-main' },
    update: { name: 'Jiggling Pig Catering Menu', isActive: true },
    create: { id: 'menu-catering-main', name: 'Jiggling Pig Catering Menu', menuType: 'catering', description: 'Full BBQ catering menu for events, weddings, and corporate gatherings.', isActive: true },
  });

  // Menu Sections
  const sections = [
    { id: 'sec-proteins', name: 'Proteins',  displayOrder: 0 },
    { id: 'sec-sides',    name: 'Sides',     displayOrder: 1 },
    { id: 'sec-packages', name: 'Packages',  displayOrder: 2 },
  ];
  for (const s of sections) {
    await prisma.menuSection.upsert({
      where:  { id: s.id },
      update: { name: s.name, displayOrder: s.displayOrder },
      create: { id: s.id, menuId: 'menu-catering-main', name: s.name, displayOrder: s.displayOrder },
    });
  }

  // Menu Items
  const items = [
    { id: 'mi-pulled-pork',  name: 'Smoked Pulled Pork',    pricingModel: 'per_person', basePrice: 12.00, section: 'sec-proteins', desc: 'Slow-smoked pulled pork, pulled to perfection and seasoned with our signature Country Dirt Rub.' },
    { id: 'mi-baby-ribs',    name: 'Baby Back Ribs',        pricingModel: 'tray',       basePrice: 65.00, section: 'sec-proteins', desc: 'Fall-off-the-bone baby back ribs, smoked low and slow. Full tray feeds 10–12.' },
    { id: 'mi-smoked-chx',   name: 'Smoked Chicken',        pricingModel: 'per_person', basePrice: 10.00, section: 'sec-proteins', desc: 'Whole smoked chicken halves seasoned with our Country Dirt Rub.' },
    { id: 'mi-brisket',      name: 'Smoked Brisket',        pricingModel: 'market',     basePrice: null,  section: 'sec-proteins', desc: 'USDA Choice brisket smoked for 12+ hours. Market price — call for quote.' },
    { id: 'mi-mac-cheese',   name: 'Mac & Cheese',          pricingModel: 'tray',       basePrice: 35.00, section: 'sec-sides',    desc: 'Creamy Southern-style mac & cheese. Full tray feeds 15–20.' },
    { id: 'mi-baked-beans',  name: 'Baked Beans',           pricingModel: 'tray',       basePrice: 30.00, section: 'sec-sides',    desc: 'Smoky baked beans with pulled pork bits. Full tray feeds 15–20.' },
    { id: 'mi-coleslaw',     name: 'Coleslaw',              pricingModel: 'tray',       basePrice: 25.00, section: 'sec-sides',    desc: 'Classic creamy coleslaw. Full tray feeds 20+.' },
    { id: 'mi-potato-salad', name: 'Potato Salad',          pricingModel: 'tray',       basePrice: 25.00, section: 'sec-sides',    desc: 'Southern-style potato salad. Full tray feeds 20+.' },
    { id: 'mi-basic-pkg',    name: 'Basic Catering Package', pricingModel: 'per_person', basePrice: 22.00, section: 'sec-packages', desc: 'Includes 1 protein (pulled pork or chicken) + 2 sides. Minimum 25 guests.' },
    { id: 'mi-premium-pkg',  name: 'Premium BBQ Package',   pricingModel: 'per_person', basePrice: 35.00, section: 'sec-packages', desc: 'Includes 2 proteins + 3 sides + cornbread + 2 sauces per table. Minimum 25 guests.' },
  ];

  for (const item of items) {
    await prisma.menuItem.upsert({
      where:  { id: item.id },
      update: { name: item.name, pricingModel: item.pricingModel, basePrice: item.basePrice, description: item.desc },
      create: { id: item.id, name: item.name, description: item.desc, pricingModel: item.pricingModel, basePrice: item.basePrice, isActive: true },
    });
    await prisma.menuSectionItem.upsert({
      where:  { menuSectionId_menuItemId: { menuSectionId: item.section, menuItemId: item.id } },
      update: {},
      create: { menuSectionId: item.section, menuItemId: item.id, displayOrder: items.indexOf(item) },
    });
  }
  console.log(`  ✅ Menu items: ${items.length} upserted and linked to sections`);

  // Sauce add-on option group on the Premium Package
  await prisma.menuOptionGroup.upsert({
    where:  { id: 'mog-sauce-addon' },
    update: { name: 'Sauce Selection', minSelect: 1, maxSelect: 2 },
    create: { id: 'mog-sauce-addon', menuItemId: 'mi-premium-pkg', name: 'Sauce Selection', minSelect: 1, maxSelect: 2, isRequired: true, displayOrder: 0 },
  });
  const sauceOptions = [
    { id: 'mo-bbq-sauce',  name: 'Backyard Boogie BBQ Sauce',      priceDelta: 0 },
    { id: 'mo-carolina',   name: 'Carolina Swine Sweat',           priceDelta: 0 },
    { id: 'mo-uu-wee',     name: 'Uu Wee Sauce',                   priceDelta: 0 },
    { id: 'mo-geechie',    name: 'Geechie Gold Mustard Based Sauce', priceDelta: 0 },
  ];
  for (const [i, opt] of sauceOptions.entries()) {
    await prisma.menuOption.upsert({
      where:  { id: opt.id },
      update: { name: opt.name, priceDelta: opt.priceDelta },
      create: { id: opt.id, optionGroupId: 'mog-sauce-addon', name: opt.name, priceDelta: opt.priceDelta, isActive: true, displayOrder: i },
    });
  }
  console.log('  ✅ Menu option group: Sauce Selection (4 options)');

  // Map sauce products → premium package menu item
  const sauceProductMap = [
    { productId: 'product-jp-sau-bbq', itemId: 'item-jp-sau-bbq' },
    { productId: 'product-jp-sau-csv', itemId: 'item-jp-sau-csv' },
    { productId: 'product-jp-sau-uws', itemId: 'item-jp-sau-uws' },
    { productId: 'product-jp-sau-ggm', itemId: 'item-jp-sau-ggm' },
  ];
  for (const m of sauceProductMap) {
    await prisma.menuItemProductMap.upsert({
      where:  { menuItemId_productItemId: { menuItemId: 'mi-premium-pkg', productItemId: m.itemId } },
      update: {},
      create: { menuItemId: 'mi-premium-pkg', productId: m.productId, productItemId: m.itemId, isPrimary: false },
    });
  }
  console.log('  ✅ MenuItemProductMap: sauce products linked to premium package');
}

// ─── Locations, Events & Truck ────────────────────────────────────────────────

async function seedLocations(): Promise<void> {
  console.log('📍  Seeding locations, schedule events & truck presence...\n');

  const locations = [
    { id: 'loc-hq',        name: 'The Jiggling Pig HQ',    addressId: 'addr-jp-hq',    lat: 34.0007,  lng: -81.0348, notes: 'Home base and commissary kitchen' },
    { id: 'loc-five-pts',  name: 'Five Points',            addressId: 'addr-loc-fp',   lat: 33.9985,  lng: -81.0134, notes: 'Popular weekly truck stop in the Five Points entertainment district' },
    { id: 'loc-harbison',  name: 'Harbison',               addressId: 'addr-loc-harb', lat: 34.0620,  lng: -81.1620, notes: 'Harbison shopping corridor stop' },
    { id: 'loc-lexington', name: 'Lexington',              addressId: 'addr-loc-lex',  lat: 33.9842,  lng: -81.2368, notes: 'Lexington town truck stop' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where:  { id: loc.id },
      update: { name: loc.name, lat: loc.lat, lng: loc.lng, notes: loc.notes },
      create: { id: loc.id, name: loc.name, addressId: loc.addressId, lat: loc.lat, lng: loc.lng, notes: loc.notes, isActive: true },
    });
  }
  console.log(`  ✅ Locations: ${locations.length} upserted`);

  const now = new Date();
  const past  = (daysAgo: number, hour = 11) => new Date(now.getTime() - daysAgo * 864e5 + hour * 36e5);
  const future = (daysAhead: number, hour = 11) => new Date(now.getTime() + daysAhead * 864e5 + hour * 36e5);

  const events = [
    {
      id: 'evt-five-pts-1',
      locationId: 'loc-five-pts',
      menuId: 'menu-catering-main',
      title: 'Five Points Friday Truck Stop',
      eventType: 'truck_stop',
      status: 'completed',
      startTime: past(14),
      endTime:   past(14, 15),
      description: 'Weekly truck stop at Five Points. Full BBQ menu available.',
    },
    {
      id: 'evt-harbison-1',
      locationId: 'loc-harbison',
      menuId: null,
      title: 'Harbison Saturday Truck Stop',
      eventType: 'truck_stop',
      status: 'completed',
      startTime: past(7, 10),
      endTime:   past(7, 14),
      description: 'Harbison area BBQ stop. Selling ribs, pulled pork, and all sauces.',
    },
    {
      id: 'evt-lexington-1',
      locationId: 'loc-lexington',
      menuId: null,
      title: 'Lexington Friday Truck Stop',
      eventType: 'truck_stop',
      status: 'scheduled',
      startTime: future(7),
      endTime:   future(7, 15),
      description: 'Come find Big Baby II in Lexington! Pulled pork, ribs, and all the fixings.',
    },
    {
      id: 'evt-catering-wedding-1',
      locationId: 'loc-hq',
      menuId: 'menu-catering-main',
      title: 'Harrison–Boyd Wedding Catering',
      eventType: 'catering',
      status: 'completed',
      startTime: past(21, 17),
      endTime:   past(21, 21),
      description: 'Private catering event — 120 guests. Full premium BBQ package.',
    },
  ];

  for (const evt of events) {
    await prisma.scheduleEvent.upsert({
      where:  { id: evt.id },
      update: { title: evt.title, status: evt.status, startTime: evt.startTime, endTime: evt.endTime },
      create: { id: evt.id, locationId: evt.locationId, menuId: evt.menuId, title: evt.title, eventType: evt.eventType, status: evt.status, startTime: evt.startTime, endTime: evt.endTime, description: evt.description, isPublic: true },
    });
  }
  console.log(`  ✅ Schedule events: ${events.length} upserted`);

  await prisma.truckPresence.upsert({
    where:  { id: 'truck-big-baby-ii' },
    update: { name: 'Big Baby II', isActive: true },
    create: { id: 'truck-big-baby-ii', name: 'Big Baby II', isActive: true },
  });
  console.log('  ✅ TruckPresence: Big Baby II');
}

// ─── Subscribers ──────────────────────────────────────────────────────────────

async function seedSubscribers(): Promise<void> {
  console.log('📧  Seeding subscribers & notification prefs...\n');

  const u = async (email: string) =>
    prisma.siteUser.findUnique({ where: { emailAddress: email } });

  const jerome = await u('jeromeharrison@gmail.com');
  const alex   = await u('alex.morgan@example.com');
  const maria  = await u('maria.gonzalez@example.com');
  const sam    = await u('sam.rivera@example.com');

  const subs = [
    { id: 'sub-jerome', userId: jerome?.id, email: 'jeromeharrison@gmail.com', optInEmail: true,  optInSms: false },
    { id: 'sub-alex',   userId: alex?.id,   email: 'alex.morgan@example.com',  optInEmail: true,  optInSms: true  },
    { id: 'sub-maria',  userId: maria?.id,  email: 'maria.gonzalez@example.com', optInEmail: true, optInSms: false },
    { id: 'sub-sam',    userId: sam?.id,    email: 'sam.rivera@example.com',   optInEmail: true,  optInSms: true  },
    { id: 'sub-anon1',  userId: null,       email: 'bbqfan@hotmail.com',       optInEmail: true,  optInSms: false },
  ];

  for (const s of subs) {
    await prisma.subscriber.upsert({
      where:  { id: s.id },
      update: { optInEmail: s.optInEmail, optInSms: s.optInSms },
      create: { id: s.id, userId: s.userId, email: s.email, optInEmail: s.optInEmail, optInSms: s.optInSms, confirmedAt: new Date() },
    });
  }
  console.log(`  ✅ Subscribers: ${subs.length} upserted`);

  const subscriptions = [
    { id: 'ss-jerome-sales', subscriberId: 'sub-jerome', subscriptionType: 'sales',         locationId: null,          radiusMiles: null },
    { id: 'ss-jerome-truck', subscriberId: 'sub-jerome', subscriptionType: 'truck_schedule', locationId: 'loc-five-pts', radiusMiles: 10 },
    { id: 'ss-alex-sales',   subscriberId: 'sub-alex',   subscriptionType: 'sales',          locationId: null,          radiusMiles: null },
    { id: 'ss-alex-truck',   subscriberId: 'sub-alex',   subscriptionType: 'truck_schedule', locationId: 'loc-harbison', radiusMiles: 15 },
    { id: 'ss-alex-menu',    subscriberId: 'sub-alex',   subscriptionType: 'menu_updates',   locationId: null,          radiusMiles: null },
    { id: 'ss-maria-sales',  subscriberId: 'sub-maria',  subscriptionType: 'sales',          locationId: null,          radiusMiles: null },
    { id: 'ss-sam-truck',    subscriberId: 'sub-sam',    subscriptionType: 'truck_schedule', locationId: 'loc-lexington', radiusMiles: 20 },
    { id: 'ss-sam-news',     subscriberId: 'sub-sam',    subscriptionType: 'news',           locationId: null,          radiusMiles: null },
    { id: 'ss-anon1-sales',  subscriberId: 'sub-anon1',  subscriptionType: 'sales',          locationId: null,          radiusMiles: null },
    { id: 'ss-anon1-news',   subscriberId: 'sub-anon1',  subscriptionType: 'news',           locationId: null,          radiusMiles: null },
  ];

  for (const ss of subscriptions) {
    await prisma.subscriberSubscription.upsert({
      where:  { id: ss.id },
      update: { isEnabled: true },
      create: { id: ss.id, subscriberId: ss.subscriberId, subscriptionType: ss.subscriptionType, locationId: ss.locationId, radiusMiles: ss.radiusMiles, isEnabled: true },
    });
  }
  console.log(`  ✅ Subscriber subscriptions: ${subscriptions.length} upserted`);

  // Notification subscriptions for key users
  const notifSubs = [
    { id: 'ns-jerome-order-email', userId: jerome?.id, channel: 'email', eventType: 'order.placed'  },
    { id: 'ns-jerome-order-inapp', userId: jerome?.id, channel: 'inapp', eventType: 'order.placed'  },
    { id: 'ns-jerome-ship-inapp',  userId: jerome?.id, channel: 'inapp', eventType: 'order.shipped' },
    { id: 'ns-alex-order-email',   userId: alex?.id,   channel: 'email', eventType: 'order.placed'  },
    { id: 'ns-alex-promo-email',   userId: alex?.id,   channel: 'email', eventType: 'promo.new'     },
    { id: 'ns-maria-order-email',  userId: maria?.id,  channel: 'email', eventType: 'order.placed'  },
  ];

  for (const ns of notifSubs) {
    if (!ns.userId) continue;
    await prisma.notificationSubscription.upsert({
      where:  { id: ns.id },
      update: { isEnabled: true },
      create: { id: ns.id, userId: ns.userId, channel: ns.channel, eventType: ns.eventType, isEnabled: true },
    });
  }
  console.log(`  ✅ Notification subscriptions: ${notifSubs.filter(n => n.userId).length} upserted`);
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

async function seedRecipes(): Promise<void> {
  console.log('📖  Seeding internal recipes...\n');

  const recipes = [
    {
      id: 'recipe-country-dirt-rub',
      name: 'Country Dirt Rub',
      description: 'Our signature rub for ribs and chicken. Brown sugar sweetness balanced with chili and chipotle heat. "A little dirt won\'t hurt."',
      ingredients: [
        { ingredientName: 'Brown Sugar',        quantity: 0.25, unit: 'cup'  },
        { ingredientName: 'Smoked Paprika',     quantity: 2,    unit: 'tbsp' },
        { ingredientName: 'Chili Powder',       quantity: 1,    unit: 'tbsp' },
        { ingredientName: 'Chipotle Powder',    quantity: 1,    unit: 'tsp'  },
        { ingredientName: 'Garlic Powder',      quantity: 1,    unit: 'tbsp' },
        { ingredientName: 'Onion Powder',       quantity: 1,    unit: 'tbsp' },
        { ingredientName: 'Kosher Salt',        quantity: 2,    unit: 'tsp'  },
        { ingredientName: 'Black Pepper',       quantity: 1,    unit: 'tsp'  },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Combine all dry ingredients in a large bowl and whisk thoroughly until evenly blended.' },
        { stepNumber: 2, instruction: 'Apply generously to ribs, chicken, or pork shoulder 30–60 minutes before cooking.' },
        { stepNumber: 3, instruction: 'Cook low and slow at 225°F–250°F. Apply a light second coat at the halfway mark for a deeper bark.' },
      ],
      notes: ['Store in an airtight container away from light and heat. Shelf life: 6 months.'],
    },
    {
      id: 'recipe-backyard-boogie-sauce',
      name: 'Backyard Boogie BBQ Sauce',
      description: 'Award-winning signature sauce — sweet, tangy, with just the right amount of heat.',
      ingredients: [
        { ingredientName: 'Ketchup',              quantity: 2,    unit: 'cup'  },
        { ingredientName: 'Apple Cider Vinegar',  quantity: 0.5,  unit: 'cup'  },
        { ingredientName: 'Brown Sugar',          quantity: 0.25, unit: 'cup'  },
        { ingredientName: 'Worcestershire Sauce', quantity: 2,    unit: 'tbsp' },
        { ingredientName: 'Smoked Paprika',       quantity: 1,    unit: 'tbsp' },
        { ingredientName: 'Cayenne Pepper',       quantity: 0.5,  unit: 'tsp'  },
        { ingredientName: 'Garlic Powder',        quantity: 1,    unit: 'tsp'  },
        { ingredientName: 'Salt',                 quantity: 1,    unit: 'tsp'  },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Combine ketchup, vinegar, brown sugar, and Worcestershire sauce in a medium saucepan over medium heat.' },
        { stepNumber: 2, instruction: 'Add paprika, cayenne, garlic powder, and salt. Stir to combine.' },
        { stepNumber: 3, instruction: 'Bring to a gentle simmer, reduce heat to low, and cook for 20 minutes, stirring occasionally.' },
        { stepNumber: 4, instruction: 'Allow to cool before bottling. Refrigerate after opening. Shelf life: 4 weeks refrigerated.' },
      ],
      notes: ['For extra smokiness, add 1 tsp liquid smoke. For more heat, double the cayenne.'],
    },
    {
      id: 'recipe-sassy-cow-rub',
      name: 'Sassy Cow Rub',
      description: 'Built for beef — steaks, burgers, beef ribs, and vegetables.',
      ingredients: [
        { ingredientName: 'Coarse Sea Salt',    quantity: 2,   unit: 'tbsp' },
        { ingredientName: 'Coarse Black Pepper', quantity: 2,  unit: 'tbsp' },
        { ingredientName: 'Garlic Powder',      quantity: 1,   unit: 'tbsp' },
        { ingredientName: 'Onion Powder',       quantity: 1,   unit: 'tbsp' },
        { ingredientName: 'Dried Rosemary',     quantity: 1,   unit: 'tsp'  },
        { ingredientName: 'Red Pepper Flakes',  quantity: 0.5, unit: 'tsp'  },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Mix all ingredients until evenly combined. Pulse in a spice grinder once or twice for a finer texture if desired.' },
        { stepNumber: 2, instruction: 'Pat beef dry with paper towels, then apply rub liberally on all sides, pressing gently to adhere.' },
        { stepNumber: 3, instruction: 'Let seasoned meat rest at room temperature for 30 minutes before grilling or smoking.' },
      ],
      notes: [] as string[],
    },
  ];

  for (const r of recipes) {
    await prisma.recipe.upsert({
      where:  { id: r.id },
      update: { name: r.name, description: r.description },
      create: { id: r.id, name: r.name, description: r.description, isActive: true },
    });
    // Delete and recreate child records for idempotency
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: r.id } });
    await prisma.recipeStep.deleteMany({ where: { recipeId: r.id } });
    await prisma.recipeNote.deleteMany({ where: { recipeId: r.id } });
    for (const [i, ing] of r.ingredients.entries()) {
      await prisma.recipeIngredient.create({ data: { recipeId: r.id, ingredientName: ing.ingredientName, quantity: ing.quantity, unit: ing.unit, sortOrder: i } });
    }
    for (const step of r.steps) {
      await prisma.recipeStep.create({ data: { recipeId: r.id, stepNumber: step.stepNumber, instruction: step.instruction } });
    }
    for (const note of r.notes) {
      await prisma.recipeNote.create({ data: { recipeId: r.id, note } });
    }
    console.log(`  ✅ Recipe: "${r.name}" (${r.ingredients.length} ingredients, ${r.steps.length} steps)`);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function seedDashboard(): Promise<void> {
  console.log('📊  Seeding admin dashboard...\n');

  const jerome = await prisma.siteUser.findUnique({ where: { emailAddress: 'jeromeharrison@gmail.com' } });

  await prisma.dashboard.upsert({
    where:  { id: 'dash-store-overview' },
    update: { name: 'Store Overview', isDefault: true, isActive: true },
    create: { id: 'dash-store-overview', name: 'Store Overview', scope: 'STORE', ownerUserId: jerome?.id ?? null, isDefault: true, isActive: true },
  });

  const widgets = [
    { id: 'wgt-revenue-kpi',   title: 'Total Revenue',    type: 'KPI'        as const, x: 0, y: 0, w: 3, h: 2, metricKey: 'gross_sales',      source: 'LIVE'  as const },
    { id: 'wgt-orders-kpi',    title: 'Total Orders',     type: 'KPI'        as const, x: 3, y: 0, w: 3, h: 2, metricKey: 'orders_count',     source: 'LIVE'  as const },
    { id: 'wgt-customers-kpi', title: 'New Customers',    type: 'KPI'        as const, x: 6, y: 0, w: 3, h: 2, metricKey: 'new_customers',    source: 'LIVE'  as const },
    { id: 'wgt-revenue-trend', title: 'Revenue Trend',    type: 'TIMESERIES' as const, x: 0, y: 2, w: 8, h: 3, metricKey: 'gross_sales',      source: 'DAILY' as const },
    { id: 'wgt-orders-pie',    title: 'Orders by Status', type: 'PIE'        as const, x: 8, y: 2, w: 4, h: 3, metricKey: 'orders_by_status', source: 'LIVE'  as const },
  ];

  for (const w of widgets) {
    await prisma.dashboardWidget.upsert({
      where:  { id: w.id },
      update: { title: w.title, type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, metricKey: w.metricKey, source: w.source },
      create: { id: w.id, dashboardId: 'dash-store-overview', title: w.title, type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, metricKey: w.metricKey, source: w.source, configJson: {} },
    });
  }
  console.log(`  ✅ Dashboard: "Store Overview" + ${widgets.length} widgets`);
}

// ─── Sample Orders ────────────────────────────────────────────────────────────

async function seedSampleOrders(): Promise<void> {
  console.log('🛒  Seeding sample orders...\n');

  // Build a status-name → id lookup
  const allStatuses = await prisma.orderStatus.findMany();
  const S: Record<string, string> = Object.fromEntries(allStatuses.map(s => [s.status, s.id]));

  // User ID lookups
  const gu = async (email: string) =>
    (await prisma.siteUser.findUnique({ where: { emailAddress: email } }))?.id;
  const jerome = await gu('jeromeharrison@gmail.com');
  const alex   = await gu('alex.morgan@example.com');
  const maria  = await gu('maria.gonzalez@example.com');
  const david  = await gu('david.okafor@example.com');
  const sam    = await gu('sam.rivera@example.com');

  const past = (d: number) => new Date(Date.now() - d * 86_400_000);

  type Line = { id: string; itemId: string; qty: number; price: number; sku: string; name: string };
  type Addr = { id: string; fullName: string; addr1: string; city: string; region: string; zip: string };
  type Pay  = { id: string; amount: number; status: string; txnId: string; capturedAt?: Date };
  type Hist = { id: string; oldStatus?: string; newStatus: string; changedAt: Date };
  type Ship = { id: string; carrier?: string; tracking?: string; status: string; shippedAt?: Date; deliveredAt?: Date; lineIds: string[] };
  type Rev  = { id: string; productId: string; lineId: string; rating: number; comment: string };
  type Order = {
    id: string; userId: string | undefined; date: Date; statusId: string; shipMethodId?: string;
    sub: number; disc: number; tax: number; ship: number; total: number;
    lines: Line[]; addrShip: Addr;
    pay: Pay | null; history: Hist[];
    shipment: Ship | null; reviews: Rev[];
  };

  const orders: Order[] = [
    {
      id: 'order-jerome-001', userId: jerome, date: past(30), statusId: S['delivered'], shipMethodId: 'ship-standard',
      sub: 15.00, disc: 0, tax: 0.90, ship: 5.99, total: 21.89,
      lines: [
        { id: 'ol-jerome-001-bbq', itemId: 'item-jp-sau-bbq', qty: 1, price: 8.00, sku: 'JP-SAU-BBQ', name: 'Backyard Boogie BBQ Sauce' },
        { id: 'ol-jerome-001-csv', itemId: 'item-jp-sau-csv', qty: 1, price: 7.00, sku: 'JP-SAU-CSV', name: 'Carolina Swine Sweat'      },
      ],
      addrShip: { id: 'oa-jerome-001-s', fullName: 'Jerome Harrison', addr1: '123 Elmwood Ave', city: 'Columbia',     region: 'SC', zip: '29205' },
      pay:      { id: 'pay-jerome-001', amount: 21.89, status: 'captured', txnId: 'pi_test_jerome001', capturedAt: past(30) },
      history: [
        { id: 'osh-jerome-001-1', newStatus: 'pending',   changedAt: past(30) },
        { id: 'osh-jerome-001-2', oldStatus: 'pending',   newStatus: 'shipped',    changedAt: past(27) },
        { id: 'osh-jerome-001-3', oldStatus: 'shipped',   newStatus: 'delivered',  changedAt: past(25) },
      ],
      shipment: { id: 'ship-jerome-001', carrier: 'USPS', tracking: '9400111899001', status: 'delivered', shippedAt: past(27), deliveredAt: past(25), lineIds: ['ol-jerome-001-bbq', 'ol-jerome-001-csv'] },
      reviews: [
        { id: 'rev-jerome-001-bbq', productId: 'product-jp-sau-bbq', lineId: 'ol-jerome-001-bbq', rating: 5, comment: 'Incredible sauce! Sweet, tangy, just the right heat. Will order again.' },
        { id: 'rev-jerome-001-csv', productId: 'product-jp-sau-csv', lineId: 'ol-jerome-001-csv', rating: 5, comment: 'Best Carolina vinegar sauce I\'ve had. Perfect on pulled pork.'       },
      ],
    },
    {
      id: 'order-alex-001', userId: alex, date: past(20), statusId: S['delivered'], shipMethodId: 'ship-standard',
      sub: 14.00, disc: 0, tax: 0.84, ship: 5.99, total: 20.83,
      lines: [
        { id: 'ol-alex-001-cdr', itemId: 'item-jp-rub-cdr', qty: 1, price: 7.00, sku: 'JP-RUB-CDR', name: 'Country Dirt Rub' },
        { id: 'ol-alex-001-uws', itemId: 'item-jp-sau-uws', qty: 1, price: 7.00, sku: 'JP-SAU-UWS', name: 'Uu Wee Sauce'     },
      ],
      addrShip: { id: 'oa-alex-001-s', fullName: 'Alex Morgan', addr1: '456 Gervais St', city: 'Columbia', region: 'SC', zip: '29201' },
      pay:      { id: 'pay-alex-001', amount: 20.83, status: 'captured', txnId: 'pi_test_alex001', capturedAt: past(20) },
      history: [
        { id: 'osh-alex-001-1', newStatus: 'pending',   changedAt: past(20) },
        { id: 'osh-alex-001-2', oldStatus: 'pending',   newStatus: 'shipped',   changedAt: past(17) },
        { id: 'osh-alex-001-3', oldStatus: 'shipped',   newStatus: 'delivered', changedAt: past(15) },
      ],
      shipment: { id: 'ship-alex-001', carrier: 'UPS', tracking: '1Z999AA10123456784', status: 'delivered', shippedAt: past(17), deliveredAt: past(15), lineIds: ['ol-alex-001-cdr', 'ol-alex-001-uws'] },
      reviews: [
        { id: 'rev-alex-001-cdr', productId: 'product-jp-rub-cdr', lineId: 'ol-alex-001-cdr', rating: 5, comment: 'This rub is unreal on ribs. The chipotle heat is perfect.' },
      ],
    },
    {
      id: 'order-maria-001', userId: maria, date: past(10), statusId: S['processing'], shipMethodId: 'ship-standard',
      sub: 25.20, disc: 0, tax: 1.51, ship: 5.99, total: 32.70,
      lines: [
        { id: 'ol-maria-001-pkg', itemId: 'item-jp-pkg-bsy', qty: 1, price: 25.20, sku: 'JP-PKG-BSY', name: 'Be-Sauce You Love IT' },
      ],
      addrShip: { id: 'oa-maria-001-s', fullName: 'Maria Gonzalez', addr1: '789 Forest Dr', city: 'Forest Acres', region: 'SC', zip: '29206' },
      pay:      { id: 'pay-maria-001', amount: 32.70, status: 'captured', txnId: 'pi_test_maria001', capturedAt: past(10) },
      history: [
        { id: 'osh-maria-001-1', newStatus: 'pending',    changedAt: past(10) },
        { id: 'osh-maria-001-2', oldStatus: 'pending',    newStatus: 'confirmed',  changedAt: past(9) },
        { id: 'osh-maria-001-3', oldStatus: 'confirmed',  newStatus: 'processing', changedAt: past(8) },
      ],
      shipment: null, reviews: [],
    },
    {
      id: 'order-david-001', userId: david, date: past(3), statusId: S['pending'], shipMethodId: 'ship-standard',
      sub: 8.00, disc: 0, tax: 0.48, ship: 5.99, total: 14.47,
      lines: [
        { id: 'ol-david-001-stp', itemId: 'item-jp-drk-stp', qty: 1, price: 4.00, sku: 'JP-DRK-STP', name: 'Sweet Tea - Peach' },
        { id: 'ol-david-001-stb', itemId: 'item-jp-drk-stb', qty: 1, price: 4.00, sku: 'JP-DRK-STB', name: 'Sweet Tea - Black' },
      ],
      addrShip: { id: 'oa-david-001-s', fullName: 'David Okafor', addr1: '321 Augusta Hwy', city: 'Lexington', region: 'SC', zip: '29072' },
      pay:      { id: 'pay-david-001', amount: 14.47, status: 'authorized', txnId: 'pi_test_david001', capturedAt: undefined },
      history: [{ id: 'osh-david-001-1', newStatus: 'pending', changedAt: past(3) }],
      shipment: null, reviews: [],
    },
    {
      id: 'order-sam-001', userId: sam, date: past(7), statusId: S['shipped'], shipMethodId: 'ship-expedited',
      sub: 15.00, disc: 0, tax: 0.90, ship: 12.99, total: 28.89,
      lines: [
        { id: 'ol-sam-001-scr', itemId: 'item-jp-rub-scr', qty: 1, price: 7.00, sku: 'JP-RUB-SCR', name: 'Sassy Cow Rub'            },
        { id: 'ol-sam-001-fow', itemId: 'item-jp-fry-fow', qty: 1, price: 8.00, sku: 'JP-FRY-FOW', name: 'Fish Outta Waddah Fry Mix' },
      ],
      addrShip: { id: 'oa-sam-001-s', fullName: 'Sam Rivera', addr1: '500 Senate St', city: 'Columbia', region: 'SC', zip: '29201' },
      pay:      { id: 'pay-sam-001', amount: 28.89, status: 'captured', txnId: 'pi_test_sam001', capturedAt: past(7) },
      history: [
        { id: 'osh-sam-001-1', newStatus: 'pending',   changedAt: past(7) },
        { id: 'osh-sam-001-2', oldStatus: 'pending',   newStatus: 'confirmed', changedAt: past(6) },
        { id: 'osh-sam-001-3', oldStatus: 'confirmed', newStatus: 'shipped',   changedAt: past(5) },
      ],
      shipment: { id: 'ship-sam-001', carrier: 'FedEx', tracking: '748902364023', status: 'shipped', shippedAt: past(5), deliveredAt: undefined, lineIds: ['ol-sam-001-scr', 'ol-sam-001-fow'] },
      reviews: [],
    },
  ];

  for (const o of orders) {
    if (!o.userId) { console.log(`  ⚠️  Skipping order ${o.id} — user not found`); continue; }
    await prisma.shopOrder.upsert({
      where:  { id: o.id },
      update: {},
      create: { id: o.id, userId: o.userId, orderDate: o.date, orderStatusId: o.statusId, shippingMethodId: o.shipMethodId, subtotal: o.sub, discountTotal: o.disc, taxTotal: o.tax, shippingTotal: o.ship, grandTotal: o.total },
    });
    for (const l of o.lines) {
      await prisma.orderLine.upsert({ where: { id: l.id }, update: {}, create: { id: l.id, orderId: o.id, productItemId: l.itemId, qty: l.qty, unitPriceSnapshot: l.price, lineTotal: l.price * l.qty, skuSnapshot: l.sku, productNameSnapshot: l.name } });
    }
    await prisma.orderAddress.upsert({ where: { id: o.addrShip.id }, update: {}, create: { id: o.addrShip.id, orderId: o.id, addressType: 'shipping', fullName: o.addrShip.fullName, addressLine1: o.addrShip.addr1, city: o.addrShip.city, region: o.addrShip.region, postalCode: o.addrShip.zip, countryName: 'United States', countryIso2: 'US' } });
    if (o.pay) {
      await prisma.payment.upsert({ where: { id: o.pay.id }, update: {}, create: { id: o.pay.id, orderId: o.id, provider: 'stripe', amount: o.pay.amount, status: o.pay.status, providerTxnId: o.pay.txnId, authorizedAt: o.date, capturedAt: o.pay.capturedAt } });
    }
    for (const h of o.history) {
      await prisma.orderStatusHistory.upsert({ where: { id: h.id }, update: {}, create: { id: h.id, orderId: o.id, oldStatusId: h.oldStatus ? S[h.oldStatus] : null, newStatusId: S[h.newStatus], changedAt: h.changedAt } });
    }
    if (o.shipment) {
      await prisma.shipment.upsert({ where: { orderId: o.id }, update: {}, create: { id: o.shipment.id, orderId: o.id, carrier: o.shipment.carrier, trackingNumber: o.shipment.tracking, status: o.shipment.status, shippedAt: o.shipment.shippedAt, deliveredAt: o.shipment.deliveredAt } });
      for (const lineId of o.shipment.lineIds) {
        await prisma.shipmentItem.upsert({ where: { shipmentId_orderLineId: { shipmentId: o.shipment.id, orderLineId: lineId } }, update: {}, create: { shipmentId: o.shipment.id, orderLineId: lineId, qty: 1 } });
      }
    }
    for (const r of o.reviews) {
      await prisma.userReview.upsert({ where: { id: r.id }, update: {}, create: { id: r.id, userId: o.userId, productId: r.productId, orderLineId: r.lineId, ratingValue: r.rating, comment: r.comment, isApproved: true } });
    }
    const statusName = allStatuses.find(s => s.id === o.statusId)?.status ?? '?';
    console.log(`  ✅ Order ${o.id}: ${o.lines.length} lines, status=${statusName}`);
  }
}

async function main() {
  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('👤  Seeding users...\n');
  await seedUsers();

  // ── Products ───────────────────────────────────────────────────────────────
  console.log('\n');
  await seedProducts();

  // ── Blog posts ─────────────────────────────────────────────────────────────
  console.log('\n');
  await seedBlogPosts();

  // ── News articles ──────────────────────────────────────────────────────────
  console.log('\n');
  await seedNewsArticles();

  // ── Content pages ──────────────────────────────────────────────────────────
  console.log('\n');
  await seedContentPages();

  // ── Geography ──────────────────────────────────────────────────────────────
  console.log('\n');
  await seedGeography();

  // ── User data ──────────────────────────────────────────────────────────────
  console.log('\n');
  await seedUserData();

  // ── Order infrastructure ───────────────────────────────────────────────────
  console.log('\n');
  await seedOrderInfrastructure();

  // ── Promotions ─────────────────────────────────────────────────────────────
  console.log('\n');
  await seedPromotions();

  // ── Menus ──────────────────────────────────────────────────────────────────
  console.log('\n');
  await seedMenus();

  // ── Locations ──────────────────────────────────────────────────────────────
  console.log('\n');
  await seedLocations();

  // ── Subscribers ────────────────────────────────────────────────────────────
  console.log('\n');
  await seedSubscribers();

  // ── Recipes ────────────────────────────────────────────────────────────────
  console.log('\n');
  await seedRecipes();

  // ── Dashboard ──────────────────────────────────────────────────────────────
  console.log('\n');
  await seedDashboard();

  // ── Sample orders ──────────────────────────────────────────────────────────
  console.log('\n');
  await seedSampleOrders();

  // ── Message templates ──────────────────────────────────────────────────────
  console.log('\n🌱  Seeding message templates...\n');

  let created = 0;
  let updated = 0;

  for (const t of templates) {
    const result = await prisma.messageTemplate.upsert({
      where: {
        eventKey_channel_audience_locale: {
          eventKey: t.eventKey,
          channel: t.channel,
          audience: t.audience,
          locale: t.locale,
        },
      },
      update: {
        name: t.name,
        subject: t.subject ?? null,
        bodyHtml: t.bodyHtml ?? null,
        bodyText: t.bodyText,
        variablesSchema: t.variablesSchema ?? null,
      },
      create: {
        eventKey: t.eventKey,
        channel: t.channel,
        audience: t.audience,
        locale: t.locale,
        name: t.name,
        subject: t.subject ?? null,
        bodyHtml: t.bodyHtml ?? null,
        bodyText: t.bodyText,
        variablesSchema: t.variablesSchema ?? null,
      },
    });

    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      created++;
      console.log(`  ✅ Created: [${t.channel.padEnd(5)}] ${t.eventKey} (${t.audience})`);
    } else {
      updated++;
      console.log(`  🔄 Updated: [${t.channel.padEnd(5)}] ${t.eventKey} (${t.audience})`);
    }
  }

  console.log(`\n✅  Done! ${created} created, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


