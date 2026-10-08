import { useState } from "react";
import { type Row } from "./core";
export function Seating({
  guests,
  tables,
  onGuests,
  onTables,
}: {
  guests: Row[];
  tables: Row[];
  onGuests: (r: Row[]) => void;
  onTables: (r: Row[]) => void;
}) {
  const [name, setName] = useState(""),
    [seats, setSeats] = useState(10),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  function assign(index: number, table: string) {
    const t = tables.find((t) => t.name === table);
    if (
      t &&
      guests.filter((g, i) => g.table === table && i !== index).length >=
        t.seats
    ) {
      setMessage("This table is full.");
      return;
    }
    onGuests(guests.map((g, i) => (i === index ? { ...g, table } : g)));
    setMessage(
      "Guest assignment updated. Save the wedding plan to persist it.",
    );
  }
  function move(table: Row, x: number, y: number) {
    onTables(
      tables.map((t) =>
        t.name === table.name
          ? {
              ...t,
              x: Math.min(90, Math.max(0, x)),
              y: Math.min(85, Math.max(0, y)),
            }
          : t,
      ),
    );
  }
  return (
    <section className="seating">
      <h3>Seating floor plan</h3>
      <p>
        Drag tables to arrange the room. Select a guest and choose a table, or
        drag a guest onto it. Arrow keys move a focused table. Save the wedding
        plan after editing.
      </p>
      <div className="form-grid">
        <label>
          Table name
          <input
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Seats
          <input
            type="number"
            min={1}
            max={100}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (
              !name.trim() ||
              tables.some((t) => t.name === name.trim()) ||
              seats < 1 ||
              seats > 100
            ) {
              setMessage("Enter a unique table name and 1-100 seats.");
              return;
            }
            onTables([
              ...tables,
              {
                name: name.trim(),
                seats,
                x: (tables.length % 4) * 23,
                y: (Math.floor(tables.length / 4) * 20) % 80,
              },
            ]);
            setName("");
          }}
        >
          Add table
        </button>
      </div>
      <label>
        Guest to assign
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose guest</option>
          {guests.map((g, i) => (
            <option key={i} value={i}>
              {g.name || "Unnamed guest"} - {g.table || "Unassigned"}
            </option>
          ))}
        </select>
      </label>
      <div
        className="seating-room"
        aria-label="Seating floor plan"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const table = e.dataTransfer.getData("application/royalvows-table");
          if (!table) return;
          const t = tables.find((t) => t.name === table),
            rect = e.currentTarget.getBoundingClientRect();
          if (t)
            move(
              t,
              ((e.clientX - rect.left) / rect.width) * 100,
              ((e.clientY - rect.top) / rect.height) * 100,
            );
        }}
      >
        <span className="seating-stage">STAGE / HEAD TABLE</span>
        {tables.map((t) => (
          <button
            type="button"
            draggable
            key={t.name}
            style={{ left: t.x + "%", top: t.y + "%" }}
            className="seating-table"
            aria-label={
              t.name +
              ", " +
              guests.filter((g) => g.table === t.name).length +
              " of " +
              t.seats +
              " seats"
            }
            onDragStart={(e) =>
              e.dataTransfer.setData("application/royalvows-table", t.name)
            }
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const guest = e.dataTransfer.getData(
                "application/royalvows-guest",
              );
              if (guest !== "") {
                e.stopPropagation();
                assign(Number(guest), t.name);
              }
            }}
            onClick={() => {
              if (selected !== "") assign(Number(selected), t.name);
            }}
            onKeyDown={(e) => {
              const d: Record<string, number[]> = {
                ArrowLeft: [-3, 0],
                ArrowRight: [3, 0],
                ArrowUp: [0, -3],
                ArrowDown: [0, 3],
              };
              if (d[e.key]) {
                e.preventDefault();
                move(t, t.x + d[e.key][0], t.y + d[e.key][1]);
              }
            }}
          >
            {t.name}
            <small>
              {guests.filter((g) => g.table === t.name).length}/{t.seats}
            </small>
          </button>
        ))}
      </div>
      <div className="seating-guests">
        {guests.map((g, i) => (
          <span
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData("application/royalvows-guest", String(i))
            }
            key={i}
          >
            {g.name} - {g.table || "Unassigned"}
          </span>
        ))}
      </div>
      {tables.map((t) => (
        <div className="record-actions" key={t.name}>
          <strong>{t.name}</strong>
          <label>
            X position
            <input
              aria-label={t.name + " horizontal position"}
              type="range"
              min={0}
              max={90}
              value={t.x}
              onChange={(e) => move(t, Number(e.target.value), t.y)}
            />
          </label>
          <label>
            Y position
            <input
              aria-label={t.name + " vertical position"}
              type="range"
              min={0}
              max={85}
              value={t.y}
              onChange={(e) => move(t, t.x, Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onTables(tables.filter((r) => r.name !== t.name));
              onGuests(
                guests.map((g) =>
                  g.table === t.name ? { ...g, table: "" } : g,
                ),
              );
            }}
          >
            Remove table
          </button>
        </div>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
