'use client';

import { useRef, useState, useCallback } from 'react';
import { Send, Smile, Paperclip, Mic, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/lib/socket';
import { uploadApi } from '@/lib/api';
import toast from 'react-hot-toast';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function MessageInput() {
  const { activePeer, replyTo, setReplyTo, addMessage } = useChatStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(
    (start: boolean) => {
      if (!activePeer) return;
      getSocket()?.emit(start ? 'typing:start' : 'typing:stop', {
        receiverId: activePeer.id,
      });
    },
    [activePeer]
  );

  const onChange = (value: string) => {
    setText(value);
    emitTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = () => {
    if (!activePeer || (!text.trim() && !replyTo)) return;
    if (!text.trim()) return;

    const payload = {
      receiverId: activePeer.id,
      content: text.trim(),
      type: 'TEXT',
      replyToId: replyTo?.id,
    };

    getSocket()?.emit('message:send', payload, (res: { success: boolean; message?: unknown }) => {
      if (res.success && res.message) {
        addMessage(res.message as never);
      }
    });

    setText('');
    setReplyTo(null);
    setShowEmoji(false);
    emitTyping(false);
  };

  const handleFile = async (file: File) => {
    if (!activePeer) return;
    setUploading(true);
    try {
      const res = await uploadApi.file(file);
      const { url, fileName, mimeType, size } = res.data.data.file;

      let type = 'DOCUMENT';
      if (mimeType.startsWith('image/gif')) type = 'GIF';
      else if (mimeType.startsWith('image/')) type = 'IMAGE';
      else if (mimeType.startsWith('video/')) type = 'VIDEO';
      else if (mimeType.startsWith('audio/')) type = 'AUDIO';

      getSocket()?.emit(
        'message:send',
        {
          receiverId: activePeer.id,
          type,
          fileUrl: url,
          fileName,
          fileSize: size,
          mimeType,
          content: text.trim() || undefined,
          replyToId: replyTo?.id,
        },
        (r: { success: boolean; message?: unknown }) => {
          if (r.success && r.message) addMessage(r.message as never);
        }
      );
      setText('');
      setReplyTo(null);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (!activePeer) return;
        setUploading(true);
        try {
          const res = await uploadApi.file(file);
          const { url, fileName, mimeType, size } = res.data.data.file;
          getSocket()?.emit(
            'message:send',
            {
              receiverId: activePeer.id,
              type: 'VOICE',
              fileUrl: url,
              fileName,
              fileSize: size,
              mimeType,
            },
            (r: { success: boolean; message?: unknown }) => {
              if (r.success && r.message) addMessage(r.message as never);
            }
          );
        } finally {
          setUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  if (!activePeer) return null;

  return (
    <div
      className="border-t border-[var(--card-border)] bg-white px-3 pb-2 pt-2 md:pb-3"
    >
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[var(--muted)]">
              Reply to {replyTo.sender?.displayName || 'message'}
            </p>
            <p className="truncate text-[var(--muted)]">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="shrink-0 rounded-full p-1 hover:bg-black/[0.04]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-1.5 rounded-2xl bg-black/[0.04] px-2 py-1">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.06]"
        >
          <Smile className="h-5 w-5" />
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/[0.06]"
          disabled={uploading}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message..."
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-[var(--muted)]"
        />

        {text.trim() ? (
          <button
            onClick={send}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition hover:bg-[#333] active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
              recording
                ? 'bg-[var(--danger)] text-white'
                : 'bg-[#1a1a1a] text-white hover:bg-[#333]'
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>

      {showEmoji && (
        <div className="pt-2">
          <div className="flex justify-center">
            <EmojiPicker
              onEmojiClick={(e) => setText((t) => t + e.emoji)}
              width={320}
              height={350}
            />
          </div>
        </div>
      )}
    </div>
  );
}
