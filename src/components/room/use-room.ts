"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Peer-to-peer WebRTC (DTLS-SRTP encrypted) with signalling over short
 * polling, so it works behind most proxies without websockets. A small mesh
 * suits consults (doctor, patient, a family member, an interpreter). For
 * larger calls or strict networks, configure TURN (TURN_URLS) or swap in a
 * managed video SDK behind the same interface.
 */

export type Peer = { peerId: string; role: string; displayName: string; media: { audio: boolean; video: boolean; screen?: boolean; lowBandwidth?: boolean } };
export type ChatMessage = { id: number; senderRole: string; senderName: string; body: string; documentId: string | null; kind: string; createdAt: string; mine: boolean };
export type RoomState = { status: string; recording: { doctor?: boolean; patient?: boolean; startedAt?: string; stoppedAt?: string; requestedBy?: string } | null; mode: string; endedAt: string | null; outcome: string | null; runningLate: number; identityConfirmed: boolean };
export type Queue = { position: number; doctorBusy: boolean; estimatedMinutes: number; runningLate: number } | null;
export type Caption = { from: string; name: string; text: string; at: number };

type Signal = { id: number; from: string; kind: string; payload: unknown };

export function useRoom(apptId: string, opts: { onCaption?: (c: Caption) => void } = {}) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<RoomState | null>(null);
  const [queue, setQueue] = useState<Queue>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connStates, setConnStates] = useState<Record<string, RTCPeerConnectionState>>({});
  const [error, setError] = useState<string | null>(null);

  const localStream = useRef<MediaStream | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const channels = useRef(new Map<string, RTCDataChannel>());
  const pendingCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const iceServers = useRef<RTCIceServer[]>([]);
  const lastSignal = useRef(0);
  const lastMessage = useRef(0);
  const me = useRef<string | null>(null);
  const names = useRef(new Map<string, string>());
  const stopped = useRef(false);
  const captionCb = useRef(opts.onCaption);
  useEffect(() => {
    captionCb.current = opts.onCaption;
  });

  const send = useCallback(
    async (to: string, kind: string, payload: unknown) => {
      if (!me.current) return;
      await fetch(`/api/rooms/${apptId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: me.current, to, kind, payload }),
      }).catch(() => {});
    },
    [apptId],
  );

  const setupChannel = useCallback((peer: string, ch: RTCDataChannel) => {
    channels.current.set(peer, ch);
    ch.onmessage = (e) => {
      try {
        const msg = JSON.parse(String(e.data)) as { type: string; text?: string };
        if (msg.type === "caption" && msg.text) captionCb.current?.({ from: peer, name: names.current.get(peer) ?? "", text: msg.text, at: Date.now() });
      } catch {
        /* ignore */
      }
    };
  }, []);

  const createPc = useCallback(
    (peer: string, initiator: boolean) => {
      const existing = pcs.current.get(peer);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: iceServers.current });
      pcs.current.set(peer, pc);
      for (const track of localStream.current?.getTracks() ?? []) pc.addTrack(track, localStream.current!);
      // The caller always offers audio and video, even when it isn't sending one
      // of them (audio-only or chat-only joiners), so the other side can send
      // and a screen can be shared later without renegotiating.
      if (initiator) {
        if (!localStream.current?.getAudioTracks().length) pc.addTransceiver("audio", { direction: "sendrecv" });
        if (!localStream.current?.getVideoTracks().length) pc.addTransceiver("video", { direction: "sendrecv" });
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) void send(peer, "candidate", e.candidate.toJSON());
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        setRemoteStreams((s) => ({ ...s, [peer]: stream }));
      };
      pc.onconnectionstatechange = () => {
        setConnStates((s) => ({ ...s, [peer]: pc.connectionState }));
        if (pc.connectionState === "failed" && initiator) {
          pc.restartIce();
          void pc.createOffer({ iceRestart: true }).then(async (o) => {
            await pc.setLocalDescription(o);
            await send(peer, "description", pc.localDescription);
          });
        }
      };
      if (initiator) {
        setupChannel(peer, pc.createDataChannel("meta"));
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await send(peer, "description", pc.localDescription);
        })();
      } else {
        pc.ondatachannel = (e) => setupChannel(peer, e.channel);
      }
      return pc;
    },
    [send, setupChannel],
  );

  const closePeer = useCallback((peer: string) => {
    pcs.current.get(peer)?.close();
    pcs.current.delete(peer);
    channels.current.delete(peer);
    setRemoteStreams((s) => {
      const n = { ...s };
      delete n[peer];
      return n;
    });
  }, []);

  const handleSignal = useCallback(
    async (s: Signal) => {
      if (s.kind === "bye") return closePeer(s.from);
      if (s.kind === "description") {
        const desc = s.payload as RTCSessionDescriptionInit;
        const pc = pcs.current.get(s.from) ?? createPc(s.from, false);
        await pc.setRemoteDescription(desc);
        for (const c of pendingCandidates.current.get(s.from) ?? []) await pc.addIceCandidate(c).catch(() => {});
        pendingCandidates.current.delete(s.from);
        if (desc.type === "offer") {
          for (const tr of pc.getTransceivers()) if (tr.direction === "recvonly") tr.direction = "sendrecv";
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await send(s.from, "description", pc.localDescription);
        }
      } else if (s.kind === "candidate") {
        const pc = pcs.current.get(s.from);
        if (pc?.remoteDescription) await pc.addIceCandidate(s.payload as RTCIceCandidateInit).catch(() => {});
        else pendingCandidates.current.set(s.from, [...(pendingCandidates.current.get(s.from) ?? []), s.payload as RTCIceCandidateInit]);
      }
    },
    [closePeer, createPc, send],
  );

  const join = useCallback(
    async (stream: MediaStream | null) => {
      localStream.current = stream;
      const res = await fetch(`/api/rooms/${apptId}/join`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "join_failed");
        return null;
      }
      iceServers.current = json.iceServers;
      me.current = json.peerId;
      setPeerId(json.peerId);
      return json as { peerId: string; role: string; displayName: string };
    },
    [apptId],
  );

  // Poll loop.
  useEffect(() => {
    if (!peerId) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped.current) return;
      try {
        const res = await fetch(`/api/rooms/${apptId}/poll?peer=${peerId}&s=${lastSignal.current}&m=${lastMessage.current}`, { cache: "no-store" });
        if (res.status === 409) {
          setError("rejoin");
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { signals: Signal[]; peers: Peer[]; messages: ChatMessage[]; state: RoomState; queue: Queue };
          for (const p of data.peers) names.current.set(p.peerId, p.displayName);
          setPeers(data.peers);
          setState(data.state);
          setQueue(data.queue);
          // New peers: the one with the smaller id starts the call.
          for (const p of data.peers) {
            if (!pcs.current.has(p.peerId) && peerId < p.peerId && localStream.current !== undefined) createPc(p.peerId, true);
          }
          for (const id of [...pcs.current.keys()]) if (!data.peers.some((p) => p.peerId === id)) closePeer(id);
          for (const s of data.signals) {
            lastSignal.current = Math.max(lastSignal.current, s.id);
            await handleSignal(s);
          }
          if (data.messages.length) {
            lastMessage.current = data.messages[data.messages.length - 1]!.id;
            setMessages((m) => [...m, ...data.messages]);
          }
        }
      } catch {
        /* network blip: try again */
      }
      const fast = [...pcs.current.values()].some((pc) => pc.connectionState !== "connected");
      timer = setTimeout(tick, fast ? 900 : 2000);
    };
    void tick();
    const leave = () => navigator.sendBeacon?.(`/api/rooms/${apptId}/leave`, new Blob([JSON.stringify({ peer: peerId })], { type: "application/json" }));
    window.addEventListener("pagehide", leave);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, [apptId, peerId, createPc, closePeer, handleSignal]);

  const leave = useCallback(async () => {
    stopped.current = true;
    for (const id of [...pcs.current.keys()]) closePeer(id);
    localStream.current?.getTracks().forEach((t) => t.stop());
    if (me.current) await fetch(`/api/rooms/${apptId}/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peer: me.current }) }).catch(() => {});
  }, [apptId, closePeer]);

  /** Swap the outgoing video (camera ↔ screen, or none for audio-only). */
  const replaceVideo = useCallback(async (track: MediaStreamTrack | null) => {
    for (const pc of pcs.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video" || (s.track === null && pc.getTransceivers().some((t) => t.sender === s && t.receiver.track.kind === "video")));
      if (sender) await sender.replaceTrack(track);
    }
  }, []);

  const broadcast = useCallback((data: unknown) => {
    const s = JSON.stringify(data);
    for (const ch of channels.current.values()) if (ch.readyState === "open") ch.send(s);
  }, []);

  const reportMedia = useCallback(
    (media: Peer["media"]) => {
      if (!me.current) return;
      void fetch(`/api/rooms/${apptId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peer: me.current, media }) });
    },
    [apptId],
  );

  /** Network quality from WebRTC stats: true when the call is struggling. */
  const checkQuality = useCallback(async () => {
    let weak = false;
    for (const pc of pcs.current.values()) {
      const stats = await pc.getStats();
      stats.forEach((r) => {
        if (r.type === "outbound-rtp" && r.kind === "video" && r.qualityLimitationReason === "bandwidth") weak = true;
        if (r.type === "remote-inbound-rtp" && typeof r.fractionLost === "number" && r.fractionLost > 0.08) weak = true;
        if (r.type === "candidate-pair" && r.state === "succeeded" && typeof r.currentRoundTripTime === "number" && r.currentRoundTripTime > 0.7) weak = true;
        if (r.type === "candidate-pair" && r.state === "succeeded" && typeof r.availableOutgoingBitrate === "number" && r.availableOutgoingBitrate < 150_000) weak = true;
      });
    }
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (conn?.effectiveType && ["slow-2g", "2g"].includes(conn.effectiveType)) weak = true;
    return weak;
  }, []);

  return { peerId, peers, messages, state, queue, remoteStreams, connStates, error, setError, join, leave, replaceVideo, broadcast, reportMedia, checkQuality, localStream };
}
