'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ClinicalNotesProps {
  patientId: string
  appointmentId: string
  initialConditions?: string[]
}

const MAX_CHARS = 2000

export function ClinicalNotes({
  patientId,
  appointmentId,
  initialConditions = ['MIGRAINE', 'NEUROLOGY', 'HYPERTENSION'],
}: ClinicalNotesProps) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [conditions] = useState<string[]>(initialConditions)

  const saveDraft = useCallback(
    async (silent = true) => {
      if (!notes.trim()) return
      setSaving(true)
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('appointments')
          .update({ clinical_notes: notes } as Record<string, unknown>)
          .eq('id', appointmentId)

        if (!error) {
          setLastSaved(new Date())
          if (!silent) toast.success('Draft saved')
        } else if (!silent) {
          toast.error('Failed to save draft')
        }
      } catch {
        if (!silent) toast.error('Failed to save draft')
      } finally {
        setSaving(false)
      }
    },
    [notes, appointmentId]
  )

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!notes.trim()) return
    const interval = setInterval(() => saveDraft(true), 30000)
    return () => clearInterval(interval)
  }, [notes, saveDraft])

  // Suppress unused warning — patientId used for future AI endpoint
  void patientId

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_CHARS) {
      setNotes(e.target.value)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Start typing clinical observations…"
          className={cn(
            'w-full min-h-[160px] resize-none rounded-lg border border-input bg-gray-50 px-3 py-3 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0D6B5E]/30 focus:border-[#0D6B5E]',
            'transition-colors'
          )}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">
            {notes.length}/{MAX_CHARS}
          </span>
          <button
            type="button"
            title="AI Assist"
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => toast.info('AI assist coming in Phase 5')}
          >
            <Sparkles className="size-3.5 text-gray-400" />
          </button>
          <button
            type="button"
            title="Attach file"
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => toast.info('File attachments coming in Phase 5')}
          >
            <Paperclip className="size-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {conditions.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSaved && (
            <span className="text-[10px] text-gray-400">
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={saving || !notes.trim()}
            onClick={() => saveDraft(false)}
            className="text-xs h-7"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
        </div>
      </div>
    </div>
  )
}
