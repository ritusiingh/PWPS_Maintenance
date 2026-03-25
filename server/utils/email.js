const nodemailer = require('nodemailer');
const { db } = require('../models/database');

let transporter = null;

function initMailer() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('\ud83d\udce7 Email transporter initialized');
  } else {
    console.log('\ud83d\udce7 Email not configured - notifications will be logged only');
  }
}

async function sendEmail(to, subject, html, userId = null, flatId = null) {
  const logInsert = db.prepare(`
    INSERT INTO email_logs (user_id, flat_id, email_to, subject, body, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (!transporter) {
    logInsert.run(userId, flatId, to, subject, html, 'pending');
    console.log(`\ud83d\udce7 [LOG ONLY] Email to ${to}: ${subject}`);
    return { success: false, message: 'Email not configured' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    logInsert.run(userId, flatId, to, subject, html, 'sent');
    return { success: true };
  } catch (err) {
    logInsert.run(userId, flatId, to, subject, html, 'failed');
    console.error('Email send error:', err.message);
    return { success: false, message: err.message };
  }
}

function maintenanceReminderHTML(ownerName, flatNumber, amount, month, year, dueDate) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f766e, #14b8a6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">\ud83c\udfe0 Maintenance Payment Reminder</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <p style="color: #334155; font-size: 16px;">Dear <strong>${ownerName}</strong>,</p>
        <p style="color: #64748b;">This is a reminder for your apartment maintenance payment for <strong>${month} ${year}</strong>.</p>
        <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 5px 0; color: #0f766e;"><strong>Flat:</strong> ${flatNumber}</p>
          <p style="margin: 5px 0; color: #0f766e;"><strong>Amount:</strong> \u20b9${amount.toLocaleString('en-IN')}</p>
          <p style="margin: 5px 0; color: #0f766e;"><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Please ensure timely payment. For any queries, contact the maintenance office.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated notification from your Apartment Maintenance System.</p>
      </div>
    </div>
  `;
}

function paymentConfirmationHTML(ownerName, flatNumber, amount, transactionId, paymentDate) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #16a34a, #4ade80); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">\u2705 Payment Confirmed</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <p style="color: #334155; font-size: 16px;">Dear <strong>${ownerName}</strong>,</p>
        <p style="color: #64748b;">Your maintenance payment has been successfully recorded.</p>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 5px 0; color: #166534;"><strong>Flat:</strong> ${flatNumber}</p>
          <p style="margin: 5px 0; color: #166534;"><strong>Amount:</strong> \u20b9${amount.toLocaleString('en-IN')}</p>
          <p style="margin: 5px 0; color: #166534;"><strong>Transaction ID:</strong> ${transactionId || 'N/A'}</p>
          <p style="margin: 5px 0; color: #166534;"><strong>Date:</strong> ${paymentDate}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Thank you for your timely payment!</p>
      </div>
    </div>
  `;
}

module.exports = { initMailer, sendEmail, maintenanceReminderHTML, paymentConfirmationHTML };
