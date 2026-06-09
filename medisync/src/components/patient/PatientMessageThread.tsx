'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  patient_id: string
  sender_id: string
  sender_role: 'clinician' | 'patient'
  body: string
  is_read: boolean
  created_at: string
}

interface Props {
  patientId: string
  userId: string
}

export function PatientMessageThread({ patientId, userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()

    async function loadAndMarkRead() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/messages?patientId=${patientId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load messages')
        setMessages(json.messages ?? [])
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('patient_id', patientId)
          .eq('sender_role', 'clinician')
          .eq('is_read', false)
          .then(() => {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load messages')
      } finally {
        setLoading(false)
      }
    }
    loadAndMarkRead()

    const channel = supabase
      .channel(`patient-messages-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            const optimisticIdx = prev.findIndex(
              (m) => m.id.startsWith('optimistic-') && m.body === newMsg.body
            )
            if (optimisticIdx !== -1) {
              return prev.map((m, i) => (i === optimisticIdx ? newMsg : m))
            }
            return [...prev, newMsg]
          })
          if (newMsg.sender_role === 'clinician') {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending) return

    setSending(true)
    setDraft('')

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      patient_id: patientId,
      sender_id: userId,
      sender_role: 'patient',
      body,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          senderId: userId,
          senderRole: 'patient',
          message: body,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to send')
      }
      const { message: confirmed } = await res.json()
      setMessages((prev) => {
        if (prev.some((m) => m.id === confirmed.id)) {
          return prev.filter((m) => m.id !== optimistic.id)
        }
        return prev.map((m) => (m.id === optimistic.id ? confirmed : m))
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(body)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--ms-primary)' }} />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: 'calc(100vh - 56px - env(safe-area-inset-top) - 49px - env(safe-area-inset-bottom))',
        backgroundColor: 'var(--ms-page)',
      }}
    >
      {/* Thread header */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          backgroundColor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--ms-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="size-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--ms-primary)' }}
          >
            <span className="text-white font-semibold" style={{ fontSize: 11 }}>CT</span>
          </div>
          <div>
            <p className="font-semibold leading-tight" style={{ fontSize: 14, color: 'var(--ms-text-primary)' }}>
              Your Care Team
            </p>
            <p style={{ fontSize: 12, color: 'var(--ms-text-tertiary)' }}>Secure message thread</p>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {error ? (
          <div className="text-center pt-10">
            <p className="text-sm" style={{ color: 'var(--ms-critical)' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs underline"
              style={{ color: 'var(--ms-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-10" style={{ color: 'var(--ms-text-tertiary)' }}>
            <MessageCircle className="size-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1 text-center px-8">
              Your care team will reach out here. You can also send them a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_role === 'patient'
            const isOptimistic = msg.id.startsWith('optimistic-')
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                {!isMine && (
                  <div
                    className="size-6 rounded-full flex items-center justify-center font-bold shrink-0"
                    style={{
                      backgroundColor: 'rgba(26,122,94,0.08)',
                      border: '1px solid rgba(26,122,94,0.15)',
                      color: 'var(--ms-primary)',
                      fontSize: 9,
                    }}
                  >
                    Dr
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                    isMine ? (isOptimistic ? 'opacity-60' : '') : ''
                  }`}
                  style={
                    isMine
                      ? {
                          backgroundColor: 'var(--ms-primary)',
                          color: '#fff',
                          borderBottomRightRadius: 4,
                        }
                      : {
                          backgroundColor: 'var(--ms-surface)',
                          color: 'var(--ms-text-primary)',
                          border: '1px solid var(--ms-border)',
                          borderBottomLeftRadius: 4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }
                  }
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.body}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${isMine ? 'text-right' : ''}`}
                    style={{ color: isMine ? 'rgba(255,255,255,0.55)' : 'var(--ms-text-tertiary)' }}
                  >
                    {isOptimistic
                      ? 'Sending…'
                      : formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          backgroundColor: 'var(--ms-surface)',
          borderTop: '1px solid var(--ms-border)',
        }}
      >
        {error && !loading && (
          <p className="text-xs mb-2" style={{ color: 'var(--ms-critical)' }}>{error}</p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your care team…"
            rows={2}
            maxLength={2000}
            className="flex-1 resize-none text-sm px-3 py-2 rounded-xl transition-colors focus:outline-none"
            style={{
              border: '1px solid var(--ms-border-strong)',
              backgroundColor: 'var(--ms-surface-raised)',
              color: 'var(--ms-text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ms-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,122,94,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--ms-border-strong)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="size-9 shrink-0 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--ms-primary)' }}
            aria-label="Send"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'var(--ms-text-tertiary)' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
