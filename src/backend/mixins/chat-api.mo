import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import ChatLib "../lib/chat";
import Types "../types/chat";

mixin (
  accessControlState : AccessControl.AccessControlState,
  state : Types.ChatState,
) {
  // ---- Profiles ----

  public shared query ({ caller }) func getMyProfile() : async ?Types.Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their profile");
    };
    ChatLib.getProfile(state, caller);
  };

  public shared ({ caller }) func updateProfile(displayName : Text, avatar : ?Text) : async Types.Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update their profile");
    };
    if (ChatLib.getProfile(state, caller) == null) {
      ignore ChatLib.registerProfile(state, caller, displayName);
    };
    ChatLib.updateProfile(state, caller, displayName, avatar);
  };

  public shared query ({ caller }) func listUsers() : async [Types.Profile] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list users");
    };
    ChatLib.listProfiles(state);
  };

  // ---- Conversations ----

  public shared ({ caller }) func startConversation(other : Types.UserId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can start a conversation");
    };
    ChatLib.startConversation(state, caller, other);
  };

  public shared query ({ caller }) func listConversations() : async [Types.Conversation] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list conversations");
    };
    ChatLib.listConversationsFor(state, caller);
  };

  public shared query ({ caller }) func getConversation(conversationId : Nat) : async ?Types.Conversation {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view a conversation");
    };
    ChatLib.getConversation(state, conversationId);
  };

  // ---- Messages ----

  public shared ({ caller }) func sendMessage(conversationId : Nat, body : Text) : async Types.Message {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    ChatLib.sendMessage(state, conversationId, caller, body);
  };

  public shared query ({ caller }) func listMessages(conversationId : Nat) : async [Types.Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list messages");
    };
    ChatLib.listMessages(state, conversationId);
  };

  public shared ({ caller }) func markConversationRead(conversationId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark a conversation read");
    };
    ChatLib.markConversationRead(state, conversationId, caller);
  };

  // ---- Calls ----

  public shared ({ caller }) func startCall(conversationId : Nat, kind : Types.CallKind) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can start a call");
    };
    let conv = ChatLib.getConversation(state, conversationId) ?? Runtime.trap("Conversation not found");
    let callee = if (conv.participantA == caller) { conv.participantB } else { conv.participantA };
    ChatLib.startCall(state, conversationId, caller, callee, kind);
  };

  public shared ({ caller }) func acceptCall(callId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can accept a call");
    };
    ChatLib.acceptCall(state, callId);
  };

  public shared ({ caller }) func declineCall(callId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can decline a call");
    };
    ChatLib.declineCall(state, callId);
  };

  public shared ({ caller }) func endCall(callId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can end a call");
    };
    ChatLib.endCall(state, callId);
  };

  public shared query ({ caller }) func listCalls(conversationId : Nat) : async [Types.CallRecord] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list calls");
    };
    ChatLib.listCalls(state, conversationId);
  };

  // ---- WebRTC signaling ----

  public shared ({ caller }) func sendSignal(conversationId : Nat, to : Types.UserId, kind : Types.SignalKind, payload : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send signals");
    };
    ChatLib.sendSignal(state, conversationId, caller, to, kind, payload);
  };

  public shared query ({ caller }) func pollSignals(conversationId : Nat) : async [Types.SignalMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can poll signals");
    };
    ChatLib.pollSignals(state, conversationId, caller);
  };
};
