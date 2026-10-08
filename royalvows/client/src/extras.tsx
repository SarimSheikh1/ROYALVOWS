import { useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { api, useData, type Row } from "./core";
export function PasswordHelp() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  return (
    <details>
      <summary>Forgot your password?</summary>
      <label>
        Reset email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={async () => {
          try {
            setMessage(
              (await api("/auth/request-reset", "POST", { email })).message,
            );
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Request reset link
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
export function ResetPassword() {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <main className="section page">
      <h1>A fresh beginning.</h1>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/auth/reset", "POST", {
              token: new URLSearchParams(location.search).get("token"),
              password,
            });
            setMessage("Password changed. Sign in with your new password.");
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        <label>
          New password
          <input
            type="password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button">Reset password</button>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
export function GuestTools({
  guests,
  onImport,
}: {
  guests: Row[];
  onImport: (r: Row[]) => void;
}) {
  const [error, setError] = useState("");
  return (
    <div className="panel">
      <label>
        Import guests (CSV: name,table; simple unquoted values)
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 256000) throw new Error("CSV must be below 256 KB");
              const text = await f.text();
              const lines = text
                .replace(/^\uFEFF/, "")
                .trim()
                .split(/\r?\n/);
              if (lines.shift()?.toLowerCase() !== "name,table")
                throw new Error("Use the header name,table");
              const rows = lines.map((line) => {
                const columns = line.split(",");
                if (columns.length !== 2)
                  throw new Error(
                    "Use exactly two columns without embedded commas",
                  );
                return { name: columns[0].trim(), table: columns[1].trim() };
              });
              onImport(
                z
                  .array(
                    z.object({
                      name: z.string().min(1).max(100),
                      table: z.string().max(50),
                    }),
                  )
                  .max(2000)
                  .parse(rows),
              );
              setError(
                "Guest list imported. Save the wedding plan to persist it.",
              );
            } catch (e: any) {
              setError(e.message);
            }
          }}
        />
      </label>
      <button
        onClick={() => {
          const safe = (value: string) => {
            const s = value.replaceAll(",", " ").replaceAll("\n", " ");
            return /^[=+@-]/.test(s) ? "'" + s : s;
          };
          const blob = new Blob(
            [
              "name,table\n" +
                guests
                  .map((g) => safe(g.name) + "," + safe(g.table))
                  .join("\n"),
            ],
            { type: "text/csv" },
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "royalvows-guests.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export guest CSV
      </button>
      <p role="status">{error}</p>
    </div>
  );
}
export function UploadMedia() {
  const auth = useData("/auth/me");
  const [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState("");
  return (
    <details className="panel">
      <summary>Upload a gallery image</summary>
      <label>
        JPEG, PNG or WebP (up to 8 MB)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <button
        onClick={async () => {
          try {
            if (!file) throw new Error("Select an image");
            const form = new FormData();
            form.append("file", file);
            const r = await fetch("/api/admin/uploads", {
              method: "POST",
              credentials: "include",
              headers: { "X-CSRF-Token": (auth.data as any)?.csrf || "" },
              body: form,
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error?.message);
            setMessage(
              "Upload saved. Media URL: " +
                j.data.url +
                ". Add this URL to a gallery record with its caption and provenance.",
            );
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Upload image
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
export function Reschedule({ booking: b }: { booking: Row }) {
  const [date, setDate] = useState(b.date),
    [slot, setSlot] = useState(b.slot),
    [message, setMessage] = useState("");
  const qc = useQueryClient();
  return (
    <details>
      <summary>Reschedule event</summary>
      <label>
        New event date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        New slot
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option>Lunch</option>
          <option>Evening</option>
        </select>
      </label>
      <button
        onClick={async () => {
          try {
            await api("/bookings/" + b._id + "/reschedule", "PATCH", {
              date,
              slot,
            });
            setMessage("Rescheduled successfully.");
            await qc.invalidateQueries();
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Save new schedule
      </button>
      <p role="status">{message}</p>
    </details>
  );
}
export function Maintenance() {
  const venues = useData("/venues");
  const [venue, setVenue] = useState(""),
    [date, setDate] = useState(""),
    [slot, setSlot] = useState("Lunch"),
    [message, setMessage] = useState("");
  return (
    <details className="panel">
      <summary>Block a maintenance slot</summary>
      <label>
        Venue
        <select value={venue} onChange={(e) => setVenue(e.target.value)}>
          <option value="">Choose palace</option>
          {venues.data?.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Maintenance date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        Slot
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option>Lunch</option>
          <option>Evening</option>
        </select>
      </label>
      <button
        onClick={async () => {
          try {
            await api("/admin/maintenance", "POST", { venue, date, slot });
            setMessage("Slot blocked.");
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Block slot
      </button>
      <p role="status">{message}</p>
    </details>
  );
}

export function VerifyEmail() {
  const [message, setMessage] = useState(
    "Open your emailed link, then confirm verification.",
  );
  return (
    <main className="section page">
      <h1>Email verification.</h1>
      <button
        className="button"
        onClick={async () => {
          try {
            await api("/auth/verify", "POST", {
              token: new URLSearchParams(location.search).get("token"),
            });
            setMessage("Email verified.");
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Verify email
      </button>
      <p role="status">{message}</p>
    </main>
  );
}
