import { LineBotClient, messagingApi } from '@line/bot-sdk';
import { env } from './env.js';

// LINE Bot configuration
const lineConfig = {
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: env.LINE_CHANNEL_SECRET || '',
};

// LINE Bot client for webhook verification
export const lineClient = LineBotClient.fromChannelAccessToken(lineConfig);

// LINE Messaging API client for sending messages
export const messagingApiClient = new messagingApi.MessagingApiClient({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

// LIFF App IDs
export const liffIds = {
    schedule: env.LIFF_SCHEDULE_ID,
    clock: env.LIFF_CLOCK_ID,
    leave: env.LIFF_LEAVE_ID,
    profile: env.LIFF_PROFILE_ID,
};

// Helper to check if LINE is configured
export const isLineConfigured = (): boolean => {
    return !!(env.LINE_CHANNEL_ID && env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN);
};

export default lineClient;
