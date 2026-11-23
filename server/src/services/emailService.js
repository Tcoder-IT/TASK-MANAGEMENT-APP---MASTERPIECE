import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;
let isConfigured = false;

function createTransporter() {
  if (!env.EMAIL_HOST || !env.EMAIL_PORT || !env.EMAIL_USER || !env.EMAIL_PASS) {
    logger.info('Email service: SMTP not configured, using console fallback');
    return null;
  }

  try {
    const transport = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

    // Verify connection
    transport.verify((error) => {
      if (error) {
        logger.warn('Email service: SMTP verification failed', { error: error.message });
        isConfigured = false;
      } else {
        logger.info('Email service: SMTP connection verified');
        isConfigured = true;
      }
    });

    return transport;
  } catch (error) {
    logger.warn('Email service: Failed to create transporter', { error: error.message });
    return null;
  }
}

export async function sendEmail({ to, subject, html, text }) {
  // Initialize transporter on first use
  if (transporter === null) {
    transporter = createTransporter();
  }

  const from = env.EMAIL_FROM || 'StudyFlow <noreply@studyflow.local>';
  const mailOptions = { from, to, subject, html, text };

  if (!transporter || !isConfigured) {
    // Development/test fallback: log to console
    logger.info('Email service: SMTP not configured, logging email to console', {
      to,
      subject,
      preview: text?.substring(0, 200),
    });
    return { success: true, fallback: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { messageId: info.messageId, to });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email service: Failed to send email', { error: error.message, to });
    throw error;
  }
}

export function isEmailConfigured() {
  if (transporter === null) {
    transporter = createTransporter();
  }
  return isConfigured;
}