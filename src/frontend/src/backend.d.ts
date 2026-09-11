import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Profile {
    id: UserId;
    status: OnlineStatus;
    displayName: string;
    lastSeen: Timestamp;
    avatar?: string;
}
export interface CallRecord {
    id: bigint;
    status: CallStatus;
    startedAt: Timestamp;
    endedAt?: Timestamp;
    kind: CallKind;
    conversationId: bigint;
    callee: UserId;
    caller: UserId;
}
export type UserId = Principal;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface Message {
    id: bigint;
    body: string;
    read: boolean;
    sender: UserId;
    sentAt: Timestamp;
    conversationId: bigint;
}
export interface SignalMessage {
    id: bigint;
    to: UserId;
    from: UserId;
    kind: SignalKind;
    sentAt: Timestamp;
    conversationId: bigint;
    payload: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface Conversation {
    id: bigint;
    participantA: UserId;
    participantB: UserId;
    lastMessageAt: Timestamp;
    lastMessagePreview: string;
    unreadA: bigint;
    unreadB: bigint;
}
export enum CallKind {
    audio = "audio",
    video = "video"
}
export enum CallStatus {
    ringing = "ringing",
    missed = "missed",
    ended = "ended",
    ongoing = "ongoing",
    declined = "declined"
}
export enum OnlineStatus {
    away = "away",
    offline = "offline",
    online = "online"
}
export enum SignalKind {
    iceCandidate = "iceCandidate",
    offer = "offer",
    answer = "answer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptCall(callId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    declineCall(callId: bigint): Promise<void>;
    endCall(callId: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    getConversation(conversationId: bigint): Promise<Conversation | null>;
    getMyProfile(): Promise<Profile | null>;
    isCallerAdmin(): Promise<boolean>;
    listCalls(conversationId: bigint): Promise<Array<CallRecord>>;
    listConversations(): Promise<Array<Conversation>>;
    listMessages(conversationId: bigint): Promise<Array<Message>>;
    listUsers(): Promise<Array<Profile>>;
    markConversationRead(conversationId: bigint): Promise<void>;
    pollSignals(conversationId: bigint): Promise<Array<SignalMessage>>;
    schema(): Promise<string>;
    sendMessage(conversationId: bigint, body: string): Promise<Message>;
    sendSignal(conversationId: bigint, to: UserId, kind: SignalKind, payload: string): Promise<void>;
    startCall(conversationId: bigint, kind: CallKind): Promise<bigint>;
    startConversation(other: UserId): Promise<bigint>;
    updateProfile(displayName: string, avatar: string | null): Promise<Profile>;
}
