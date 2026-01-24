import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'https://d924a82225eb6d2c78eaff525dee5502@o4510766004633600.ingest.us.sentry.io/4510766288732160',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
