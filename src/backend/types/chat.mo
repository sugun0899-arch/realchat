import Map "mo:core/Map";
import List "mo:core/List";

module {
  public type UserId = Principal;
  public type Timestamp = Int; // nanoseconds since epoch (Time.now())

  public type OnlineStatus = {
    #online;
    #offline;
    #away;
  };

  // A registered user's public profile (directory entry).
  public type Profile = {
    id : UserId;
    displayName : Text;
    avatar : ?Text;
    status : OnlineStatus;
    lastSeen : Timestamp;
  };

  // A one-on-one conversation between two users.
  public type Conversation = {
    id : Nat;
    participantA : UserId;
    participantB : UserId;
    lastMessagePreview : Text;
    lastMessageAt : Timestamp;
    unreadA : Nat; // unread count for participantA
    unreadB : Nat; // unread count for participantB
  };

  // A single chat message within a conversation.
  public type Message = {
    id : Nat;
    conversationId : Nat;
    sender : UserId;
    body : Text;
    sentAt : Timestamp;
    read : Bool;
  };

  public type CallKind = {
    #video;
    #audio;
  };

  public type CallStatus = {
    #ringing;
    #ongoing;
    #ended;
    #declined;
    #missed;
  };

  // A call record left in conversation history.
  public type CallRecord = {
    id : Nat;
    conversationId : Nat;
    caller : UserId;
    callee : UserId;
    kind : CallKind;
    status : CallStatus;
    startedAt : Timestamp;
    endedAt : ?Timestamp;
  };

  public type SignalKind = {
    #offer;
    #answer;
    #iceCandidate;
  };

  // A WebRTC signaling message exchanged between two users.
  public type SignalMessage = {
    id : Nat;
    conversationId : Nat;
    from : UserId;
    to : UserId;
    kind : SignalKind;
    payload : Text;
    sentAt : Timestamp;
  };

  // Shared stable state for the chat domain, passed by reference to the mixin.
  public type ChatState = {
    profiles : Map.Map<UserId, Profile>;
    conversations : Map.Map<Nat, Conversation>;
    messages : Map.Map<Nat, List.List<Message>>;
    calls : Map.Map<Nat, CallRecord>;
    signals : Map.Map<Nat, List.List<SignalMessage>>;
    var nextConversationId : Nat;
    var nextMessageId : Nat;
    var nextCallId : Nat;
    var nextSignalId : Nat;
  };
};
