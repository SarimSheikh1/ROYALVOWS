import { EmployeeRecords } from "./hr";
import { UploadMedia } from "./extras";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useData, State, money, type Row } from "./core";
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  money?: boolean;
};
const config: Record<string, { path: string; fields: Field[] }> = {
  Addons: {
    path: "services",
    fields: [
      { key: "name", label: "Service name" },
      { key: "rate", label: "Rate (PKR)", type: "number", money: true },
      {
        key: "unit",
        label: "Billing basis",
        type: "select",
        options: ["event", "guest"],
      },
      { key: "description", label: "Description", type: "textarea" },
      { key: "archived", label: "Archive service", type: "boolean" },
    ],
  },
  Discounts: {
    path: "discounts",
    fields: [
      { key: "name", label: "Discount name" },
      { key: "code", label: "Code" },
      {
        key: "amount",
        label: "Discount amount (PKR)",
        type: "number",
        money: true,
      },
      { key: "venue", label: "Eligible palace", type: "venue" },
      { key: "expires", label: "Valid through event date", type: "date" },
      { key: "archived", label: "Disable code", type: "boolean" },
    ],
  },
  Venues: {
    path: "venues",
    fields: [
      { key: "name", label: "Palace name" },
      { key: "city", label: "City" },
      { key: "address", label: "Verified address" },
      { key: "parkingCapacity", label: "Parking capacity", type: "number" },
      { key: "floorPlan", label: "Floor-plan image URL" },
      { key: "demo", label: "Illustrative demo venue", type: "boolean" },
      { key: "capacity", label: "Guest capacity", type: "number" },
      { key: "rental", label: "Rental (PKR)", type: "number", money: true },
      { key: "outdoor", label: "Outdoor setting", type: "boolean" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "amenities", label: "Amenities (one per line)", type: "array" },
      { key: "image", label: "Licensed image URL" },
      {
        key: "taxBps",
        label: "Configured tax rate (%)",
        type: "number",
        money: true,
      },
      { key: "archived", label: "Archive palace", type: "boolean" },
    ],
  },
  Collections: {
    path: "packages",
    fields: [
      { key: "name", label: "Collection name" },
      { key: "perHead", label: "Per guest (PKR)", type: "number", money: true },
      { key: "decor", label: "Decor (PKR)", type: "number", money: true },
      { key: "minGuests", label: "Minimum guests", type: "number" },
      { key: "maxGuests", label: "Maximum guests", type: "number" },
      { key: "inclusions", label: "Inclusions (one per line)", type: "array" },
      { key: "archived", label: "Archive collection", type: "boolean" },
    ],
  },
  Inventory: {
    path: "inventory",
    fields: [
      { key: "name", label: "Equipment name" },
      { key: "threshold", label: "Low-stock threshold", type: "number" },
      {
        key: "consumable",
        label: "Consumable (used at event completion)",
        type: "boolean",
      },
      { key: "venue", label: "Palace", type: "venue" },
      { key: "archived", label: "Archive item", type: "boolean" },
    ],
  },
  Suppliers: {
    path: "suppliers",
    fields: [
      { key: "name", label: "Supplier name" },
      { key: "contact", label: "Contact information" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "archived", label: "Archive supplier", type: "boolean" },
    ],
  },
  Employees: {
    path: "employees",
    fields: [
      { key: "user", label: "Employee account", type: "user" },
      {
        key: "salary",
        label: "Monthly salary record (PKR)",
        type: "number",
        money: true,
      },
      { key: "availability", label: "Availability" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "archived", label: "Archive employee", type: "boolean" },
    ],
  },
  Menus: {
    path: "menus",
    fields: [
      { key: "name", label: "Menu name" },
      { key: "perHead", label: "Per guest (PKR)", type: "number", money: true },
      { key: "dietary", label: "Dietary options" },
      { key: "items", label: "Menu items (one per line)", type: "array" },
      { key: "notes", label: "Kitchen notes", type: "textarea" },
      { key: "archived", label: "Archive menu", type: "boolean" },
    ],
  },
  Gallery: {
    path: "gallery",
    fields: [
      { key: "url", label: "Licensed media URL" },
      {
        key: "category",
        label: "Category",
        type: "select",
        options: [
          "Interior",
          "Exterior",
          "Drone View",
          "Barat",
          "Walima",
          "Mehndi",
          "Nikah",
          "Stage Design",
          "Dining",
          "Floral Decor",
          "Lighting",
        ],
      },
      { key: "caption", label: "Caption" },
      {
        key: "provenance",
        label: "Source and permission / concept disclosure",
        type: "textarea",
      },
      {
        key: "kind",
        label: "Media type",
        type: "select",
        options: ["image", "video"],
      },
      { key: "poster", label: "Video poster URL (optional)" },
      { key: "order", label: "Display order", type: "number" },
      { key: "published", label: "Publish media", type: "boolean" },
    ],
  },
};
export function ResourceEditor({
  kind,
  records,
  onSaved,
}: {
  kind: string;
  records: Row[];
  onSaved?: () => void;
}) {
  const cfg = config[kind];
  const [selected, setSelected] = useState(""),
    [form, setForm] = useState<Row>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const venues = useData("/venues"),
    users = useData("/admin/users");
  const qc = useQueryClient();
  function choose(value: string) {
    setSelected(value);
    setForm(records.find((r) => r._id === value) || {});
  }
  return (
    <details className="panel">
      <summary>Create / edit {kind.toLowerCase()}</summary>
      <label>
        Record
        <select
          aria-label="Record"
          value={selected}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Create new</option>
          {records.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name || r.caption || r.user}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const body: Row = {};
            for (const f of cfg.fields) {
              const value = form[f.key];
              body[f.key] =
                f.type === "number"
                  ? Number(value || 0)
                  : f.type === "boolean"
                    ? !!value
                    : f.type === "array"
                      ? Array.isArray(value)
                        ? value
                        : String(value || "")
                            .split("\n")
                            .filter(Boolean)
                      : String(value || "");
            }
            await api(
              "/admin/" + cfg.path + (selected ? "/" + selected : ""),
              selected ? "PUT" : "POST",
              body,
            );
            await qc.invalidateQueries();
            onSaved?.();
            setError("Saved successfully.");
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {cfg.fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.checked })
                  }
                />
              ) : ["select", "venue", "user"].includes(f.type || "") ? (
                <select
                  required
                  value={form[f.key] || ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                >
                  <option value="">Choose?</option>
                  {f.type === "select"
                    ? f.options?.map((v) => <option key={v}>{v}</option>)
                    : (f.type === "venue" ? venues.data : users.data)?.map(
                        (r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ),
                      )}
                </select>
              ) : ["array", "textarea"].includes(f.type || "") ? (
                <textarea
                  value={
                    Array.isArray(form[f.key])
                      ? form[f.key].join("\n")
                      : form[f.key] || ""
                  }
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                />
              ) : (
                <input
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : "text"
                  }
                  min={f.type === "number" ? 0 : undefined}
                  value={
                    f.money
                      ? (form[f.key] || 0) / 100
                      : f.type === "date"
                        ? String(form[f.key] || "").slice(0, 10)
                        : (form[f.key] ?? "")
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.key]:
                        f.type === "number"
                          ? Number(e.target.value) * (f.money ? 100 : 1)
                          : e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
        </div>
        <button className="button" disabled={busy}>
          Save {kind.toLowerCase()}
        </button>
        <p role="status">{error}</p>
      </form>
    </details>
  );
}
export function Operations({ kind }: { kind: string }) {
  const cfg = config[kind];
  const q = useData("/admin/" + (cfg?.path || kind.toLowerCase()));
  const [item, setItem] = useState(""),
    [quantity, setQuantity] = useState(""),
    [reference, setReference] = useState(""),
    [message, setMessage] = useState("");
  const qc = useQueryClient();
  async function action(path: string, body: Row) {
    try {
      await api(path, "POST", body);
      setMessage("Recorded successfully.");
      await qc.invalidateQueries();
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  return (
    <>
      <State query={q} />
      {kind === "Gallery" && <UploadMedia />}
      {kind === "Employees" && <EmployeeRecords />}
      {cfg && <ResourceEditor kind={kind} records={q.data || []} />}
      <div className="records">
        {q.data?.map((r) => (
          <article className="record" key={r._id}>
            <div>
              <h3>
                {r.name ||
                  r.caption ||
                  r.date ||
                  r.reference ||
                  "Employee record"}
              </h3>
              <p>
                {r.quantity != null
                  ? "Available: " +
                    r.quantity +
                    " | Low-stock threshold: " +
                    r.threshold
                  : r.salary != null
                    ? money(r.salary)
                    : r.contact || r.dietary || r.text || r.notes}
              </p>
              {r.quantity <= r.threshold && r.quantity != null && (
                <span className="badge">Low stock</span>
              )}
              {r.archived && <span className="badge">Archived</span>}
              {r.status && <span className="badge">{r.status}</span>}
            </div>
            {kind === "Reviews" && (
              <div className="record-actions">
                {["Approved", "Rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      try {
                        await api("/admin/reviews/" + r._id, "PATCH", {
                          status: s,
                        });
                        q.refetch();
                      } catch (e: any) {
                        setMessage(e.message);
                      }
                    }}
                  >
                    {s === "Approved" ? "Approve" : "Reject"}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {["Inventory", "Suppliers"].includes(kind) && (
        <section className="panel">
          <h2>
            {kind === "Inventory"
              ? "Stock movement"
              : kind === "Suppliers"
                ? "Record supplier payment"
                : "Record attendance"}
          </h2>
          <label>
            {kind === "Inventory"
              ? "Equipment"
              : kind === "Suppliers"
                ? "Supplier"
                : "Employee"}
            <select value={item} onChange={(e) => setItem(e.target.value)}>
              <option value="">Choose record</option>
              {q.data?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name || r.user}
                </option>
              ))}
            </select>
          </label>
          <label>
            {kind === "Employees"
              ? "Date"
              : kind === "Inventory"
                ? "Quantity (negative to allocate / deduct)"
                : "Amount (PKR)"}
            <input
              type={kind === "Employees" ? "date" : "number"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          {kind !== "Employees" && (
            <label>
              Reference
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          )}
          <button
            className="button"
            onClick={() =>
              kind === "Inventory"
                ? action("/admin/stock-movements", {
                    item,
                    quantity: Number(quantity),
                    reference,
                    key: crypto.randomUUID(),
                  })
                : kind === "Suppliers"
                  ? action("/admin/supplier-payment", {
                      supplier: item,
                      amount: Math.round(Number(quantity) * 100),
                      reference,
                      key: crypto.randomUUID(),
                    })
                  : action("/admin/attendance", {
                      employee: item,
                      date: quantity,
                      present: true,
                    })
            }
          >
            Record {kind === "Employees" ? "present" : "movement"}
          </button>
          <p role="status">{message}</p>
        </section>
      )}
    </>
  );
}
export function Settings() {
  const q = useData("/settings");
  const [form, setForm] = useState<Row>({
      name: "RoyalVows",
      phone: "",
      address: "",
      whatsapp: "",
      contactConfigured: false,
    }),
    [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (q.data && !loaded) {
      setForm({ ...form, ...(q.data as any) });
      setLoaded(true);
    }
  }, [q.data, loaded]);
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/admin/settings", "PUT", form);
          setMessage("Settings saved.");
          q.refetch();
        } catch (e: any) {
          setMessage(e.message);
        }
      }}
    >
      <h2>Operator contact settings</h2>
      {["name", "phone", "address", "whatsapp"].map((k) => (
        <label key={k}>
          {k}
          <input
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={form.contactConfigured}
          onChange={(e) =>
            setForm({ ...form, contactConfigured: e.target.checked })
          }
        />
        Confirm contact details are configured
      </label>
      <button className="button">Save settings</button>
      <p role="status">{message}</p>
    </form>
  );
}
export function Profile() {
  const q = useData("/profile");
  const [name, setName] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>Your profile</h2>
      <p>{(q.data as any)?.email}</p>
      <label>
        Name
        <input
          value={name}
          placeholder={(q.data as any)?.name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        onClick={async () => {
          try {
            await api("/profile", "PATCH", {
              name,
              savedVenues: (q.data as any)?.savedVenues || [],
            });
            setMessage("Profile updated.");
            q.refetch();
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Save profile
      </button>
      <button
        onClick={async () => {
          try {
            const r = await api("/auth/request-verification", "POST", {});
            setMessage(
              r.delivered
                ? "Verification email accepted by provider."
                : "Provider did not confirm delivery.",
            );
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        Request email verification
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
