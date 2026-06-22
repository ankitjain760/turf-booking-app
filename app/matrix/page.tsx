'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type MatrixCell =
  | {
      status: 'free';
    }
  | {
      status: 'start';
      bookingId: string;
      customerName: string;
      phone: string;
      price: number;
      startHour: number;
      endHour: number;
    }
  | {
      status: 'cont';
      bookingId: string;
    };

type MatrixRow = {
  turf: string;
  cells: Record<number, MatrixCell>;
};

type BookingSlotRow = {
  booking_id: string;
  turf_name: string;
  slot_date: string;
  slot_hour: number;
};

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_price: number | null;
  start_hour: number;
  end_hour: number;
};

const TURFS = ['Turf 1', 'Turf 2', 'Turf 3'];

function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatHour(hour: number) {
  const start = String(hour).padStart(2, '0') + ':00';
  const end = String((hour + 1) % 24).padStart(2, '0') + ':00';
  return `${start}-${end}`;
}

function formatHourOnly(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export default function BookingMatrixPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [error, setError] = useState('');

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  async function loadMatrix(date: string) {
    setLoading(true);
    setError('');

    try {
      // 1) Get slot rows for selected date
      const { data: slotData, error: slotError } = await supabase
        .from('booking_slots')
        .select('booking_id, turf_name, slot_date, slot_hour')
        .eq('slot_date', date)
        .order('slot_hour', { ascending: true });

      if (slotError) throw slotError;

      const slots = (slotData || []) as BookingSlotRow[];

      // If no bookings, still build empty matrix
      const bookingIds = [...new Set(slots.map((s) => s.booking_id))];

      let bookingsMap = new Map<string, BookingRow>();

      if (bookingIds.length > 0) {
        // 2) Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, customer_name, customer_phone, total_price, start_hour, end_hour')
          .in('id', bookingIds);

        if (bookingError) throw bookingError;

        const bookings = (bookingData || []) as BookingRow[];
        bookingsMap = new Map(bookings.map((b) => [b.id, b]));
      }

      // 3) Build empty matrix first
      const matrix: MatrixRow[] = TURFS.map((turf) => ({
        turf,
        cells: Object.fromEntries(
          hours.map((h) => [h, { status: 'free' } as MatrixCell])
        ),
      }));

      const rowMap = new Map(matrix.map((r) => [r.turf, r]));

      // 4) Group slots by booking so we can mark first cell vs continuation cells
      const bookingSlotGroups = new Map<
        string,
        { turf_name: string; hours: number[] }
      >();

      for (const slot of slots) {
        if (!bookingSlotGroups.has(slot.booking_id)) {
          bookingSlotGroups.set(slot.booking_id, {
            turf_name: slot.turf_name,
            hours: [],
          });
        }
        bookingSlotGroups.get(slot.booking_id)!.hours.push(slot.slot_hour);
      }

      // 5) Fill matrix with "start" and "cont"
      for (const [bookingId, group] of bookingSlotGroups.entries()) {
        const row = rowMap.get(group.turf_name);
        if (!row) continue;

        const booking = bookingsMap.get(bookingId);
        if (!booking) continue;

        const sortedHours = [...group.hours].sort((a, b) => a - b);
        if (sortedHours.length === 0) continue;

        const firstHour = sortedHours[0];

        // first hour cell -> detailed booking
        row.cells[firstHour] = {
          status: 'start',
          bookingId: booking.id,
          customerName: booking.customer_name,
          phone: booking.customer_phone,
          price: booking.total_price || 0,
          startHour: booking.start_hour,
          endHour: booking.end_hour,
        };

        // remaining hours -> continuation arrows
        for (let i = 1; i < sortedHours.length; i++) {
          row.cells[sortedHours[i]] = {
            status: 'cont',
            bookingId: booking.id,
          };
        }
      }

      setRows(matrix);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load booking matrix');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatrix(selectedDate);
  }, [selectedDate]);

  return (
    <div style={{ padding: 20, maxWidth: 1600, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Booking Matrix</h1>
          <p style={{ marginTop: 6, color: '#555' }}>
            Turf vs time slot occupancy board
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600 }}>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 14,
            }}
          />

          <button
            onClick={() => setSelectedDate(getTodayStr())}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Today
          </button>

          <button
            onClick={() => loadMatrix(selectedDate)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#0f766e',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <Legend color="#dcfce7" label="Free" />
        <Legend color="#fee2e2" label="Booking start cell" />
        <Legend color="#fecaca" label="Continuation hour" />
      </div>

      {error ? (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div>Loading matrix...</div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fff',
          }}
        >
          <table
            style={{
              borderCollapse: 'collapse',
              minWidth: 1500,
              width: '100%',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    background: '#f8fafc',
                    minWidth: 140,
                    borderBottom: '1px solid #e5e7eb',
                    borderRight: '1px solid #e5e7eb',
                    padding: 12,
                    textAlign: 'left',
                  }}
                >
                  Turf / Time
                </th>

                {hours.map((hour) => (
                  <th
                    key={hour}
                    style={{
                      minWidth: 110,
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      padding: 10,
                      background: '#f8fafc',
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatHour(hour)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.turf}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      background: '#fff',
                      borderRight: '1px solid #e5e7eb',
                      borderBottom: '1px solid #e5e7eb',
                      padding: 12,
                      fontWeight: 700,
                      minWidth: 140,
                    }}
                  >
                    {row.turf}
                  </td>

                  {hours.map((hour) => {
                    const cell = row.cells[hour];

                    if (cell.status === 'free') {
                      return (
                        <td
                          key={hour}
                          style={{
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                            padding: 8,
                            background: '#dcfce7',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontSize: 12,
                            color: '#166534',
                            height: 86,
                          }}
                        >
                          Free
                        </td>
                      );
                    }

                    if (cell.status === 'cont') {
                      return (
                        <td
                          key={hour}
                          style={{
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                            padding: 8,
                            background: '#fecaca',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#991b1b',
                            height: 86,
                          }}
                          title="Continuation of booking"
                        >
                          →
                        </td>
                      );
                    }

                    return (
                      <td
                        key={hour}
                        style={{
                          borderRight: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          padding: 8,
                          background: '#fee2e2',
                          verticalAlign: 'top',
                          height: 86,
                        }}
                        title={`Booking ${cell.bookingId}`}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                          {cell.customerName}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>{cell.phone}</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          ₹ {cell.price}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          {formatHourOnly(cell.startHour)} - {formatHourOnly(cell.endHour)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: color,
          border: '1px solid #ddd',
        }}
      />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}
