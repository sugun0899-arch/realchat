mixin () {
  public query func getApiDoc() : async Text {
    "# REALCHAT Backend API

REALCHAT is a real-time chat and video-call application. The backend canister
stores user profiles, one-on-one conversations, chat messages, call records,
and WebRTC signaling messages, and exposes them through a public API plus an
OQL (Object Query Layer) query surface.

## Authentication and Authorization

Access is gated by a role-based access-control system. Every caller is either
anonymous, an unregistered principal, a registered `user`, or the `admin`.

### Registration

Registration happens only when a caller signs in through the app's own
frontend, which calls `_internet_identity_sign_in_finish` (or
`_initialize_access_control`) once. The **first** non-anonymous caller to
initialize becomes `admin`; every subsequent caller becomes `user`. Anonymous
callers are ignored and never registered. A principal that never signed in
through the frontend is unregistered even if it belongs to the app's owner,
and a signed-in caller derived against a different origin is a different
principal than the one the frontend registered.

A direct API caller must register before any role-guarded call (guarded
queries included) by calling `_initialize_access_control` once as a signed-in
caller.

### Identity derivation

The app's frontend pins an Internet Identity derivation origin, published at
`/.well-known/ii-derivation-origin` when available. An agent already holding
the user's Internet Identity authorization derives the correct per-app
principal against that origin, for example
`icp identity link web <name> --app <host>`. Such a delegation acts with the
user's full authority in this app until it expires.

### What each caller receives

- **Anonymous** callers are `#guest`. Every chat endpoint requires `#user`
  permission and traps with `Unauthorized: Only users can ...` (the specific
  message varies per endpoint).
- **Unregistered non-anonymous** callers trap with `User is not registered`
  when any role-guarded endpoint calls `hasPermission`.
- **Registered `user`** callers may call all chat endpoints.
- **`admin`** callers pass every permission check and may also call
  `assignCallerUserRole` to assign roles.

### Public methods and their guards

| Method | Kind | Guard |
| --- | --- | --- |
| `getMyProfile` | query | `#user` |
| `updateProfile` | update | `#user` |
| `listUsers` | query | `#user` |
| `startConversation` | update | `#user` |
| `listConversations` | query | `#user` |
| `getConversation` | query | `#user` |
| `sendMessage` | update | `#user` |
| `listMessages` | query | `#user` |
| `markConversationRead` | update | `#user` |
| `startCall` | update | `#user` |
| `acceptCall` | update | `#user` |
| `declineCall` | update | `#user` |
| `endCall` | update | `#user` |
| `listCalls` | query | `#user` |
| `sendSignal` | update | `#user` |
| `pollSignals` | query | `#user` |
| `_initialize_access_control` | update | none (registers caller) |
| `_internet_identity_sign_in_start` | update | none |
| `_internet_identity_sign_in_finish` | update | none (registers caller) |
| `assignCallerUserRole` | update | `admin` |
| `getCallerUserRole` | query | none |
| `isCallerAdmin` | query | none |
| `schema` | query | OQL |
| `execute` | query | OQL |
| `getApiDoc` | query | none |

## Units and Encodings

- **Identifiers**: `UserId` is a `Principal` (the caller's Internet Identity
  principal). Conversation, message, call, and signal ids are `Nat` counters.
- **Timestamps**: `Timestamp` is an `Int` of nanoseconds since the Unix epoch
  (`Time.now()`). `lastSeen`, `lastMessageAt`, `sentAt`, `startedAt`, and
  `endedAt` all use this encoding. `endedAt` is optional (`?Timestamp`) and is
  `null` while a call is still ringing or ongoing.
- **Online status**: `#online`, `#offline`, or `#away`.
- **Call kind**: `#video` or `#audio`.
- **Call status**: `#ringing`, `#ongoing`, `#ended`, `#declined`, or `#missed`.
- **Signal kind**: `#offer`, `#answer`, or `#iceCandidate`.
- **Avatar**: `?Text`; `null` means no avatar set.

## Lifecycle and Polling

- **Profiles**: `updateProfile` registers a profile on first use if none
  exists, then updates the display name and avatar and refreshes `lastSeen`.
- **Conversations**: `startConversation` returns an existing conversation id
  if one already exists between the two participants, otherwise creates a new
  one. A conversation is identified by its unordered participant pair.
- **Messages**: `sendMessage` appends a message, updates the conversation's
  last-message preview and timestamp, and increments the recipient's unread
  count. `markConversationRead` clears the reader's unread count and marks
  the other party's messages as read.
- **Calls**: `startCall` creates a `#ringing` call record. `acceptCall` moves
  it to `#ongoing`; `declineCall` and `endCall` set `#declined` / `#ended`
  and stamp `endedAt`. Declined or missed calls remain in conversation
  history as call records.
- **Signaling**: `sendSignal` stores a WebRTC signaling message addressed to
  a recipient. `pollSignals` is a **query** and returns only the messages
  addressed to the caller, so it is safe to poll repeatedly without consuming
  cycles. Polling is the supported mechanism for live message and call
  updates; there is no push channel.

## Mutation Retry Safety

- **Idempotent operations**: `startConversation` is idempotent for a given
  participant pair (returns the existing conversation). `updateProfile` and
  `markConversationRead` are safe to call repeatedly.
- **Non-idempotent operations**: `sendMessage`, `startCall`, and `sendSignal`
  each allocate a new id on every call, so retrying a failed request can
  create duplicates. Callers should treat these as at-least-once and dedupe
  on the client if needed.
- **Traps roll back**: a trapped call (for example an unauthorized caller, or
  `sendMessage` / `startCall` on a nonexistent conversation) rolls back the
  whole message, so no partial state is persisted.

## Errors, Limits, and Gotchas

- **Traps**: unauthorized callers trap with `Unauthorized: Only users can
  ...`; unregistered non-anonymous callers trap with `User is not
  registered`; `sendMessage` and `startCall` trap with `Conversation not
  found` when the conversation id does not exist.
- **Queries are read-only**: `pollSignals`, `listMessages`, `listCalls`,
  `listConversations`, `getConversation`, `getMyProfile`, and `listUsers` are
  queries; any state change they appear to make is discarded.
- **OQL scoping**: the `profile` entity is `controllerOrScoped` (a signed-in
  user reads only their own row; the controller reads all). The
  `conversation`, `message`, `call`, and `signal` entities are
  `controllerOnly` (private to users, readable by the platform controller).
- **OQL sentinels**: in the OQL schema, `avatar` maps `null` to the empty
  string, and `endedAt` maps `null` to `0`. Variant fields (`status`, `kind`)
  are exposed as their tag text.
"
  };
};
