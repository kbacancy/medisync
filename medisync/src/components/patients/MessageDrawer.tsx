'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Loader2, MessageCircle } from 'lucide-react'
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
  patientName: string
  onClose: () => void
}

export function MessageDrawer({ patientId, patientName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyProfileId(user.id)
    })

    async function loadMessages() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/messages?patientId=${patientId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load messages')
        setMessages(json.messages ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load messages. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadMessages()

    const channel = supabase
      .channel(`messages-${patientId}`)
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
            // Standard dedup — already have this real ID (e.g. from handleSend swap)
            if (prev.some((m) => m.id === newMsg.id)) return prev
            // Replace a matching optimistic bubble in-place to avoid the flash duplicate
            const optimisticIdx = prev.findIndex(
              (m) => m.id.startsWith('optimistic-') && m.body === newMsg.body
            )
            if (optimisticIdx !== -1) {
              return prev.map((m, i) => (i === optimisticIdx ? newMsg : m))
            }
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  async function handleSend() {
    const body = draft.trim()
    if (!body || !myProfileId || sending) return

    setSending(true)
    setDraft('')

    // Optimistic insert
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      patient_id: patientId,
      sender_id: myProfileId,
      sender_role: 'clinician',
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
          senderId: myProfileId,
          senderRole: 'clinician',
          message: body,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to send')
      }
      const { message: confirmed } = await res.json()
      setMessages((prev) => {
        // If realtime already delivered the confirmed message, just drop the optimistic
        if (prev.some((m) => m.id === confirmed.id)) {
          return prev.filter((m) => m.id !== optimistic.id)
        }
        // Realtime hasn't fired yet — swap optimistic → confirmed in-place
        return prev.map((m) => (m.id === optimistic.id ? confirmed : m))
      })
    } catch (err) {
      // Revert optimistic insert and restore draft
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#0b5a4f] bg-[#0D6B5E]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">
                {patientName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{patientName}</p>
              <p className="text-white/60 text-[11px]">Secure message thread</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex justify-center pt-10">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center pt-10">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs text-[#0D6B5E] underline"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pt-10">
              <MessageCircle className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1 text-center px-4">
                Send a message to start the conversation with {patientName}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_role === 'clinician'
              const isOptimistic = msg.id.startsWith('optimistic-')
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                      isMine
                        ? `bg-[#0D6B5E] text-white rounded-br-sm ${isOptimistic ? 'opacity-60' : ''}`
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.body}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? 'text-white/55 text-right' : 'text-gray-400'
                      }`}
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

        {/* Input area */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          {error && !loading && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${patientName}…`}
              rows={2}
              maxLength={2000}
              className="flex-1 resize-none text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D6B5E]/30 focus:border-[#0D6B5E] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending || !myProfileId}
              className="size-9 shrink-0 bg-[#0D6B5E] hover:bg-[#0a5a4e] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
