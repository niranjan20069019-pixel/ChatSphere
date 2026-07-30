'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
} from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { getSocket } from '@/lib/socket';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export function CallOverlay() {
  const {
    status,
    peer,
    peerId,
    type,
    callId,
    isMuted,
    isCameraOff,
    isScreenSharing,
    localStream,
    remoteStream,
    setActive,
    endCall,
    toggleMute,
    toggleCamera,
    setLocalStream,
    setRemoteStream,
    setScreenSharing,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onAnswered = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(answer);
      setActive();
    };

    const onRejected = () => endCall();
    const onEnded = () => endCall();

    const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    };

    socket.on('call:answered', onAnswered);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:ice-candidate', onIce);

    return () => {
      socket.off('call:answered', onAnswered);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:ice-candidate', onIce);
    };
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && peerId) {
        getSocket()?.emit('call:ice-candidate', {
          peerId,
          candidate: e.candidate,
        });
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO',
      });
      setLocalStream(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      // Note: offer would come from caller via signaling - simplified accept
      setActive();
      getSocket()?.emit('call:answer', {
        callId,
        callerId: peerId,
        answer: null,
      });
    } catch {
      endCall();
    }
  };

  const rejectCall = () => {
    getSocket()?.emit('call:reject', { callId, callerId: peerId });
    endCall();
  };

  const hangUp = () => {
    getSocket()?.emit('call:end', { callId, peerId });
    pcRef.current?.close();
    endCall();
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      setScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && track) await sender.replaceTrack(track);
      setScreenSharing(true);
      track.onended = () => setScreenSharing(false);
    } catch {
      // user cancelled
    }
  };

  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <div className="glass relative mx-4 w-full max-w-2xl overflow-hidden rounded-3xl p-6">
          {type === 'VIDEO' && status === 'active' && (
            <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl bg-surface-900">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 h-28 w-40 rounded-xl object-cover shadow-lg"
              />
            </div>
          )}

          <div className="flex flex-col items-center gap-4 py-6">
            <Avatar src={peer?.avatarUrl} name={peer?.displayName || 'User'} size="xl" />
            <div className="text-center">
              <h3 className="text-xl font-semibold">{peer?.displayName}</h3>
              <p className="text-sm text-[var(--muted)] capitalize">
                {status === 'ringing' && 'Incoming call...'}
                {status === 'calling' && 'Calling...'}
                {status === 'active' && `${type?.toLowerCase()} call`}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              {status === 'ringing' ? (
                <>
                  <Button
                    onClick={acceptCall}
                    className="rounded-full bg-emerald-600 px-6 hover:bg-emerald-500"
                  >
                    <Phone className="h-5 w-5" /> Accept
                  </Button>
                  <Button onClick={rejectCall} variant="danger" className="rounded-full px-6">
                    <PhoneOff className="h-5 w-5" /> Decline
                  </Button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  {type === 'VIDEO' && (
                    <button
                      onClick={toggleCamera}
                      className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                    >
                      {isCameraOff ? (
                        <VideoOff className="h-5 w-5" />
                      ) : (
                        <Video className="h-5 w-5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={toggleScreenShare}
                    className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                  >
                    {isScreenSharing ? (
                      <MonitorOff className="h-5 w-5" />
                    ) : (
                      <Monitor className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={hangUp}
                    className="rounded-full bg-red-600 p-3 transition hover:bg-red-500"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export async function initiateCall(peerId: string, peer: { id: string; displayName: string; avatarUrl?: string | null; username: string }, type: 'VOICE' | 'VIDEO') {
  const { startCall, setLocalStream } = useCallStore.getState();
  startCall(peer as never, type);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'VIDEO',
    });
    setLocalStream(stream);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    getSocket()?.emit('call:initiate', {
      calleeId: peerId,
      type,
      offer,
    });
  } catch {
    useCallStore.getState().endCall();
  }
}
