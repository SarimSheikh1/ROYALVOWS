import { useState } from "react";
import { api, useData, State, type Row } from "./core";
export function TaskBoard() {
  const q = useData("/tasks");
  const [message, setMessage] = useState("");
  return (
    <>
      <State query={q} />
      <div className="task-board">
        {["To Do", "In Progress", "Done"].map((status) => (
          <section key={status}>
            <h3>{status}</h3>
            {q.data
              ?.filter((t) => t.status === status)
              .map((t) => (
                <article key={t._id}>
                  <h4>{t.title}</h4>
                  <label>
                    Task state
                    <select
                      aria-label="Task state"
                      value={t.status}
                      onChange={async (e) => {
                        try {
                          await api("/tasks/" + t._id, "PATCH", {
                            status: e.target.value,
                          });
                          await q.refetch();
                        } catch (e: any) {
                          setMessage(e.message);
                        }
                      }}
                    >
                      {["To Do", "In Progress", "Done"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
          </section>
        ))}
      </div>
      <p role="status">{message}</p>
    </>
  );
}
export function TeamReports() {
  const q = useData("/operation-reports"),
    bookings = useData("/bookings");
  const [form, setForm] = useState<Row>({
      booking: "",
      kind: "Equipment readiness",
      details: "",
    }),
    [message, setMessage] = useState("");
  return (
    <>
      <State query={q} />
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/operation-reports", "POST", form);
            setMessage("Report saved.");
            await q.refetch();
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        <h2>Event operations report</h2>
        <label>
          Event
          <select
            aria-label="Report event"
            value={form.booking}
            onChange={(e) => setForm({ ...form, booking: e.target.value })}
          >
            <option value="">Choose event</option>
            {bookings.data?.map((b) => (
              <option key={b._id} value={b._id}>
                {b.venue?.name} - {b.date}
              </option>
            ))}
          </select>
        </label>
        <label>
          Report type
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {[
              "Incident",
              "Completion",
              "Kitchen preparation",
              "Equipment readiness",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Details
          <textarea
            value={form.details}
            required
            minLength={10}
            maxLength={3000}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
        </label>
        <button className="button">Save report</button>
        <p role="status">{message}</p>
      </form>
      {q.data?.map((r) => (
        <article className="record" key={r._id}>
          <div>
            <h3>{r.kind}</h3>
            <p>{r.details}</p>
            <small>{new Date(r.createdAt).toLocaleString()}</small>
          </div>
        </article>
      ))}
    </>
  );
}
