import { redirect } from 'next/navigation';
import { Plus, Calendar, Video, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AppointmentStatus, AppointmentType } from '@/types';
import { format } from 'date-fns';

interface AppointmentRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  patient: { full_name: string } | { full_name: string }[] | null;
}

interface DisplayAppointment {
  id: string;
  time: string;
  ampm: string;
  patient_name: string;
  reason: string;
  type: AppointmentType;
  status: AppointmentStatus;
}

const SEED_APPOINTMENTS: DisplayAppointment[] = [
  { id: '1', time: '09:00', ampm: 'AM', patient_name: 'Maria Santos', reason: 'Medication review', type: 'telehealth', status: 'scheduled' },
  { id: '2', time: '10:30', ampm: 'AM', patient_name: 'James Wilson', reason: 'Follow-up consultation', type: 'in_person', status: 'scheduled' },
  { id: '3', time: '02:00', ampm: 'PM', patient_name: 'Emma Davis', reason: 'Blood pressure check', type: 'telehealth', status: 'scheduled' },
  { id: '4', time: '03:30', ampm: 'PM', patient_name: 'Robert Chen', reason: 'Annual physical', type: 'in_person', status: 'completed' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  no_show: { label: 'No Show', className: 'bg-red-50 text-red-700 border-red-200' },
};

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let appointments: DisplayAppointment[] = SEED_APPOINTMENTS;

  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        type,
        reason,
        status,
        patient:profiles!patient_id(full_name)
      `)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', sevenDaysLater.toISOString())
      .order('scheduled_at', { ascending: true });

    if (data && data.length > 0) {
      appointments = (data as AppointmentRow[]).map((row) => {
        const patientObj = Array.isArray(row.patient) ? row.patient[0] : row.patient;
        const d = new Date(row.scheduled_at);
        const hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        const mm = d.getMinutes().toString().padStart(2, '0');
        return {
          id: row.id,
          time: `${displayHour.toString().padStart(2, '0')}:${mm}`,
          ampm,
          patient_name: patientObj?.full_name ?? 'Unknown',
          reason: row.reason,
          type: row.type,
          status: row.status,
        };
      });
    }
  } catch {
    // fall back to seed
  }

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <Button className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white flex items-center gap-2">
          <Plus className="size-4" />
          New Appointment
        </Button>
      </div>

      {/* Appointments list */}
      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Calendar className="size-8 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">No appointments scheduled</p>
            <p className="text-sm text-gray-500 mt-1">Your upcoming appointments will appear here.</p>
          </div>
          <Button className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white flex items-center gap-2 mt-2">
            <Plus className="size-4" />
            New Appointment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusMeta = statusConfig[appt.status];
            return (
              <div
                key={appt.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 p-4"
              >
                {/* Time */}
                <div className="text-center shrink-0 w-16">
                  <p className="text-base font-bold text-gray-900">{appt.time}</p>
                  <p className="text-xs text-gray-400">{appt.ampm}</p>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-gray-200 shrink-0" />

                {/* Avatar */}
                <div className="size-10 rounded-full bg-[#0D6B5E]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#0D6B5E] text-xs font-semibold">
                    {getInitials(appt.patient_name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{appt.patient_name}</p>
                  <p className="text-sm text-gray-500 truncate">{appt.reason}</p>
                </div>

                {/* Type badge */}
                <Badge
                  variant="outline"
                  className={
                    appt.type === 'telehealth'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1'
                      : 'bg-gray-50 text-gray-600 border-gray-200 flex items-center gap-1'
                  }
                >
                  {appt.type === 'telehealth' ? (
                    <><Video className="size-3" /> Video</>
                  ) : (
                    <><MapPin className="size-3" /> In-person</>
                  )}
                </Badge>

                {/* Status badge */}
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
