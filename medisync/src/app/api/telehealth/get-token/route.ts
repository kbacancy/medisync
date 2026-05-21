import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  roomName: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  isOwner: z.boolean(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { roomName, userId, userName, isOwner } = parsed.data

  // ── Dev mock: return a stub token ─────────────────────────────────────────
  if (process.env.DAILY_MOCK === 'true') {
    return NextResponse.json({
      token: `mock-token-${roomName}-${userId}-${isOwner ? 'owner' : 'guest'}`,
    })
  }

  const dailyRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        user_id: userId,
        is_owner: isOwner,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  if (!dailyRes.ok) {
    const detail = await dailyRes.text()
    return NextResponse.json(
      { error: 'Failed to create meeting token', detail },
      { status: 502 }
    )
  }

  const { token } = await dailyRes.json()
  return NextResponse.json({ token })
}
