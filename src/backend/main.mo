import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Principal "mo:core/Principal";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import Types "types/chat";
import ChatApiMixin "mixins/chat-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let chatState : Types.ChatState;
  include ChatApiMixin(accessControlState, chatState);

  // Sample owner used only to seed OQL schema discovery; the value is ignored.
  transient let anyP = Principal.fromText("aaaaa-aa");

  // Flatten every message across all conversations into a single iterator.
  func allMessages() : [Types.Message] {
    var out : [Types.Message] = [];
    for ((_, list) in chatState.messages.entries()) {
      out := out.concat(list.toArray());
    };
    out;
  };

  // Flatten every signal message across all conversations into a single iterator.
  func allSignals() : [Types.SignalMessage] {
    var out : [Types.SignalMessage] = [];
    for ((_, list) in chatState.signals.entries()) {
      out := out.concat(list.toArray());
    };
    out;
  };

  include Expose({
    entities = [
      // User directory: each signed-in user reads only their own profile via
      // OQL, while the platform controller (Data Intelligence agent) can
      // answer aggregate questions over the whole directory.
      OQL.Entity.manual<Types.Profile>("profile", func () = chatState.profiles.values(), "Profile", "id")
        .sample({ id = anyP; displayName = ""; avatar = null; status = #offline; lastSeen = 0 })
        .payload("id", func p = p.id)
        .payload("displayName", func p = p.displayName)
        .payload("avatar", func p = (switch (p.avatar) { case null ""; case (?a) a }))
        .payload("status", func p = (switch (p.status) { case (#online) "online"; case (#offline) "offline"; case (#away) "away" }))
        .payload("lastSeen", func p = p.lastSeen)
        .ownedBy("id")
        .controllerOrScoped()
        .build(),
      // One-on-one conversations: private to users, readable by the controller.
      chatState.conversations.toEntity("conversation", "Conversation", "id")
        .sample({ id = 0; participantA = anyP; participantB = anyP; lastMessagePreview = ""; lastMessageAt = 0; unreadA = 0; unreadB = 0 })
        .controllerOnly()
        .build(),
      // Chat messages: private to users, readable by the controller.
      OQL.Entity.manual<Types.Message>("message", func () = allMessages().values(), "Message", "id")
        .sample({ id = 0; conversationId = 0; sender = anyP; body = ""; sentAt = 0; read = false })
        .payload("id", func m = m.id)
        .payload("conversationId", func m = m.conversationId)
        .payload("sender", func m = m.sender)
        .payload("body", func m = m.body)
        .payload("sentAt", func m = m.sentAt)
        .payload("read", func m = m.read)
        .controllerOnly()
        .build(),
      // Call records: private to users, readable by the controller.
      OQL.Entity.manual<Types.CallRecord>("call", func () = chatState.calls.values(), "CallRecord", "id")
        .sample({ id = 0; conversationId = 0; caller = anyP; callee = anyP; kind = #video; status = #ringing; startedAt = 0; endedAt = null })
        .payload("id", func c = c.id)
        .payload("conversationId", func c = c.conversationId)
        .payload("caller", func c = c.caller)
        .payload("callee", func c = c.callee)
        .payload("kind", func c = (switch (c.kind) { case (#video) "video"; case (#audio) "audio" }))
        .payload("status", func c = (switch (c.status) { case (#ringing) "ringing"; case (#ongoing) "ongoing"; case (#ended) "ended"; case (#declined) "declined"; case (#missed) "missed" }))
        .payload("startedAt", func c = c.startedAt)
        .payload("endedAt", func c = (switch (c.endedAt) { case null 0; case (?t) t }))
        .controllerOnly()
        .build(),
      // WebRTC signaling messages: private to users, readable by the controller.
      OQL.Entity.manual<Types.SignalMessage>("signal", func () = allSignals().values(), "SignalMessage", "id")
        .sample({ id = 0; conversationId = 0; from = anyP; to = anyP; kind = #offer; payload = ""; sentAt = 0 })
        .payload("id", func s = s.id)
        .payload("conversationId", func s = s.conversationId)
        .payload("from", func s = s.from)
        .payload("to", func s = s.to)
        .payload("kind", func s = (switch (s.kind) { case (#offer) "offer"; case (#answer) "answer"; case (#iceCandidate) "iceCandidate" }))
        .payload("payload", func s = s.payload)
        .payload("sentAt", func s = s.sentAt)
        .controllerOnly()
        .build(),
    ];
  });

  include ApiDocMixin();
};
