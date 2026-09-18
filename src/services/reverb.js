import { getToken } from "../storage/token";

const REVERB_HOST = "192.168.8.5";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "stobweevbd4exnufy5dr";

const API_URL = "http://192.168.8.5:8000";

let socket = null;
let socketId = null;

let currentUserId = null;

let shouldReconnect = false;
let reconnectTimer = null;
let reconnectAttempts = 0;

let notificationCallback = null;

const conversationCallbacks = new Map();
const subscribedConversations = new Map();

const notificationChannel = (userId) =>
    `private-App.Models.User.${userId}`;

const conversationChannel = (conversationId) =>
    `private-conversation.${conversationId}`;

const parseData = (data) => {
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

const send = (payload) => {
    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {
        console.log(
            "⚠️ Reverb socket is not ready"
        );

        return false;
    }

    socket.send(
        JSON.stringify(payload)
    );

    return true;
};

const authenticateChannel = async (
    channelName
) => {
    try {
        const token = await getToken();

        if (!token) {
            console.log(
                "❌ No token for channel auth"
            );

            return false;
        }

        if (!socketId) {
            console.log(
                "❌ No socket ID for channel auth"
            );

            return false;
        }

        console.log(
            "🔐 Authenticating:",
            channelName
        );

        const response = await fetch(
            `${API_URL}/broadcasting/auth`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    Accept:
                        "application/json",

                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    socket_id:
                        socketId,

                    channel_name:
                        channelName,
                }),
            }
        );

        const text =
            await response.text();

        console.log(
            "🔐 Auth status:",
            response.status,
            channelName
        );

        console.log(
            "🔐 Auth response:",
            text
        );

        if (!response.ok) {
            return false;
        }

        const auth =
            parseData(text);

        if (!auth?.auth) {
            console.log(
                "❌ Auth response has no auth"
            );

            return false;
        }

        send({
            event:
                "pusher:subscribe",

            data: {
                auth:
                    auth.auth,

                channel:
                    channelName,
            },
        });

        console.log(
            "📡 Subscribe sent:",
            channelName
        );

        return true;

    } catch (error) {
        console.log(
            "❌ Channel auth error:",
            error
        );

        return false;
    }
};

export const subscribeToConversation = async (
    conversationId,
    callback
) => {
    if (!conversationId) {
        return false;
    }

    if (
        typeof callback !== "function"
    ) {
        return false;
    }

    const id =
        String(conversationId);

    conversationCallbacks.set(
        id,
        callback
    );

    const channel =
        conversationChannel(id);

    if (
        subscribedConversations.has(id)
    ) {
        console.log(
            "✅ Already subscribed:",
            channel
        );

        return true;
    }

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN ||
        !socketId
    ) {
        console.log(
            "⏳ Waiting for Reverb before subscribing:",
            channel
        );

        return false;
    }

    const success =
        await authenticateChannel(
            channel
        );

    if (success) {
        subscribedConversations.set(
            id,
            channel
        );
    }

    return success;
};

export const unsubscribeFromConversation = (
    conversationId
) => {
    if (!conversationId) {
        return;
    }

    const id =
        String(conversationId);

    const channel =
        subscribedConversations.get(id);

    if (
        channel &&
        socket?.readyState === WebSocket.OPEN
    ) {
        send({
            event:
                "pusher:unsubscribe",

            data: {
                channel,
            },
        });
    }

    subscribedConversations.delete(id);
    conversationCallbacks.delete(id);
};

const reconnect = () => {
    if (!shouldReconnect) {
        return;
    }

    if (reconnectTimer) {
        return;
    }

    reconnectAttempts += 1;

    const delay =
        Math.min(
            3000 * reconnectAttempts,
            15000
        );

    console.log(
        `🔄 Reconnect in ${delay}ms`
    );

    reconnectTimer =
        setTimeout(() => {
            reconnectTimer = null;

            if (
                shouldReconnect &&
                currentUserId
            ) {
                connectReverb(
                    currentUserId,
                    notificationCallback
                );
            }
        }, delay);
};

