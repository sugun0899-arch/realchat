import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useAcceptCall,
  useDeclineCall,
  useEndCall,
  useGetConversation,
  useListCalls,
  useListUsers,
  useMyProfile,
  usePollSignals,
  useSendSignal,
  useStartCall,
} from "@/hooks/useQueries";
import { shortPrincipal } from "@/lib/format";
import { CallKind, CallStatus, SignalKind } from "@/types";
import type { Principal } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Video,
  VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "outgoing" | "incoming" | "ongoing" | "ended";

export function CallPage() {
  const { conversationId: conversationIdParam } = useParams({ strict: false });
  const navigate = useNavigate();

  const conversationId = useMemo(() => {
    if (!conversationIdParam) return null;
    try {
      return BigInt(conversationIdParam);
    } catch {
      return null;
    }
  }, [conversationIdParam]);

  const { data: profile } = useMyProfile();
  const { data: conversation } = useGetConversation(conversationId);
  const { data: calls } = useListCalls(conversationId);
  const { data: signals } = usePollSignals(conversationId);
  const { data: users } = useListUsers();

  const startCallMutation = useStartCall();
  const acceptCallMutation = useAcceptCall();
  const declineCallMutation = useDeclineCall();
  const endCallMutation = useEndCall();
  const sendSignalMutation = useSendSignal();

  const [phase, setPhase] = useState<Phase>("idle");
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const processedSignalsRef = useRef<Set<bigint>>(new Set());
  const pendingOfferRef = useRef<string | null>(null);
  const callIdRef = useRef<bigint | null>(null);
  const isCallerRef = useRef(false);
  const startedRef = useRef(false);
  const setupInProgressRef = useRef(false);
  const peerPrincipalRef = useRef<Principal | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const attachLocalVideo = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const attachRemoteVideo = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  }, []);

  const me = profile?.id;
  const peerPrincipal =
    conversation && me
      ? conversation.participantA.toString() === me.toString()
        ? conversation.participantB
        : conversation.participantA
      : undefined;

  const peerProfile = users?.find(
    (u) => peerPrincipal && u.id.toString() === peerPrincipal.toString(),
  );
  const peerName =
    peerProfile?.displayName ||
    (peerPrincipal ? shortPrincipal(peerPrincipal) : "…");

  const isParticipant =
    !!conversation &&
    !!me &&
    (conversation.participantA.toString() === me.toString() ||
      conversation.participantB.toString() === me.toString());

  useEffect(() => {
    if (peerPrincipal) peerPrincipalRef.current = peerPrincipal;
  }, [peerPrincipal]);

  const goBack = useCallback(() => {
    navigate({
      to: "/conversations/$conversationId",
      params: { conversationId: conversationIdParam ?? "" },
    });
  }, [navigate, conversationIdParam]);

  const sendSignal = useCallback(
    (kind: SignalKind, payload: string) => {
      const peer = peerPrincipalRef.current;
      if (!peer || conversationId === null) return;
      sendSignalMutation.mutate({ conversationId, to: peer, kind, payload });
    },
    [conversationId, sendSignalMutation],
  );

  const teardown = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStreamReady(false);
    setRemoteStreamReady(false);
  }, []);

  const processOffer = useCallback(
    async (payload: string) => {
      const pc = peerRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(JSON.parse(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(SignalKind.answer, JSON.stringify(answer));
      } catch {
        // ignore malformed offer
      }
    },
    [sendSignal],
  );

  const setupCaller = useCallback(async () => {
    if (peerRef.current || setupInProgressRef.current) return;
    setupInProgressRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStreamReady(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      for (const t of stream.getTracks()) pc.addTrack(t, stream);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(SignalKind.iceCandidate, JSON.stringify(e.candidate));
        }
      };
      pc.ontrack = (e) => {
        remoteStreamRef.current = e.streams[0];
        setRemoteStreamReady(true);
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(SignalKind.offer, JSON.stringify(offer));
    } catch {
      setError("Could not access your camera or microphone.");
    } finally {
      setupInProgressRef.current = false;
    }
  }, [sendSignal]);

  const setupCallee = useCallback(async () => {
    if (peerRef.current || setupInProgressRef.current) return;
    setupInProgressRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStreamReady(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      for (const t of stream.getTracks()) pc.addTrack(t, stream);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(SignalKind.iceCandidate, JSON.stringify(e.candidate));
        }
      };
      pc.ontrack = (e) => {
        remoteStreamRef.current = e.streams[0];
        setRemoteStreamReady(true);
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
      };
      if (pendingOfferRef.current) void processOffer(pendingOfferRef.current);
    } catch {
      setError("Could not access your camera or microphone.");
    } finally {
      setupInProgressRef.current = false;
    }
  }, [sendSignal, processOffer]);

  // Determine role and auto-start the call when arriving as the initiator.
  useEffect(() => {
    if (!conversation || !me || calls === undefined) return;
    const active = calls.find(
      (c) => c.status === CallStatus.ringing || c.status === CallStatus.ongoing,
    );
    if (active) {
      callIdRef.current = active.id;
      isCallerRef.current = active.caller.toString() === me.toString();
      if (active.status === CallStatus.ongoing) {
        setPhase("ongoing");
        if (isCallerRef.current) void setupCaller();
        else void setupCallee();
      } else {
        setPhase(isCallerRef.current ? "outgoing" : "incoming");
        if (isCallerRef.current) void setupCaller();
      }
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      startCallMutation.mutate(
        { conversationId: conversationId!, kind: CallKind.video },
        {
          onSuccess: (callId) => {
            callIdRef.current = callId;
            isCallerRef.current = true;
            setPhase("outgoing");
            void setupCaller();
          },
        },
      );
    }
  }, [
    conversation,
    me,
    calls,
    conversationId,
    startCallMutation,
    setupCaller,
    setupCallee,
  ]);

  // Process incoming signaling messages from the peer.
  useEffect(() => {
    if (!signals) return;
    const peer = peerPrincipalRef.current;
    if (!peer) return;
    for (const sig of signals) {
      if (processedSignalsRef.current.has(sig.id)) continue;
      if (sig.from.toString() !== peer.toString()) continue;
      if (sig.kind === SignalKind.offer) {
        processedSignalsRef.current.add(sig.id);
        pendingOfferRef.current = sig.payload;
        if (peerRef.current) void processOffer(sig.payload);
      } else if (sig.kind === SignalKind.answer) {
        processedSignalsRef.current.add(sig.id);
        if (peerRef.current) {
          void peerRef.current.setRemoteDescription(JSON.parse(sig.payload));
        }
      } else if (sig.kind === SignalKind.iceCandidate) {
        processedSignalsRef.current.add(sig.id);
        if (peerRef.current) {
          void peerRef.current.addIceCandidate(JSON.parse(sig.payload));
        }
      }
    }
  }, [signals, processOffer]);

  // Detect when the remote party ends, declines, or misses the call.
  useEffect(() => {
    if (phase !== "ongoing" && phase !== "outgoing" && phase !== "incoming")
      return;
    if (callIdRef.current === null) return;
    const active = calls?.find((c) => c.id === callIdRef.current);
    if (!active) return;
    if (
      active.status === CallStatus.ended ||
      active.status === CallStatus.declined ||
      active.status === CallStatus.missed
    ) {
      teardown();
      setPhase("ended");
    }
  }, [calls, phase, teardown]);

  // Clean up media and peer connection on unmount.
  useEffect(() => {
    return () => {
      peerRef.current?.close();
      peerRef.current = null;
      for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
      localStreamRef.current = null;
    };
  }, []);

  function handleAccept() {
    const callId = callIdRef.current;
    if (callId === null) return;
    acceptCallMutation.mutate(callId, {
      onSuccess: () => {
        setPhase("ongoing");
        void setupCallee();
      },
    });
  }

  function handleDecline() {
    const callId = callIdRef.current;
    if (callId !== null) {
      declineCallMutation.mutate(callId);
    }
    teardown();
    goBack();
  }

  function handleEnd() {
    const callId = callIdRef.current;
    if (callId !== null) {
      endCallMutation.mutate(callId);
    }
    teardown();
    goBack();
  }

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micMuted;
    for (const t of stream.getAudioTracks()) t.enabled = !next;
    setMicMuted(next);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    for (const t of stream.getVideoTracks()) t.enabled = !next;
    setCameraOff(next);
  }

  if (profile === undefined || conversation === undefined) {
    return (
      <div
        data-ocid="call_loading_state"
        className="flex h-full items-center justify-center bg-[#0b0d12]"
      >
        <Loader2 className="size-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!conversation || !me || !isParticipant) {
    return (
      <PageShell
        title="Video call"
        description="Live call viewport"
        data-ocid="page_call"
      >
        <EmptyState
          icon={Video}
          title="Conversation not found"
          description="This conversation is unavailable or you are not a participant."
          action={
            <Button type="button" variant="outline" onClick={goBack}>
              Back to conversations
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell
        title="Video call"
        description="Live call viewport"
        data-ocid="page_call"
      >
        <EmptyState
          icon={VideoOff}
          title="Camera unavailable"
          description={error}
          action={
            <Button type="button" variant="outline" onClick={goBack}>
              Back to conversation
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (phase === "ended") {
    return (
      <PageShell
        title="Video call"
        description="Live call viewport"
        data-ocid="page_call"
      >
        <EmptyState
          icon={PhoneOff}
          title="Call ended"
          description={`The call with ${peerName} has ended.`}
          action={
            <Button type="button" onClick={goBack}>
              Back to conversation
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (phase === "outgoing") {
    return (
      <div
        data-ocid="call_outgoing"
        className="relative flex h-full flex-col items-center justify-center gap-6 bg-[#0b0d12] px-6"
      >
        <Avatar className="size-24 md:size-32">
          {peerProfile?.avatar ? (
            <AvatarImage src={peerProfile.avatar} alt={peerName} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
            {peerName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-white">
            {peerName}
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-white/70">
            <PhoneOutgoing className="size-4 animate-pulse" />
            Calling…
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="size-14 rounded-full"
            onClick={handleEnd}
            data-ocid="call_end_button"
            aria-label="End call"
          >
            <PhoneOff className="size-6" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "incoming") {
    return (
      <div
        data-ocid="call_incoming"
        className="relative flex h-full flex-col items-center justify-center gap-6 bg-[#0b0d12] px-6"
      >
        <Avatar className="size-24 md:size-32">
          {peerProfile?.avatar ? (
            <AvatarImage src={peerProfile.avatar} alt={peerName} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
            {peerName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-white">
            {peerName}
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-white/70">
            <PhoneIncoming className="size-4 animate-pulse" />
            Incoming video call
          </p>
        </div>
        <div className="flex gap-6">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="size-14 rounded-full"
            onClick={handleDecline}
            data-ocid="call_decline_button"
            aria-label="Decline call"
          >
            <PhoneOff className="size-6" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="size-14 rounded-full bg-[#22c55e] text-white hover:bg-[#16a34a]"
            onClick={handleAccept}
            data-ocid="call_accept_button"
            aria-label="Accept call"
          >
            <Phone className="size-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Ongoing call viewport
  return (
    <div
      data-ocid="call_viewport"
      className="relative h-full w-full overflow-hidden bg-[#0b0d12]"
    >
      <video
        ref={attachRemoteVideo}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <track kind="captions" />
      </video>
      {!remoteStreamReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Waiting for {peerName}…</p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {peerProfile?.avatar ? (
              <AvatarImage src={peerProfile.avatar} alt={peerName} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {peerName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white">{peerName}</p>
            <p className="text-xs text-white/70">Live</p>
          </div>
        </div>
        <span className="rounded-full bg-red-500/90 px-2.5 py-1 text-xs font-medium text-white">
          REC
        </span>
      </div>

      <div className="absolute bottom-24 right-4 h-40 w-28 overflow-hidden rounded-xl border border-white/20 bg-black/40 md:bottom-28 md:h-56 md:w-40">
        <video
          ref={attachLocalVideo}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        >
          <track kind="captions" />
        </video>
        {!localStreamReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3 md:gap-4">
        <Button
          type="button"
          size="icon"
          className="size-12 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          onClick={toggleMic}
          data-ocid="call_mute_button"
          aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {micMuted ? (
            <MicOff className="size-5" />
          ) : (
            <Mic className="size-5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-12 rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          onClick={toggleCamera}
          data-ocid="call_camera_button"
          aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {cameraOff ? (
            <VideoOff className="size-5" />
          ) : (
            <Video className="size-5" />
          )}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="size-14 rounded-full"
          onClick={handleEnd}
          data-ocid="call_end_button"
          aria-label="End call"
        >
          <PhoneOff className="size-6" />
        </Button>
      </div>
    </div>
  );
}
