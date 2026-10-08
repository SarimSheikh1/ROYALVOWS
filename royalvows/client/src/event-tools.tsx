import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  useData,
  useAllBookings,
  State,
  businessDate,
  type Row,
} from "./core";
export function Allocations() {
  const bookings = useAllBookings(),
    items = useData("/event-inventory"),
    allocations = useData("/allocations"),
    qc = useQueryClient();
  const [booking, setBooking] = useState(""),
    [item, setItem] = useState(""),
    [quantity, setQuantity] = useState(1),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const venue = bookings.data?.find((b) => b._id === booking)?.venue?._id;
  async function action(path: string, body: Row) {
    setBusy(true);
    try {
      await api(path, "POST", body);
      setMessage("Equipment allocation updated.");
      await qc.invalidateQueries();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <State query={allocations} />
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          void action("/allocations", {
            booking,
            item,
            quantity,
            key: crypto.randomUUID(),
          });
        }}
      >
        <h2>Allocate event equipment</h2>
        <p>
          Stock is reserved immediately. Reusable equipment returns when the
          event completes or is cancelled; consumables are used on completion.
        </p>
        <label>
          Event
          <select
            required
            value={booking}
            onChange={(e) => {
              setBooking(e.target.value);
              setItem("");
            }}
          >
            <option value="">Choose active event</option>
            {bookings.data
              ?.filter((b) => !["Completed", "Cancelled"].includes(b.status))
              .map((b) => (
                <option value={b._id} key={b._id}>
                  {b.venue?.name} - {b.date} - {b.slot}
                </option>
              ))}
          </select>
        </label>
        <label>
          Equipment
          <select
            required
            value={item}
            onChange={(e) => setItem(e.target.value)}
          >
            <option value="">Choose equipment</option>
            {items.data
              ?.filter((i) => i.venue === venue)
              .map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} - {i.quantity} available{" "}
                  {i.consumable ? "(consumable)" : ""}
                </option>
              ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            required
            min={1}
            max={100000}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <button className="button" disabled={busy}>
          Reserve equipment
        </button>
        <p role="status">{message}</p>
      </form>
      {allocations.data?.length === 0 && (
        <p className="notice">No equipment allocated yet.</p>
      )}
      {allocations.data?.map((a) => (
        <article className="record" key={a._id}>
          <div>
            <h3>{a.item?.name}</h3>
            <p>
              {a.quantity} units - {a.booking?.date} - {a.booking?.slot}
            </p>
            <span className="badge">{a.status}</span>
          </div>
          {a.status === "Active" && (
            <button
              disabled={busy}
              onClick={() => action("/allocations/" + a._id + "/return", {})}
            >
              Return equipment
            </button>
          )}
        </article>
      ))}
    </>
  );
}
export function Consultations({ customer }: { customer: boolean }) {
  const planners = useData("/planners"),
    q = useData("/consultations"),
    qc = useQueryClient();
  const [date, setDate] = useState(businessDate()),
    [planner, setPlanner] = useState(""),
    [slot, setSlot] = useState(""),
    [notes, setNotes] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState<Record<string, string>>({});
  const slots = useQuery<Row[]>({
    queryKey: ["consultation-slots", date, planner],
    queryFn: () =>
      api("/consultations/availability?date=" + date + "&planner=" + planner),
    enabled: !!planner,
    retry: 1,
  });
  async function action(path: string, method: string, body: Row) {
    setBusy(true);
    try {
      await api(path, method, body);
      setMessage("Consultation saved.");
      await qc.invalidateQueries();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <State query={q} />
      {customer && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action("/consultations", "POST", {
              date,
              planner,
              slot,
              notes,
            });
          }}
        >
          <h2>Request a private consultation</h2>
          <label>
            Planner
            <select
              required
              value={planner}
              onChange={(e) => {
                setPlanner(e.target.value);
                setSlot("");
              }}
            >
              <option value="">Choose planner</option>
              {planners.data?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              required
              min={businessDate()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSlot("");
              }}
            />
          </label>
          <State query={slots} />
          <label>
            Time
            <select
              required
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              <option value="">Choose available time</option>
              {slots.data?.map((s) => (
                <option key={s.slot} disabled={!s.available} value={s.slot}>
                  {s.slot}
                  {s.available ? "" : " - reserved"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferences and requirements
            <textarea
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            Request consultation
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      {q.data?.length === 0 && <p className="notice">No consultations yet.</p>}
      {q.data?.map((c) => (
        <article className="panel" key={c._id}>
          <h3>
            {c.date} - {c.slot}
          </h3>
          <p>
            Planner: {c.planner?.name || "Unassigned"}{" "}
            {customer ? "" : " | Customer: " + (c.customer?.name || "Customer")}
          </p>
          <p>{c.notes}</p>
          <span className="badge">{c.status}</span>
          <div className="record-actions">
            {(c.status === "Pending" || c.status === "Confirmed") && (
              <>
                {!customer && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      action("/consultations/" + c._id, "PATCH", {
                        status:
                          c.status === "Pending" ? "Confirmed" : "Completed",
                      })
                    }
                  >
                    {c.status === "Pending" ? "Confirm" : "Complete"}
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    action("/consultations/" + c._id, "PATCH", {
                      status: "Cancelled",
                    })
                  }
                >
                  Cancel consultation
                </button>
              </>
            )}
          </div>
          {!customer && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("/consultations/" + c._id, "PATCH", {
                  note: note[c._id],
                });
              }}
            >
              <label>
                Consultation note
                <textarea
                  required
                  maxLength={2000}
                  value={note[c._id] || ""}
                  onChange={(e) =>
                    setNote({ ...note, [c._id]: e.target.value })
                  }
                />
              </label>
              <button disabled={busy}>Add history note</button>
            </form>
          )}
          <details>
            <summary>Consultation history</summary>
            {c.history?.map((h: Row, i: number) => (
              <p key={i}>
                <strong>{h.action}</strong> -{" "}
                {new Date(h.time).toLocaleString()}
                <br />
                {h.note}
              </p>
            ))}
          </details>
        </article>
      ))}
    </>
  );
}
