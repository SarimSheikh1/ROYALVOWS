import { businessDate } from "./core";
import { ReviewSubmission } from "./reviews";
import { TaskBoard, TeamReports } from "./team";
import { SavedPalaces } from "./saved";
import { PasswordHelp, GuestTools, Reschedule, Maintenance } from "./extras";
import { EventCalendar } from "./calendar";
import { Operations, ResourceEditor, Settings, Profile } from "./operations";
import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowUpRight, LayoutDashboard, Heart, LogOut } from "lucide-react";
import {
  api,
  useData,
  useUser,
  State,
  Monogram,
  money,
  image,
  type Row,
} from "./core";
export function Login() {
  const [register, setRegister] = useState(false),
    [error, setError] = useState("");
  const {
    register: field,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ name: string; email: string; password: string }>();
  const qc = useQueryClient(),
    nav = useNavigate();
  return (
    <main className="auth-page">
      <div>
        <Monogram />
        <span className="eyebrow">MY ROYAL CELEBRATION</span>
        <h1>{register ? "Begin your story." : "Welcome back."}</h1>
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              await api(
                "/auth/" + (register ? "register" : "login"),
                "POST",
                values,
              );
              await qc.invalidateQueries({ queryKey: ["auth"] });
              nav("/portal");
            } catch (e: any) {
              setError(e.message);
            }
          })}
        >
          {register && (
            <label>
              Your name
              <input
                {...field("name", { required: register })}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              {...field("email", { required: true })}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              aria-label="Password"
              type="password"
              minLength={12}
              {...field("password", { required: true, minLength: 12 })}
              autoComplete={register ? "new-password" : "current-password"}
            />
            <small>At least 12 characters.</small>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={isSubmitting}>
            {register ? "Create your account" : "Sign in"} <ArrowUpRight />
          </button>
        </form>
        <PasswordHelp />
        <button
          className="text-link"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
      <img src={image} alt="Illustrative wedding palace interior" />
    </main>
  );
}
function Action({
  children,
  run,
}: {
  children: ReactNode;
  run: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const qc = useQueryClient();
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await run();
            await qc.invalidateQueries();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving..." : children}
      </button>
      {error && (
        <small className="error" role="alert">
          {error}
        </small>
      )}
    </>
  );
}
export function Portal() {
  const { data, isPending } = useUser();
  const [tab, setTab] = useState("Overview");
  const nav = useNavigate(),
    qc = useQueryClient();
  const u = data?.user;
  useEffect(() => {
    if (!isPending && !u) nav("/login");
  }, [u, isPending, nav]);
  if (!u) return <main className="section page">Checking your session...</main>;
  const customer = u.role === "Customer",
    staff = u.role === "Staff",
    admin = u.role === "Super Admin";
  const tabs = customer
    ? [
        "Overview",
        "Bookings",
        "Payments",
        "Ledger",
        "Wedding plan",
        "Consultations",
        "Inquiries",
        "Saved palaces",
        "Reviews",
        "Profile",
        "Notifications",
      ]
    : staff
      ? ["Overview", "Tasks", "Notifications"]
      : [
          "Overview",
          "Bookings",
          "Calendar",
          "Tasks",
          "Operations reports",
          ...(admin
            ? [
                "Venues",
                "Collections",
                "Customers & staff",
                "Payments",
                "Ledger",
                "Expenses",
                "Reports",
                "Consultations",
                "Inquiries",
                "Inventory",
                "Suppliers",
                "Employees",
                "Menus",
                "Addons",
                "Discounts",
                "Gallery",
                "Reviews",
                "Settings",
                "Audit logs",
              ]
            : []),
          "Notifications",
        ];
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Monogram />
        <h3>
          {customer
            ? "My royal celebration"
            : admin
              ? "Command center"
              : "Hall workspace"}
        </h3>
        <small>
          {u.name} &middot; {u.role}
        </small>
        <nav>
          {tabs.map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "Overview" ? (
                <LayoutDashboard size={17} />
              ) : (
                <Heart size={15} />
              )}{" "}
              {t}
            </button>
          ))}
        </nav>
        <button
          onClick={async () => {
            await api("/auth/logout", "POST");
            qc.clear();
            nav("/");
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <main className="workspace">
        <span className="eyebrow">
          {customer
            ? "EVERY DETAIL, BEAUTIFULLY TOGETHER"
            : "ROYALVOWS OPERATIONS"}
        </span>
        <h1>
          {tab === "Overview" ? "Welcome, " + u.name.split(" ")[0] + "." : tab}
        </h1>
        <DashboardContent tab={tab} user={u} />
      </main>
    </div>
  );
}
function DashboardContent({ tab, user }: { tab: string; user: Row }) {
  const bookings = useData("/bookings");
  const [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [input, setInput] = useState(""),
    [method, setMethod] = useState(""),
    [date, setDate] = useState(businessDate());
  const customer = user.role === "Customer",
    admin = user.role === "Super Admin";
  const b = bookings.data?.find((b) => b._id === selected);
  const team = useQuery<Row[]>({
    queryKey: ["team-members"],
    queryFn: () => api("/team-members"),
    enabled: !customer && user.role !== "Staff",
  });
  const path = (
    {
      Payments: "/payments",
      Consultations: "/consultations",
      Notifications: "/notifications",
      Inquiries: "/inquiries",
      Tasks: "/tasks",
      Expenses: "/expenses",
      Ledger: "/ledger",
      "Audit logs": "/audit",
      Venues: "/venues",
      Collections: "/packages",
      "Customers & staff": "/admin/users",
    } as Record<string, string>
  )[tab];
  const rows = useQuery<Row[]>({
    queryKey: [path],
    queryFn: () => api(path!),
    enabled: !!path,
    retry: 1,
  });
  const [from, setFrom] = useState(businessDate().slice(0, 7) + "-01"),
    [to, setTo] = useState(businessDate());
  const report = useQuery<Row>({
    queryKey: ["report", from, to],
    queryFn: () => api("/reports?from=" + from + "&to=" + to),
    enabled: tab === "Reports",
    retry: 1,
  });
  const pick = (
    <label>
      Booking
      <select
        aria-label="Booking"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select a booking</option>
        {bookings.data?.map((r) => (
          <option key={r._id} value={r._id}>
            {r.venue?.name} &middot; {r.date}
          </option>
        ))}
      </select>
    </label>
  );
  if (tab === "Reviews" && customer) return <ReviewSubmission />;
  if (
    [
      "Inventory",
      "Suppliers",
      "Employees",
      "Menus",
      "Gallery",
      "Reviews",
    ].includes(tab)
  )
    return <Operations kind={tab} />;
  if (tab === "Settings") return <Settings />;
  if (tab === "Profile") return <Profile />;
  if (tab === "Saved palaces") return <SavedPalaces />;
  if (tab === "Overview")
    return (
      <>
        <State query={bookings} />
        <div className="kpis">
          <article>
            <small>YOUR VISIBLE BOOKINGS</small>
            <h2>{bookings.data?.length ?? "?"}</h2>
          </article>
          <article>
            <small>UPCOMING EVENTS</small>
            <h2>
              {bookings.data?.filter(
                (b) => b.date >= businessDate() && b.status !== "Cancelled",
              ).length ?? "?"}
            </h2>
          </article>
          <article>
            <small>YOUR WORKSPACE</small>
            <h2 className="small-heading">{user.role}</h2>
          </article>
        </div>
        <h2>Your next extraordinary occasion</h2>
        {bookings.data?.length === 0 ? (
          <div className="notice">
            Your celebration starts here.{" "}
            <Link to="/planning">Design your first wedding</Link>
          </div>
        ) : (
          bookings.data
            ?.slice(0, 3)
            .map((b) => (
              <BookingRow key={b._id} b={b} customer={customer} admin={admin} />
            ))
        )}
        <p className="notice">
          Live records from MongoDB. Catalog venues are demo data. External
          messages and gateways require configuration.
        </p>
      </>
    );
  if (tab === "Tasks") return <TaskBoard />;
  if (tab === "Operations reports") return <TeamReports />;
  if (tab === "Calendar")
    return (
      <>
        <EventCalendar />
        <Maintenance />
      </>
    );
  if (tab === "Bookings")
    return (
      <>
        <State query={bookings} />
        {bookings.data?.length === 0 && (
          <p className="notice">No bookings yet.</p>
        )}
        {bookings.data?.map((b) => (
          <BookingRow key={b._id} b={b} customer={customer} admin={admin} />
        ))}
        {!customer && user.role !== "Staff" && (
          <section className="panel">
            <h2>Create an event task</h2>
            {pick}
            <label>
              Assigned team member
              <select
                aria-label="Assigned team member"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              >
                <option value="">Choose team member</option>
                {team.data?.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} - {u.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preparation requirement
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <Action
              run={() =>
                api("/tasks", "POST", {
                  booking: selected,
                  assignedTo: input,
                  title: message,
                })
              }
            >
              Assign task
            </Action>
          </section>
        )}
      </>
    );
  if (tab === "Wedding plan")
    return (
      <>
        {pick}
        {b && <WeddingPlan key={b._id} booking={b} />}
      </>
    );
  if (tab === "Reports")
    return (
      <>
        <div className="filters">
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <a className="button" href="/api/reports/export">
            Export ledger CSV
          </a>
        </div>
        <State query={report} />
        {report.data && (
          <>
            <div className="kpis">
              {[
                "netCollections",
                "expenses",
                "bookedInvoiceTotal",
                "receivables",
                "cashLessExpenses",
              ].map((k) => (
                <article key={k}>
                  <small>{k.replace(/([A-Z])/g, " $1")}</small>
                  <h2 className="small-heading">{money(report.data![k])}</h2>
                </article>
              ))}
            </div>
            <p>{report.data.definitions}</p>
          </>
        )}
      </>
    );
  return (
    <>
      <State query={rows} />
      {tab === "Payments" && customer && (
        <section className="panel">
          <h2>Report a manual payment</h2>
          {pick}
          <label>
            Amount (PKR)
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
          <label>
            Method
            <select
              aria-label="Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="">Choose method</option>
              {["Cash", "Bank Transfer", "Easypaisa", "JazzCash"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Transfer reference / evidence description
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Action
            run={() =>
              api("/bookings/" + selected + "/payments", "POST", {
                amount: Math.round(Number(input) * 100),
                method,
                reference: message,
                key: crypto.randomUUID(),
              })
            }
          >
            Submit for approval
          </Action>
          <p>
            Payments remain pending until a Super Admin checks the reference.
          </p>
        </section>
      )}
      {tab === "Consultations" && customer && (
        <section className="panel">
          <h2>Request a private consultation</h2>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Time
            <select
              aria-label="Time"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="">Choose time</option>
              {["10:00", "12:00", "15:00", "17:00"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Preferences
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Action
            run={() =>
              api("/consultations", "POST", {
                date,
                slot: method,
                notes: message,
              })
            }
          >
            Request appointment
          </Action>
        </section>
      )}
      {tab === "Expenses" && (
        <section className="panel">
          <h2>Record an expense</h2>
          <label>
            Amount (PKR)
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
          <label>
            Category
            <input value={method} onChange={(e) => setMethod(e.target.value)} />
          </label>
          <label>
            Description
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Action
            run={() =>
              api("/expenses", "POST", {
                amount: Math.round(Number(input) * 100),
                category: method,
                description: message,
                key: crypto.randomUUID(),
              })
            }
          >
            Record expense
          </Action>
        </section>
      )}
      {["Venues", "Collections"].includes(tab) && (
        <ResourceEditor kind={tab} records={rows.data || []} />
      )}
      <div className="records">
        {rows.data?.length === 0 && <p className="notice">No records yet.</p>}
        {rows.data?.map((r) => (
          <article className="record" key={r._id}>
            <div>
              <h3>
                {r.title ||
                  r.name ||
                  r.message ||
                  r.action ||
                  r.type ||
                  r.category ||
                  r.date ||
                  r.method}
              </h3>
              <small>
                {r.email ||
                  r.description ||
                  r.notes ||
                  r.reference ||
                  r.target ||
                  r._id}
              </small>
              {r.amount != null && <p>{money(r.amount)}</p>}
              {r.status && <span className="badge">{r.status}</span>}
              {r.role && (
                <p>
                  {r.role} &middot;{" "}
                  {r.venues?.join(", ") || "No assigned venues"}
                </p>
              )}
            </div>
            <div className="record-actions">{admin&&((tab==="Ledger"&&["Payment","Refund","Supplier Payment"].includes(r.type))||(tab==="Expenses"&&r.amount>0))&&<Action run={()=>{const reference=prompt("Reason/reference for reversal");if(!reference)return Promise.resolve();return api((tab==="Ledger"?"/ledger/":"/expenses/")+r._id+"/reverse","POST",{reference,key:crypto.randomUUID()});}}>Record reversal</Action>}
              {tab === "Payments" && r.status === "Approved" && (
                <a
                  href={"/api/payments/" + r._id + "/receipt"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download receipt
                </a>
              )}
              {tab === "Payments" && admin && r.status === "Pending" && (
                <>
                  <Action
                    run={() =>
                      api("/payments/" + r._id + "/approve", "POST", {})
                    }
                  >
                    Approve payment
                  </Action>
                  <Action
                    run={() =>
                      api("/payments/" + r._id + "/reject", "POST", {})
                    }
                  >
                    Reject report
                  </Action>
                </>
              )}
              {tab === "Consultations" &&
                admin &&
                ["Confirmed", "Cancelled"].map((status) => (
                  <Action
                    key={status}
                    run={() =>
                      api("/consultations/" + r._id, "PATCH", { status })
                    }
                  >
                    {status === "Confirmed" ? "Confirm" : "Cancel"}
                  </Action>
                ))}
              {tab === "Inquiries" &&
                admin &&
                ["Confirmed", "Rejected", "Resolved"].map((status) => (
                  <Action
                    key={status}
                    run={() => api("/inquiries/" + r._id, "PATCH", { status })}
                  >
                    {status}
                  </Action>
                ))}
              {tab === "Notifications" && !r.read && (
                <Action run={() => api("/notifications/" + r._id, "PATCH", {})}>
                  Mark read
                </Action>
              )}
              {tab === "Tasks" && (
                <select
                  aria-label="Task status"
                  value={r.status}
                  onChange={async (e) => {
                    try {
                      await api("/tasks/" + r._id, "PATCH", {
                        status: e.target.value,
                      });
                      rows.refetch();
                    } catch (e: any) {
                      setMessage(e.message);
                    }
                  }}
                >
                  {["To Do", "In Progress", "Done"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              {tab === "Customers & staff" && r.role !== "Super Admin" && (
                <UserEditor user={r} />
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function BookingRow({
  b,
  customer,
  admin,
}: {
  b: Row;
  customer: boolean;
  admin: boolean;
}) {
  const [amount, setAmount] = useState(""),
    [ref, setRef] = useState("");
  const [managerId, setManagerId] = useState(b.manager || "");
  const team = useQuery<Row[]>({
    queryKey: ["team-members"],
    queryFn: () => api("/team-members"),
    enabled: admin,
  });
  const next: Record<string, string> = {
    Pending: "Awaiting Advance",
    "Awaiting Advance": "Confirmed",
    Confirmed: "In Progress",
    "In Progress": "Completed",
  };
  return (
    <article className="booking-row">
      <div>
        <span className="badge">{b.status}</span>
        <h3>{b.venue?.name || b.snapshot.venueName}</h3>
        <p>
          {b.event} &middot; {b.date} &middot; {b.slot} &middot; {b.guests}{" "}
          guests
        </p>
        <small>
          {b.customer?.name} &middot; {b.theme}
        </small>
        {(customer || admin) && (
          <p>
            {money(b.snapshot.total)} total &middot; {money(b.paid)} paid
            &middot; {money(b.snapshot.total - b.paid)} balance
          </p>
        )}
      </div>
      <div className="record-actions">
        {(customer || admin) && (
          <a
            href={"/api/bookings/" + b._id + "/invoice"}
            target="_blank"
            rel="noreferrer"
          >
            Download invoice
          </a>
        )}
        {!customer && next[b.status] && (
          <Action
            run={() =>
              api("/bookings/" + b._id + "/status", "PATCH", {
                status: next[b.status],
              })
            }
          >
            Move to {next[b.status]}
          </Action>
        )}
        {["Pending", "Awaiting Advance", "Confirmed"].includes(b.status) && (
          <Action
            run={() => {
              if (!confirm("Cancel this booking and release its slot?"))
                return Promise.resolve();
              return api("/bookings/" + b._id + "/status", "PATCH", {
                status: "Cancelled",
              });
            }}
          >
            Cancel booking
          </Action>
        )}
        {!customer &&
          ["Pending", "Awaiting Advance", "Confirmed"].includes(b.status) && (
            <Reschedule booking={b} />
          )}{" "}
        {admin && (
          <details>
            <summary>Refund / assign manager</summary>
            <label>
              Refund amount (PKR)
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Refund reference
              <input value={ref} onChange={(e) => setRef(e.target.value)} />
            </label>
            <Action
              run={() =>
                api("/bookings/" + b._id + "/refund", "POST", {
                  amount: Math.round(Number(amount) * 100),
                  reference: ref,
                  key: crypto.randomUUID(),
                })
              }
            >
              Record issued refund
            </Action>
            <label>
              Assigned manager
              <select
                aria-label="Assigned manager"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">Choose hall manager</option>
                {team.data
                  ?.filter(
                    (u) =>
                      u.role === "Hall Manager" &&
                      u.venues.includes(b.venue?._id),
                  )
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <Action
              run={() =>
                api("/bookings/" + b._id + "/manager", "PATCH", {
                  manager: managerId,
                })
              }
            >
              Assign manager
            </Action>
          </details>
        )}
      </div>
    </article>
  );
}
function WeddingPlan({ booking: b }: { booking: Row }) {
  const [checklist, setChecklist] = useState<Row[]>(b.checklist || []),
    [guestList, setGuests] = useState<Row[]>(b.guestList || []),
    [timeline, setTimeline] = useState<Row[]>(b.timeline || []),
    [notes, setNotes] = useState(b.notes || ""),
    [title, setTitle] = useState("");
  return (
    <section className="panel">
      <h2>Your wedding notebook</h2>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <h3>Checklist</h3>
      {checklist.map((c, i) => (
        <label className="check" key={i}>
          <input
            type="checkbox"
            checked={c.done}
            onChange={(e) =>
              setChecklist(
                checklist.map((c, n) =>
                  n === i ? { ...c, done: e.target.checked } : c,
                ),
              )
            }
          />
          {c.title}
          <button
            onClick={() => setChecklist(checklist.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </label>
      ))}
      <div className="actions">
        <input
          aria-label="New checklist item"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={() => {
            if (title.trim())
              setChecklist([...checklist, { title, done: false }]);
            setTitle("");
          }}
        >
          Add item
        </button>
      </div>
      <h3>Guests & tables</h3>
      <GuestTools guests={guestList} onImport={setGuests} />
      {guestList.map((g, i) => (
        <div className="form-grid" key={i}>
          <input
            aria-label="Guest name"
            value={g.name}
            onChange={(e) =>
              setGuests(
                guestList.map((g, n) =>
                  n === i ? { ...g, name: e.target.value } : g,
                ),
              )
            }
          />
          <input
            aria-label="Table assignment"
            value={g.table}
            onChange={(e) =>
              setGuests(
                guestList.map((g, n) =>
                  n === i ? { ...g, table: e.target.value } : g,
                ),
              )
            }
          />
        </div>
      ))}
      <button
        onClick={() => setGuests([...guestList, { name: "", table: "" }])}
      >
        Add guest
      </button>
      <h3>Wedding-day timeline</h3>
      {timeline.map((t, i) => (
        <div className="form-grid" key={i}>
          <input
            aria-label="Time"
            value={t.time}
            onChange={(e) =>
              setTimeline(
                timeline.map((t, n) =>
                  n === i ? { ...t, time: e.target.value } : t,
                ),
              )
            }
          />
          <input
            aria-label="Activity"
            value={t.title}
            onChange={(e) =>
              setTimeline(
                timeline.map((t, n) =>
                  n === i ? { ...t, title: e.target.value } : t,
                ),
              )
            }
          />
        </div>
      ))}
      <button
        onClick={() => setTimeline([...timeline, { time: "", title: "" }])}
      >
        Add activity
      </button>
      <hr />
      <Action
        run={() =>
          api("/bookings/" + b._id + "/plan", "PATCH", {
            checklist: checklist.map(({ title, done }) => ({ title, done })),
            guestList: guestList.map(({ name, table }) => ({ name, table })),
            timeline: timeline.map(({ time, title }) => ({ time, title })),
            notes,
          })
        }
      >
        Save wedding plan
      </Action>
    </section>
  );
}
function UserEditor({ user }: { user: Row }) {
  const [role, setRole] = useState(user.role),
    [assigned, setAssigned] = useState<string[]>(user.venues);
  const venues = useData("/venues");
  return (
    <details>
      <summary>Permissions & assignments</summary>
      <label>
        Role
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {["Customer", "Branch Admin", "Hall Manager", "Staff"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <h4>Assigned palaces</h4>
      {venues.data?.map((v) => (
        <label className="check" key={v._id}>
          <input
            type="checkbox"
            checked={assigned.includes(v._id)}
            onChange={(e) =>
              setAssigned(
                e.target.checked
                  ? [...assigned, v._id]
                  : assigned.filter((id) => id !== v._id),
              )
            }
          />
          {v.name}
        </label>
      ))}
      <Action
        run={() =>
          api("/admin/users/" + user._id, "PATCH", { role, venues: assigned })
        }
      >
        Save permissions
      </Action>
    </details>
  );
}
