import { PocketIc, createIdentity, type Actor } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

// `@dfinity/pic` is the only package resolvable from this lane directory, so
// principals are derived from its `createIdentity` helper rather than importing
// `@icp-sdk/core/principal` (unresolvable here) or `@dfinity/principal` (not in
// the dependency tree). `Identity.getPrincipal()` returns the same
// `@icp-sdk/core/principal` `Principal` type the generated `_SERVICE` expects.
const ALICE = createIdentity("realchat-alice-seed").getPrincipal();
const BOB = createIdentity("realchat-bob-seed").getPrincipal();

let pic: PocketIc | undefined;
let actor: _SERVICE;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  const fixture = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
    sender: ALICE,
  });
  actor = fixture.actor;
  // `sender` in setupCanister only sets the installing/controller principal; the
  // actor's own calls default to the anonymous caller. Every chat method
  // requires #user permission, so pin the caller to ALICE before initializing.
  (actor as unknown as Actor<_SERVICE>).setPrincipal(ALICE);
  // The first non-anonymous caller to initialize becomes admin, which grants
  // permission for every #user-required method the chat API exposes.
  await actor._initialize_access_control();
  // Register BOB as a regular user so the signaling test can poll as the
  // recipient (pollSignals only returns signals addressed to the caller).
  (actor as unknown as Actor<_SERVICE>).setPrincipal(BOB);
  await actor._initialize_access_control();
  (actor as unknown as Actor<_SERVICE>).setPrincipal(ALICE);
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.listUsers()).resolves.toEqual([]);
  await expect(actor.listConversations()).resolves.toEqual([]);
});

it("round-trips a profile through updateProfile and getMyProfile", async () => {
  const profile = await actor.updateProfile("Alice", ["https://example.com/a.png"]);
  expect(profile.displayName).toBe("Alice");
  expect(profile.avatar).toEqual(["https://example.com/a.png"]);

  const mine = await actor.getMyProfile();
  expect(mine).not.toEqual([]);
  expect(mine![0].displayName).toBe("Alice");
});

it("starts a conversation and sends a message that appears in the thread", async () => {
  const conversationId = await actor.startConversation(BOB);
  const message = await actor.sendMessage(conversationId, "Hello Bob");
  expect(message.body).toBe("Hello Bob");

  const messages = await actor.listMessages(conversationId);
  expect(messages).toHaveLength(1);
  expect(messages[0].body).toBe("Hello Bob");

  const conversations = await actor.listConversations();
  expect(conversations).toContainEqual(
    expect.objectContaining({ id: conversationId, lastMessagePreview: "Hello Bob" }),
  );
});

it("marks a conversation read and clears the unread count", async () => {
  const conversationId = await actor.startConversation(BOB);
  await actor.sendMessage(conversationId, "unread for me");
  await actor.markConversationRead(conversationId);

  const conversation = await actor.getConversation(conversationId);
  expect(conversation).not.toEqual([]);
  expect(conversation![0].unreadA).toBe(0n);
});

it("round-trips a video call through startCall, acceptCall, and listCalls", async () => {
  const conversationId = await actor.startConversation(BOB);
  const callId = await actor.startCall(conversationId, { video: null });

  const ringing = await actor.listCalls(conversationId);
  expect(ringing).toContainEqual(
    expect.objectContaining({ id: callId, status: { ringing: null } }),
  );

  await actor.acceptCall(callId);
  const ongoing = await actor.listCalls(conversationId);
  expect(ongoing).toContainEqual(
    expect.objectContaining({ id: callId, status: { ongoing: null } }),
  );
});

it("records a declined call in the conversation history", async () => {
  const conversationId = await actor.startConversation(BOB);
  const callId = await actor.startCall(conversationId, { video: null });
  await actor.declineCall(callId);

  const calls = await actor.listCalls(conversationId);
  expect(calls).toContainEqual(
    expect.objectContaining({ id: callId, status: { declined: null } }),
  );
});

it("round-trips a WebRTC signal through sendSignal and pollSignals", async () => {
  const conversationId = await actor.startConversation(BOB);
  await actor.sendSignal(conversationId, BOB, { offer: null }, "sdp-offer");

  // pollSignals only returns signals addressed to the caller, so poll as the
  // recipient (BOB) to observe the offer ALICE sent.
  (actor as unknown as Actor<_SERVICE>).setPrincipal(BOB);
  const signals = await actor.pollSignals(conversationId);
  expect(signals).toContainEqual(
    expect.objectContaining({ to: BOB, kind: { offer: null }, payload: "sdp-offer" }),
  );
});
