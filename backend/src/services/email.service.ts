/**
 * Email Service
 * Handles email sending with Resend and Handlebars templates
 */

import { Resend } from 'resend';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import emailConfig from '../config/email.config.js';
import { logger } from '../utils/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown> | LeaveRequestEmailData;
  replyTo?: string;
}

export interface LeaveRequestEmailData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status?: string;
  approverName?: string;
  rejectionReason?: string;
  dashboardUrl: string;
  companyName: string;
}

class EmailService {
  private resend: Resend;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.resend = new Resend(emailConfig.resend.apiKey);
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers for templates
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  /**
   * Load and compile Handlebars template
   */
  private getTemplate(templateName: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = join(
      process.cwd(),
      'src',
      'templates',
      'emails',
      `${templateName}.hbs`
    );

    try {
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      logger.error(`Failed to load email template: ${templateName}`, error);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  /**
   * Send email using Resend
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    replyTo?: string
  ): Promise<void> {
    if (!emailConfig.resend.apiKey) {
      logger.warn('Email API key not configured, skipping email send');
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${emailConfig.resend.fromName} <${emailConfig.resend.fromEmail}>`,
        to: [to],
        subject,
        html,
        ...(replyTo && { reply_to: replyTo }),
      });

      if (error) {
        logger.error('Resend API error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      logger.info(`Email sent successfully to ${to}`, { emailId: data?.id });
    } catch (error) {
      logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Send email with template
   */
  async send(options: EmailOptions): Promise<void> {
    const { to, subject, templateName, templateData, replyTo } = options;

    // Add base template data
    const fullTemplateData = {
      ...templateData,
      baseUrl: emailConfig.templates.baseUrl,
      logoUrl: emailConfig.templates.logoUrl,
      primaryColor: emailConfig.branding.primaryColor,
      companyName: emailConfig.branding.companyName,
      currentYear: new Date().getFullYear(),
    };

    const template = this.getTemplate(templateName);
    const html = template(fullTemplateData);

    await this.sendEmail(to, subject, html, replyTo);
  }

  /**
   * Send leave request submission notification
   */
  async sendLeaveRequestSubmitted(
    to: string,
    data: LeaveRequestEmailData
  ): Promise<void> {
    await this.send({
      to,
      subject: `[HRM] คำขอลาใหม่จาก ${data.employeeName}`,
      templateName: 'leave-request-submitted',
      templateData: data,
    });
  }

  /**
   * Send leave request approved notification
   */
  async sendLeaveRequestApproved(
    to: string,
    data: LeaveRequestEmailData
  ): Promise<void> {
    await this.send({
      to,
      subject: '[HRM] คำขอลาของคุณได้รับการอนุมัติ',
      templateName: 'leave-request-approved',
      templateData: data,
    });
  }

  /**
   * Send leave request rejected notification
   */
  async sendLeaveRequestRejected(
    to: string,
    data: LeaveRequestEmailData
  ): Promise<void> {
    await this.send({
      to,
      subject: '[HRM] คำขอลาของคุณถูกปฏิเสธ',
      templateName: 'leave-request-rejected',
      templateData: data,
    });
  }

  /**
   * Send leave request cancelled notification
   */
  async sendLeaveRequestCancelled(
    to: string,
    data: LeaveRequestEmailData
  ): Promise<void> {
    await this.send({
      to,
      subject: '[HRM] คำขอลาถูกยกเลิก',
      templateName: 'leave-request-cancelled',
      templateData: data,
    });
  }

  /**
   * Send upcoming leave reminder
   */
  async sendLeaveReminder(to: string, data: LeaveRequestEmailData): Promise<void> {
    await this.send({
      to,
      subject: '[HRM] แจ้งเตือน: คุณมีวันลาพรุ่งนี้',
      templateName: 'leave-reminder',
      templateData: data,
    });
  }
}

export const emailService = new EmailService();