export const connectReverb = async (
    userId,
    onNotification
) => {
    if (!userId) {
        return;
    }

    currentUserId =
        String(userId);

    notificationCallback =
        onNotification;

    shouldReconnect = true;

    if (
        socket?.readyState ===
        WebSocket.OPEN
    ) {
        return;
    }

    if (socket) {
        try {
            socket.close();
        } catch {}
    }

    const token =
        await getToken();

    if (!token) {
        console.log(
            "❌ No auth token"
        );

        return;
    }

    const url =
        `ws://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_APP_KEY}`;

    console.log(
        "🔌 Connecting:",
        url
    );

    socket =
        new WebSocket(url);

    socket.onopen = () => {
        reconnectAttempts = 0;

        console.log(
            "✅ Reverb connected"
        );
    };

    socket.onmessage = async (
        event
    ) => {
        try {
            console.log(
                "📩 RAW REVERB:",
                event.data
            );

            const payload =
                JSON.parse(
                    event.data
                );

            const eventName =
                payload.event;

            const channel =
                payload.channel;

            const data =
                parseData(
                    payload.data
                );

            /*
            |--------------------------------------------------------------------------
            | Connection
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "pusher:connection_established"
            ) {
                socketId =
                    data.socket_id;

                console.log(
                    "✅ Socket ID:",
                    socketId
                );

                /*
                |--------------------------------------------------------------------------
                | Notification channel
                |--------------------------------------------------------------------------
                */

                await authenticateChannel(
                    notificationChannel(
                        currentUserId
                    )
                );

                /*
                |--------------------------------------------------------------------------
                | Restore conversations
                |--------------------------------------------------------------------------
                */

                for (
                    const id
                    of conversationCallbacks.keys()
                ) {
                    const success =
                        await authenticateChannel(
                            conversationChannel(
                                id
                            )
                        );

                    if (success) {
                        subscribedConversations.set(
                            id,
                            conversationChannel(
                                id
                            )
                        );
                    }
                }

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Ping
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "pusher:ping"
            ) {
                send({
                    event:
                        "pusher:pong",

                    data: {},
                });

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Subscription
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "pusher_internal:subscription_succeeded"
            ) {
                console.log(
                    "✅ CHANNEL SUBSCRIBED:",
                    channel
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Errors
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "pusher:error"
            ) {
                console.log(
                    "❌ REVERB ERROR:",
                    data
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Chat
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "message.sent"
            ) {
                console.log(
                    "🔥 MESSAGE.SENT:",
                    data
                );

                if (!channel) {
                    return;
                }

                const match =
                    channel.match(
                        /^private-conversation\.(\d+)$/
                    );

                if (!match) {
                    console.log(
                        "⚠️ Invalid chat channel:",
                        channel
                    );

                    return;
                }

                const conversationId =
                    match[1];

                const callback =
                    conversationCallbacks.get(
                        conversationId
                    );

                if (
                    typeof callback ===
                    "function"
                ) {
                    callback(data);
                }

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Notifications
            |--------------------------------------------------------------------------
            */

            if (
                eventName ===
                "Illuminate\\Notifications\\Events\\BroadcastNotificationCreated"
            ) {
                if (
                    typeof notificationCallback ===
                    "function"
                ) {
                    notificationCallback(
                        data
                    );
                }

                return;
            }

        } catch (error) {
            console.log(
                "❌ Reverb parsing error:",
                error
            );
        }
    };

    socket.onerror = (
        error
    ) => {
        console.log(
            "❌ Reverb WebSocket error:",
            error
        );
    };

    socket.onclose = () => {
        console.log(
            "🔌 Reverb closed"
        );

        socketId = null;

        subscribedConversations.clear();

        reconnect();
    };
};

export const disconnectReverb = () => {
    shouldReconnect = false;

    if (reconnectTimer) {
        clearTimeout(
            reconnectTimer
        );

        reconnectTimer = null;
    }

    socketId = null;
    currentUserId = null;

    notificationCallback = null;

    conversationCallbacks.clear();
    subscribedConversations.clear();

    if (socket) {
        try {
            socket.close();
        } catch {}
    }

    socket = null;

    console.log(
        "✅ Reverb disconnected"
    );
};

export const getReverbSocketId = () => {
    return socketId;
};

export const isReverbConnected = () => {
    return (
        socket?.readyState ===
        WebSocket.OPEN
    );
};

export const getSubscribedConversations = () => {
    return Array.from(
        subscribedConversations.keys()
    );
};