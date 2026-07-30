import { create } from 'zustand';
import { CallState, User } from '@/types';

interface CallStore extends CallState {
  startCall: (peer: User, type: 'VOICE' | 'VIDEO') => void;
  receiveCall: (data: {
    callId: string;
    caller: User;
    type: 'VOICE' | 'VIDEO';
  }) => void;
  setActive: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setScreenSharing: (v: boolean) => void;
}

const initial: CallState = {
  status: 'idle',
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  localStream: null,
  remoteStream: null,
};

export const useCallStore = create<CallStore>((set) => ({
  ...initial,

  startCall: (peer, type) =>
    set({
      status: 'calling',
      peer,
      peerId: peer.id,
      type,
      isMuted: false,
      isCameraOff: type === 'VOICE',
    }),

  receiveCall: ({ callId, caller, type }) =>
    set({
      status: 'ringing',
      callId,
      peer: caller,
      peerId: caller.id,
      type,
    }),

  setActive: () => set({ status: 'active' }),

  endCall: () =>
    set((s) => {
      s.localStream?.getTracks().forEach((t) => t.stop());
      s.remoteStream?.getTracks().forEach((t) => t.stop());
      return { ...initial };
    }),

  toggleMute: () =>
    set((s) => {
      s.localStream?.getAudioTracks().forEach((t) => {
        t.enabled = s.isMuted;
      });
      return { isMuted: !s.isMuted };
    }),

  toggleCamera: () =>
    set((s) => {
      s.localStream?.getVideoTracks().forEach((t) => {
        t.enabled = s.isCameraOff;
      });
      return { isCameraOff: !s.isCameraOff };
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setScreenSharing: (v) => set({ isScreenSharing: v }),
}));
