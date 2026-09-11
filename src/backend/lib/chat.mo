import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/chat";

module {
  // ---- Profiles ----

  public func registerProfile(state : Types.ChatState, id : Types.UserId, displayName : Text) : Types.Profile {
    switch (state.profiles.get(id)) {
      case (?existing) { existing };
      case null {
        let profile : Types.Profile = {
          id;
          displayName;
          avatar = null;
          status = #offline;
          lastSeen = Time.now();
        };
        state.profiles.add(id, profile);
        profile;
      };
    };
  };

  public func getProfile(state : Types.ChatState, id : Types.UserId) : ?Types.Profile {
    state.profiles.get(id);
  };

  public func updateProfile(state : Types.ChatState, id : Types.UserId, displayName : Text, avatar : ?Text) : Types.Profile {
    let existing = state.profiles.get(id) ?? Runtime.trap("Profile not found");
    let updated : Types.Profile = {
      id = existing.id;
      displayName;
      avatar;
      status = existing.status;
      lastSeen = Time.now();
    };
    state.profiles.add(id, updated);
    updated;
  };

  public func listProfiles(state : Types.ChatState) : [Types.Profile] {
    state.profiles.values().toArray();
  };

  // ---- Conversations ----

  public func startConversation(state : Types.ChatState, a : Types.UserId, b : Types.UserId) : Nat {
    for (conv in state.conversations.values()) {
      if ((conv.participantA == a and conv.participantB == b) or (conv.participantA == b and conv.participantB == a)) {
        return conv.id;
      };
    };
    let id = state.nextConversationId;
    state.nextConversationId += 1;
    let conv : Types.Conversation = {
      id;
      participantA = a;
      participantB = b;
      lastMessagePreview = "";
      lastMessageAt = 0;
      unreadA = 0;
      unreadB = 0;
    };
    state.conversations.add(id, conv);
    id;
  };

  public func getConversation(state : Types.ChatState, id : Nat) : ?Types.Conversation {
    state.conversations.get(id);
  };

  public func listConversationsFor(state : Types.ChatState, userId : Types.UserId) : [Types.Conversation] {
    state.conversations.values().toArray().filter(
      func c = c.participantA == userId or c.participantB == userId
    );
  };

  // ---- Messages ----

  public func sendMessage(state : Types.ChatState, conversationId : Nat, sender : Types.UserId, body : Text) : Types.Message {
    let conv = state.conversations.get(conversationId) ?? Runtime.trap("Conversation not found");
    let id = state.nextMessageId;
    state.nextMessageId += 1;
    let msg : Types.Message = {
      id;
      conversationId;
      sender;
      body;
      sentAt = Time.now();
      read = true;
    };
    let list = state.messages.get(conversationId) ?? List.empty<Types.Message>();
    list.add(msg);
    state.messages.add(conversationId, list);
    let updated : Types.Conversation = {
      id = conv.id;
      participantA = conv.participantA;
      participantB = conv.participantB;
      lastMessagePreview = body;
      lastMessageAt = msg.sentAt;
      unreadA = if (sender == conv.participantA) { conv.unreadA } else { conv.unreadA + 1 };
      unreadB = if (sender == conv.participantB) { conv.unreadB } else { conv.unreadB + 1 };
    };
    state.conversations.add(conversationId, updated);
    msg;
  };

  public func listMessages(state : Types.ChatState, conversationId : Nat) : [Types.Message] {
    switch (state.messages.get(conversationId)) {
      case (?list) { list.toArray() };
      case null { [] };
    };
  };

  public func markConversationRead(state : Types.ChatState, conversationId : Nat, reader : Types.UserId) : () {
    switch (state.conversations.get(conversationId)) {
      case (?conv) {
        let updated : Types.Conversation = {
          id = conv.id;
          participantA = conv.participantA;
          participantB = conv.participantB;
          lastMessagePreview = conv.lastMessagePreview;
          lastMessageAt = conv.lastMessageAt;
          unreadA = if (reader == conv.participantA) { 0 } else { conv.unreadA };
          unreadB = if (reader == conv.participantB) { 0 } else { conv.unreadB };
        };
        state.conversations.add(conversationId, updated);
        switch (state.messages.get(conversationId)) {
          case (?list) {
            list.mapInPlace(func m = if (m.sender != reader) { { m with read = true } } else { m });
          };
          case null {};
        };
      };
      case null {};
    };
  };

  // ---- Calls ----

  public func startCall(state : Types.ChatState, conversationId : Nat, caller : Types.UserId, callee : Types.UserId, kind : Types.CallKind) : Nat {
    let id = state.nextCallId;
    state.nextCallId += 1;
    let call : Types.CallRecord = {
      id;
      conversationId;
      caller;
      callee;
      kind;
      status = #ringing;
      startedAt = Time.now();
      endedAt = null;
    };
    state.calls.add(id, call);
    id;
  };

  public func acceptCall(state : Types.ChatState, callId : Nat) : () {
    switch (state.calls.get(callId)) {
      case (?call) {
        let updated : Types.CallRecord = { call with status = #ongoing };
        state.calls.add(callId, updated);
      };
      case null {};
    };
  };

  public func declineCall(state : Types.ChatState, callId : Nat) : () {
    switch (state.calls.get(callId)) {
      case (?call) {
        let updated : Types.CallRecord = { call with status = #declined; endedAt = ?Time.now() };
        state.calls.add(callId, updated);
      };
      case null {};
    };
  };

  public func endCall(state : Types.ChatState, callId : Nat) : () {
    switch (state.calls.get(callId)) {
      case (?call) {
        let updated : Types.CallRecord = { call with status = #ended; endedAt = ?Time.now() };
        state.calls.add(callId, updated);
      };
      case null {};
    };
  };

  public func listCalls(state : Types.ChatState, conversationId : Nat) : [Types.CallRecord] {
    state.calls.values().toArray().filter(func c = c.conversationId == conversationId);
  };

  // ---- WebRTC signaling ----

  public func sendSignal(state : Types.ChatState, conversationId : Nat, from : Types.UserId, to : Types.UserId, kind : Types.SignalKind, payload : Text) : () {
    let id = state.nextSignalId;
    state.nextSignalId += 1;
    let sig : Types.SignalMessage = {
      id;
      conversationId;
      from;
      to;
      kind;
      payload;
      sentAt = Time.now();
    };
    let list = state.signals.get(conversationId) ?? List.empty<Types.SignalMessage>();
    list.add(sig);
    state.signals.add(conversationId, list);
  };

  public func pollSignals(state : Types.ChatState, conversationId : Nat, forUser : Types.UserId) : [Types.SignalMessage] {
    switch (state.signals.get(conversationId)) {
      case (?list) {
        list.toArray().filter(func s = s.to == forUser);
      };
      case null { [] };
    };
  };
};
