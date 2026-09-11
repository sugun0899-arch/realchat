import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import List "mo:core/List";

module {
  type UserId = Principal;
  type Timestamp = Int;

  type OnlineStatus = {
    #online;
    #offline;
    #away;
  };

  type Profile = {
    id : UserId;
    displayName : Text;
    avatar : ?Text;
    status : OnlineStatus;
    lastSeen : Timestamp;
  };

  type Conversation = {
    id : Nat;
    participantA : UserId;
    participantB : UserId;
    lastMessagePreview : Text;
    lastMessageAt : Timestamp;
    unreadA : Nat;
    unreadB : Nat;
  };

  type Message = {
    id : Nat;
    conversationId : Nat;
    sender : UserId;
    body : Text;
    sentAt : Timestamp;
    read : Bool;
  };

  type CallKind = {
    #video;
    #audio;
  };

  type CallStatus = {
    #ringing;
    #ongoing;
    #ended;
    #declined;
    #missed;
  };

  type CallRecord = {
    id : Nat;
    conversationId : Nat;
    caller : UserId;
    callee : UserId;
    kind : CallKind;
    status : CallStatus;
    startedAt : Timestamp;
    endedAt : ?Timestamp;
  };

  type SignalKind = {
    #offer;
    #answer;
    #iceCandidate;
  };

  type SignalMessage = {
    id : Nat;
    conversationId : Nat;
    from : UserId;
    to : UserId;
    kind : SignalKind;
    payload : Text;
    sentAt : Timestamp;
  };

  type ChatState = {
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

  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    chatState : ChatState;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      chatState = {
        profiles = Map.empty();
        conversations = Map.empty();
        messages = Map.empty();
        calls = Map.empty();
        signals = Map.empty();
        var nextConversationId = 0;
        var nextMessageId = 0;
        var nextCallId = 0;
        var nextSignalId = 0;
      };
    };
  };
};
