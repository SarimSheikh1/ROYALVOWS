import { businessDate } from "./core";
import { useState } from "react";
import { useAllBookings, State, type Row } from "./core";
export function EventCalendar() {
  const [mode, setMode] = useState("Month"),
    [day, setDay] = useState(businessDate()),
    [venue, setVenue] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<Row | null>(null);
  const rangeStart = mode === "Month" ? day.slice(0, 7) + "-01" : day;
  const rangeEnd = new Date(rangeStart + "T12:00:00Z");
  rangeEnd.setUTCDate(
    rangeEnd.getUTCDate() +
      (mode === "Month"
        ? new Date(
            Number(day.slice(0, 4)),
            Number(day.slice(5, 7)),
            0,
          ).getDate()
        : mode === "Week"
          ? 7
          : 1) -
      1,
  );
  const q = useAllBookings(
    "/bookings?from=" +
      rangeStart +
      "&to=" +
      rangeEnd.toISOString().slice(0, 10),
  );
  const records = (q.data || []).filter(
    (r) =>
      (!venue || r.venue?._id === venue) && (!status || r.status === status),
  );
  const start = mode === "Month" ? day.slice(0, 7) + "-01" : day;
  const days =
    mode === "Month"
      ? new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0).getDate()
      : mode === "Week"
        ? 7
        : 1;
  return (
    <>
      <div className="filters">
        <label>
          View
          <select
            aria-label="View"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {["Month", "Week", "Day"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          Palace
          <select
            aria-label="Palace"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          >
            <option value="">All assigned palaces</option>
            {Array.from(
              new Map(
                (q.data || []).map((r) => [r.venue?._id, r.venue]),
              ).values(),
            )
              .filter(Boolean)
              .map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Status
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "Pending",
              "Awaiting Advance",
              "Confirmed",
              "In Progress",
              "Completed",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <State query={q} />
      <p className="calendar-legend">
        Pending / Awaiting Advance: gold &middot; Confirmed / In Progress: green
        &middot; Completed: gray &middot; Cancelled: burgundy
      </p>
      <div className={"event-calendar " + (mode === "Day" ? "day" : "")}>
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(start + "T12:00:00Z");
          date.setUTCDate(date.getUTCDate() + i);
          const iso = date.toISOString().slice(0, 10);
          return (
            <div key={iso}>
              <strong>
                {date.toLocaleDateString("en-PK", {
                  weekday: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </strong>
              {records
                .filter((r) => r.date === iso)
                .map((r) => (
                  <button
                    className={
                      "calendar-event " + r.status.replaceAll(" ", "-")
                    }
                    onClick={() => setSelected(r)}
                    key={r._id}
                  >
                    {r.slot} &middot; {r.event}
                    <small>{r.venue?.name}</small>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      {selected && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Event details"
        >
          <section className="panel">
            <button
              autoFocus
              onClick={() => setSelected(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSelected(null);
                if (e.key === "Tab") e.preventDefault();
              }}
            >
              Close
            </button>
            <h2>{selected.venue?.name}</h2>
            <p>
              {selected.date} &middot; {selected.slot} &middot; {selected.event}
              <br />
              {selected.guests} guests &middot; {selected.theme}
            </p>
            <span className="badge">{selected.status}</span>
            <p>{selected.notes || "No additional requirements"}</p>
          </section>
        </div>
      )}
    </>
  );
}
