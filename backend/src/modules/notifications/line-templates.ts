
import { FlexMessage, FlexBubble } from '@line/bot-sdk';

/**
 * Template for shift schedule published notification
 */
export const createShiftPublishedMessage = (
    startDate: string,
    endDate: string,
    totalShifts: number
): FlexMessage => {
    const bubble: FlexBubble = {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '📅 New Schedule Published',
                    weight: 'bold',
                    size: 'lg',
                    color: '#1DB446'
                }
            ]
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'A new schedule has been published.',
                    wrap: true,
                    size: 'sm',
                    color: '#666666'
                },
                {
                    type: 'separator',
                    margin: 'md'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Period',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${startDate} - ${endDate}`,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Shifts',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${totalShifts} shifts`,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'link',
                    height: 'sm',
                    action: {
                        type: 'uri',
                        label: 'View Schedule',
                        uri: `https://liff.line.me/${process.env.LIFF_SCHEDULE_ID}`
                    }
                }
            ],
            flex: 0
        }
    };

    return {
        type: 'flex',
        altText: 'New schedule published',
        contents: bubble
    };
};

/**
 * Template for shift reminder
 */
export const createShiftReminderMessage = (
    date: string,
    timeRange: string,
    location: string
): FlexMessage => {
    const bubble: FlexBubble = {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '⏰ Shift Reminder',
                    weight: 'bold',
                    size: 'lg',
                    color: '#FF9800'
                }
            ]
        },
        hero: {
            type: 'image',
            url: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png', // Placeholder icon
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'You have an upcoming shift tomorrow.',
                    wrap: true,
                    size: 'sm',
                    color: '#666666'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Date',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: date,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 4
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Time',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: timeRange,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 4
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Loc',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: location || 'Head Office',
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 4
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'secondary',
                    height: 'sm',
                    action: {
                        type: 'uri',
                        label: 'Clock In',
                        uri: `https://liff.line.me/${process.env.LIFF_CLOCK_ID}`
                    }
                }
            ],
            flex: 0
        }
    };

    return {
        type: 'flex',
        altText: `Shift reminder: ${date} ${timeRange}`,
        contents: bubble
    };
};

/**
 * Template for shift replacement offer
 */
export const createShiftOfferMessage = (
    date: string,
    timeRange: string,
    shiftId: string
): FlexMessage => {
    const bubble: FlexBubble = {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🎁 Shift Offer',
                    weight: 'bold',
                    size: 'lg',
                    color: '#007BFF'
                }
            ]
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'A shift is available for you to claim.',
                    wrap: true,
                    size: 'sm',
                    color: '#666666'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Date',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: date,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 3
                                }
                            ]
                        },
                        {
                            type: 'text',
                            text: timeRange,
                            weight: 'bold',
                            size: 'xl',
                            color: '#333333',
                            margin: 'md',
                            align: 'center'
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    height: 'sm',
                    action: {
                        type: 'uri',
                        label: 'Claim Shift',
                        uri: `https://liff.line.me/${process.env.LIFF_SCHEDULE_ID}?action=claim&shiftId=${shiftId}`
                    }
                }
            ],
            flex: 0
        }
    };

    return {
        type: 'flex',
        altText: `Shift Offer: ${date} ${timeRange}`,
        contents: bubble
    };
};
