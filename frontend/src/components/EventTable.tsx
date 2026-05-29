export function EventTable({ events }: { events: any[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
        <thead className="bg-slate-950/40 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Severity</th>
            <th className="px-4 py-3 font-medium">Camera</th>
            <th className="px-4 py-3 font-medium">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-slate-950/20">
          {events.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-slate-400" colSpan={4}>
                No events recorded yet.
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.event_id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-slate-100">{event.event_type}</td>
                <td className="px-4 py-3 text-slate-300">{event.severity}</td>
                <td className="px-4 py-3 text-slate-300">{event.camera_id}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(event.timestamp).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}