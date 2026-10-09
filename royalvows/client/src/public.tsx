import { PackageOffer } from "./package-offer";
import { businessDate } from "./core";
import { PublishedReviews } from "./reviews";
import { SaveVenue } from "./saved";
import { MediaGallery } from "./media";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import {
  api,
  useData,
  useUser,
  State,
  VenueCard,
  Monogram,
  image,
  money,
  themes,
  events,
  type Row,
} from "./core";
function Intro() {
  const [show, setShow] = useState(
    () =>
      !sessionStorage.getItem("rv-intro") &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  function close() {
    sessionStorage.setItem("rv-intro", "1");
    setShow(false);
  }
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(close, 1300);
    return () => clearTimeout(t);
  }, [show]);
  return show ? (
    <div className="intro">
      <Monogram />
      <span>ROYALVOWS</span>
      <button onClick={close}>Skip introduction</button>
    </div>
  ) : null;
}
export function Home() {
  const venues = useData("/venues");
  return (
    <>
      <Intro />
      <section
        className="hero"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(9,11,16,.75),rgba(9,11,16,.12)),url(/media/wedding-ballroom.webp)",
        }}
      >
        <div className="hero-copy">
          <span className="eyebrow">A CELEBRATION BEYOND THE ORDINARY</span>
          <h1>
            Every love story
            <br />
            deserves <em>a palace.</em>
          </h1>
          <p>
            Discover extraordinary venues, bespoke celebrations, and
            unforgettable moments crafted with timeless elegance.
          </p>
          <div className="actions">
            <Link className="button" to="/palaces">
              Explore our palaces <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" to="/planning">
              Design your wedding <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-bottom">
          <span>THE BEGINNING OF YOUR FOREVER</span>
          <span>01 &middot; THE ROYAL COLLECTION</span>
        </div>
        <small className="media-label">
          Real wedding photography &middot; illustrative venue imagery
        </small>
      </section>
      <div className="celebration-ribbon" aria-hidden="true">
        <div className="celebration-ribbon-track">
          {Array.from({ length: 3 }, (_, i) => <span key={i}>Timeless celebrations <i>✦</i> Signature palaces <i>✦</i> Your forever begins here <i>✦</i></span>)}
        </div>
      </div>
      <section className="statement">
        <span className="eyebrow">WELCOME TO ROYALVOWS</span>
        <h2>
          Some moments deserve
          <br />
          <em>an extraordinary setting.</em>
        </h2>
        <p>
          From an intimate nikah to a magnificent walima, we imagine every
          detail around your story. Explore our illustrative palace collection
          and begin a celebration that feels entirely yours.
        </p>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SPACES WITH A SOUL</span>
            <h2>The palace collection</h2>
          </div>
          <Link to="/palaces">
            Discover all palaces <ArrowUpRight size={18} />
          </Link>
        </div>
        <State query={venues} />
        <div className="venue-grid">
          {venues.data?.slice(0, 3).map((v) => (
            <VenueCard key={v._id} venue={v} />
          ))}
        </div>
      </section>
      <SignaturePreview />
      <section className="split dark">
        <img
          src={image}
          alt="Illustrative elegant wedding dining room"
          loading="lazy"
        />
        <div>
          <span className="eyebrow">YOUR VISION, BEAUTIFULLY REALIZED</span>
          <h2>
            A celebration
            <br />
            <em>as unique as you.</em>
          </h2>
          <p>
            A considered collection. A palette you love. A menu to remember.
            Shape your day and see an estimate calculated from our current venue
            and collection rates.
          </p>
          <Link className="button" to="/planning">
            Design your wedding <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section aerial">
        <span className="eyebrow">A NEW PERSPECTIVE</span>
        <h2>A Palace View from the Sky</h2>
        <figure className="aerial-art">
          <img
            src="/media/palace-aerial-concept.webp"
            alt="AI-generated aerial concept of a fictional wedding palace, gardens and entrance"
            loading="lazy"
          />
          <figcaption>
            Concept aerial visualization &middot; AI-generated fictional palace
            &middot; not an actual drone photograph
          </figcaption>
        </figure>
        <p>
          An imagined palace at golden hour: grand arrival, landscaped lawns and
          luminous rooftop architecture. Authentic venue drone footage can be
          added through gallery management.
        </p>
      </section>
      <section className="split">
        <div>
          <span className="eyebrow">THE TASTE OF AN OCCASION</span>
          <h2>
            Beautifully served.
            <br />
            <em>Fondly remembered.</em>
          </h2>
          <p>
            Thoughtful menus, gracious service and a dining experience worthy of
            your celebration. Dietary requirements are recorded with your
            booking for planning.
          </p>
          <Link className="text-link" to="/catering">
            Explore the culinary experience <ArrowUpRight />
          </Link>
        </div>
        <img
          src="/media/wedding-dining.webp"
          alt="Illustrative fine dining presentation"
          loading="lazy"
        />
      </section>
      <section className="section brand-promise">
        <span className="eyebrow">THE ROYALVOWS PROMISE</span>
        <h2>Every detail, considered.</h2>
        <div className="promise-grid">
          {[
            "A setting worthy of your story",
            "Thoughtful hospitality",
            "Clarity from your first estimate",
          ].map((s, i) => (
            <article key={s}>
              <span className="eyebrow">0{i + 1}</span>
              <h3>{s}</h3>
              <p>
                {
                  [
                    "Explore atmospheric palaces, from intimate indoor settings to open-air celebrations.",
                    "Capture dietary needs, arrival plans and the moments that matter in your wedding notebook.",
                    "See venue, collection, decor and configured tax rates before submitting your request.",
                  ][i]
                }
              </p>
            </article>
          ))}
        </div>
        <Link className="text-link" to="/services">
          Explore signature experiences <ArrowUpRight />
        </Link>
      </section>
      <PublishedReviews />
      <section className="cta">
        <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h2>
          Come for a private viewing.
          <br />
          <em>Stay for the possibility.</em>
        </h2>
        <Link className="button" to="/contact">
          Request a private tour <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
export function Palaces() {
  const [search, setSearch] = useState(""),
    [guests, setGuests] = useState(""),
    [outdoor, setOutdoor] = useState("");
  const [city, setCity] = useState(""),
    [minPrice, setMinPrice] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [event, setEvent] = useState(""),
    [facility, setFacility] = useState("");
  const q = useData(
    "/venues?" +
      new URLSearchParams({
        search,
        ...(guests ? { guests } : {}),
        ...(outdoor ? { outdoor } : {}),
        ...(city ? { city } : {}),
        ...(minPrice ? { minPrice: String(Number(minPrice) * 100) } : {}),
        ...(maxPrice ? { maxPrice: String(Number(maxPrice) * 100) } : {}),
        ...(event ? { event } : {}),
        ...(facility ? { facility } : {}),
      }),
  );
  return (
    <main className="section page">
      <span className="eyebrow">FIND YOUR EXTRAORDINARY</span>
      <h1>Our palaces</h1>
      <p>Eight illustrative settings. One unforgettable beginning.</p>
      <div className="filters">
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Palace name"
          />
        </label>
        <label>
          Minimum capacity
          <input
            type="number"
            min="0"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </label>
        <label>
          Setting
          <select
            aria-label="Setting"
            value={outdoor}
            onChange={(e) => setOutdoor(e.target.value)}
          >
            <option value="">All settings</option>
            <option value="false">Indoor</option>
            <option value="true">Outdoor</option>
          </select>
        </label>
        <button
          onClick={() => {
            setSearch("");
            setGuests("");
            setOutdoor("");
            setCity("");
            setMinPrice("");
            setMaxPrice("");
            setEvent("");
            setFacility("");
          }}
        >
          Reset filters
        </button>
        <label>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Exact city name"
          />
        </label>
        <label>
          Minimum rental (PKR)
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>
        <label>
          Maximum rental (PKR)
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
        <label>
          Occasion
          <select
            aria-label="Filter occasion"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="">All occasions</option>
            {events.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Facility
          <select
            aria-label="Filter facility"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
          >
            <option value="">All facilities</option>
            {[
              "Bridal suite",
              "Groom suite",
              "Accessible entry",
              "Climate control",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <State query={q} />
      {q.data?.length === 0 && (
        <p className="notice">No palaces match. Try fewer filters.</p>
      )}
      <div className="venue-grid">
        {q.data?.map((v) => (
          <VenueCard key={v._id} venue={v} />
        ))}
      </div>
    </main>
  );
}
export function Palace() {
  const { id } = useParams();
  const q = useQuery<Row>({
    queryKey: ["venue", id],
    queryFn: () => api("/venues/" + id),
  });
  const [month, setMonth] = useState(businessDate().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState("");
  const avail = useData("/availability/" + id + "?month=" + month);
  const v = q.data;
  return (
    <main className="page">
      <State query={q} />
      {v && (
        <>
          <div className="detail-hero">
            <img src={v.image} alt={"Demo venue atmosphere: " + v.name} />
            <div>
              <span className="eyebrow">
                {v.demo ? "DEMO VENUE" : "PALACE COLLECTION"} &middot; {v.city}
              </span>
              <h1>{v.name}</h1>
              <p>{v.description}</p>
              <Link className="button" to={"/planning?venue=" + id}>
                Design your celebration <ArrowUpRight />
              </Link>
              <SaveVenue id={id!} />
            </div>
          </div>
          <section className="section two-col">
            <div>
              <h2>A considered setting</h2>
              <p>
                Up to {v.capacity} guests &middot; {money(v.rental)} venue
                rental
              </p>
              {v.amenities.map((a: string) => (
                <p key={a}>&middot; {a}</p>
              ))}
              {v.address ? (
                <address>{v.address}</address>
              ) : (
                <p className="notice">
                  Verified address awaits owner configuration.
                </p>
              )}
              {v.parkingCapacity > 0 && (
                <p>Parking capacity: {v.parkingCapacity} vehicles</p>
              )}
              {v.floorPlan && (
                <a
                  className="text-link"
                  href={v.floorPlan}
                  target="_blank"
                  rel="noreferrer"
                >
                  View seating / floor plan
                </a>
              )}
            </div>
            <div>
              <h2>Availability</h2>
              <label>
                Month
                <input
                  type="month"
                  value={month}
                  min={businessDate().slice(0, 7)}
                  onChange={(e) => {
                    if (e.target.value) setMonth(e.target.value);
                    setSelectedDate("");
                  }}
                />
              </label>
              <State query={avail} />
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
                {Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).getDay() }, (_, i) => <span aria-hidden="true" key={"blank-" + i} />)}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const d = month + "-" + String(i + 1).padStart(2, "0");
                    const slots = avail.data?.filter((r) => r.date === d) || [];
                    const past = d < businessDate();
                    const full = ["Lunch", "Evening"].every((slot) => slots.some((r) => r.slot === slot));
                    return (
                      <button type="button" key={d} className={selectedDate === d ? "selected" : ""} aria-label={d + (past ? " past date" : full ? " reserved" : " choose date")} aria-pressed={selectedDate === d} disabled={past || full || !avail.data || avail.isFetching || !!avail.error} onClick={() => setSelectedDate(d)}>
                        <strong>{i + 1}</strong>
                        <small>
                          {past ? "Past" : !avail.data || avail.isFetching ? "Loading" : full
                            ? "Reserved"
                            : slots.length === 1
                              ? slots[0].slot + " reserved"
                              : "Available"}
                        </small>
                      </button>
                    );
                  },
                )}
              </div>
              {selectedDate && avail.data && !avail.isFetching && !avail.error && (
                <div className="calendar-selection">
                  <p>Choose a time for {selectedDate}</p>
                  {["Lunch", "Evening"].map((slot) => avail.data!.some((r) => r.date === selectedDate && r.slot === slot)
                    ? <span className="notice" key={slot}>{slot} reserved</span>
                    : <Link className="button" key={slot} to={"/planning?" + new URLSearchParams({ venue: id!, date: selectedDate, slot }).toString()}>Book {slot}</Link>)}
                </div>
              )}
              <small>
                Lunch: 12:00-16:00 &middot; Evening: 18:00-23:00. Pending
                requests reserve their slot until reviewed or cancelled.
              </small>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
export function Collections() {
  const q = useData("/packages");
  return (
    <main className="section page">
      <span className="eyebrow">A SIGNATURE FOR EVERY STORY</span>
      <h1>Wedding collections</h1>
      <PackageOffer />
      <p>
        Database-managed demo prices. Your estimate is calculated on the server.
      </p>
      <State query={q} />
      <div className="collection-grid">
        {q.data?.map((p, i) => (
          <article key={p._id}>
            <span className="eyebrow">0{i + 1} / THE COLLECTION</span>
            <h2>{p.name}</h2>
            <p>{money(p.perHead)} per guest</p>
            <small>
              Decor from {money(p.decor)} &middot; {p.minGuests}&middot;
              {p.maxGuests} guests
            </small>
            <ul>
              {p.inclusions.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <Link className="text-link" to="/planning">
              Make it yours <ArrowUpRight />
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
export function Planning() {
  const venues = useData("/venues"),
    packs = useData("/packages"),
    addons = useData("/services"),
    menus = useData("/menus");
  const { data: user } = useUser();
  const nav = useNavigate();
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [estimate, setEstimate] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    venue: new URLSearchParams(location.search).get("venue") || "",
    package: "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get("date") || "") ? new URLSearchParams(location.search).get("date")! : "",
    slot: new URLSearchParams(location.search).get("slot") === "Lunch" ? "Lunch" : "Evening",
    event: "Walima",
    guests: 150,
    theme: "Ivory Elegance",
    notes: "",
    addons: [] as string[],
    cateringMenu: "",
    discountCode: "",
  });
  const set = (k: string, v: unknown) => {
    setForm({ ...form, [k]: v });
    setEstimate(null);
    setError("");
  };
  function validateStep(target: number) {
    if (target < 1) return true;
    const venue = venues.data?.find((v) => v._id === form.venue);
    let message = "";
    if (!venue) message = "Choose a palace before continuing.";
    else if (!form.date || form.date < businessDate()) message = "Choose today or a future event date.";
    else if (!Number.isInteger(form.guests) || form.guests < 1 || form.guests > venue.capacity) message = `Enter a whole guest count between 1 and ${venue.capacity} for this palace.`;
    if (message) {
      setError(message);
      setStep(0);
      return false;
    }
    if (target > 1) {
      const collection = packs.data?.find((p) => p._id === form.package);
      if (!collection) message = "Choose a wedding collection before calculating your estimate.";
      else if (form.guests < collection.minGuests || form.guests > collection.maxGuests) message = `${collection.name} supports ${collection.minGuests} to ${collection.maxGuests} guests. Choose another collection or change your guest count.`;
      if (message) {
        setError(message);
        setStep(1);
        return false;
      }
    }
    return true;
  }
  function goToStep(target: number) {
    if (target <= step || validateStep(target)) {
      setStep(target);
      setError("");
    }
  }
  async function quote() {
    if (!validateStep(2)) return;
    setBusy(true);
    setError("");
    try {
      setEstimate(
        await api("/estimate", "POST", {
          ...form,
          cateringMenu: form.cateringMenu || undefined,
        }),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!validateStep(2)) return;
    if (!user) {
      nav("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/bookings", "POST", {
        ...form,
        cateringMenu: form.cateringMenu || undefined,
      });
      nav("/portal");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="section page">
      <span className="eyebrow">BESPOKE BY YOU</span>
      <h1>Design your wedding</h1>
      <div className="steps">
        {["Palace & occasion", "Collection & design", "Details & estimate"].map(
          (s, i) => (
            <button
              className={step === i ? "active" : ""}
              key={s}
              onClick={() => goToStep(i)}
            >
              {i + 1}. {s}
            </button>
          ),
        )}
      </div>
      <State query={venues} />
      <State query={packs} />
      <div className="wizard">
        <div>
          {step === 0 && (
            <>
              <h2>The beginning of forever</h2>
              <label>
                Palace
                <select
                  aria-label="Palace"
                  value={form.venue}
                  onChange={(e) => set("venue", e.target.value)}
                >
                  <option value="">Choose a palace</option>
                  {venues.data?.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} &middot; up to {v.capacity}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Occasion
                  <select
                    aria-label="Occasion"
                    value={form.event}
                    onChange={(e) => set("event", e.target.value)}
                  >
                    {events.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Guests
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={form.guests}
                    onChange={(e) => set("guests", Number(e.target.value))}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    min={businessDate()}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </label>
                <label>
                  Time slot
                  <select
                    aria-label="Time slot"
                    value={form.slot}
                    onChange={(e) => set("slot", e.target.value)}
                  >
                    <option>Lunch</option>
                    <option>Evening</option>
                  </select>
                </label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Your signature style</h2>
              <PackageOffer />
              <label>
                Collection
                <select
                  aria-label="Collection"
                  value={form.package}
                  onChange={(e) => set("package", e.target.value)}
                >
                  <option value="">Choose your collection</option>
                  {packs.data?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} &middot; {money(p.perHead)} / guest
                    </option>
                  ))}
                </select>
              </label>
              <h3>Choose a mood</h3>
              <div className="theme-grid">
                {themes.map((t, i) => (
                  <button
                    className={form.theme === t ? "selected" : ""}
                    key={t}
                    onClick={() => set("theme", t)}
                  >
                    <span
                      style={{
                        background: [
                          "#C9A76A",
                          "#EEE7DC",
                          "#426653",
                          "#AABCCA",
                          "#C9958C",
                          "#481E2A",
                          "#090B10",
                          "#BDB7AD",
                        ][i],
                      }}
                    />
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>The personal details</h2>
              <label>
                Catering menu
                <select
                  aria-label="Catering menu"
                  value={form.cateringMenu}
                  onChange={(e) => set("cateringMenu", e.target.value)}
                >
                  <option value="">Use collection menu</option>
                  {menus.data?.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} - {money(m.perHead)} per guest
                    </option>
                  ))}
                </select>
              </label>
              <PackageOffer />
              <h3>Signature add-ons</h3>
              {addons.data?.length === 0 && (
                <p>No additional services configured.</p>
              )}
              {addons.data?.filter((a) => !a.includedWithPackage).map((a) => (
                <label className="check" key={a._id}>
                  <input
                    type="checkbox"
                    checked={form.addons.includes(a._id)}
                    onChange={(e) =>
                      set(
                        "addons",
                        e.target.checked
                          ? [...form.addons, a._id]
                          : form.addons.filter((id) => id !== a._id),
                      )
                    }
                  />
                  {a.name} - {money(a.rate)} / {a.unit}
                </label>
              ))}
              <label>
                Discount code (optional)
                <input
                  value={form.discountCode}
                  onChange={(e) => set("discountCode", e.target.value)}
                />
              </label>
              <label>
                Requirements, dietary needs, seating, photography and add-ons
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={2000}
                />
              </label>
              <p>
                Selected menu and add-ons are priced from database records.
                Additional requirements are reviewed during consultation.
              </p>
              <button className="button" disabled={busy} onClick={quote}>
                Calculate authoritative estimate
              </button>
            </>
          )}
          <div className="actions">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}>Back</button>
            )}
            {step < 2 && (
              <button className="button" onClick={() => goToStep(step + 1)}>
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <aside className="estimate">
          <span className="eyebrow">YOUR CELEBRATION</span>
          <h2>A beautiful beginning.</h2>
          <p>
            {venues.data?.find((v) => v._id === form.venue)?.name ||
              "Choose your palace"}
          </p>
          <p>
            {form.event} &middot; {form.guests} guests
            <br />
            {form.date || "Date to be chosen"} &middot; {form.slot}
          </p>
          <p>{packs.data?.find((p) => p._id === form.package)?.name || "Collection not chosen"}</p>
          <p>{form.theme}</p>
          {estimate ? (
            <>
              {["rental", "catering", "decor", "addons", "discount", "tax"].map(
                (k) => (
                  <div className="money-row" key={k}>
                    <span>{k}</span>
                    <strong>{money(estimate[k])}</strong>
                  </div>
                ),
              )}
              <div className="money-row total">
                <span>Total</span>
                <strong>{money(estimate.total)}</strong>
              </div>
              <button className="button" disabled={busy} onClick={submit}>
                {user ? "Submit booking request" : "Sign in to book"}
              </button>
            </>
          ) : (
            <small>
              Calculate your estimate on the final step. Submission rechecks
              pricing and reserves the slot atomically.
            </small>
          )}
        </aside>
      </div>
    </main>
  );
}
export function Contact() {
  const settings = useQuery<Row>({
    queryKey: ["public-settings"],
    queryFn: () => api("/settings"),
  });
  const { data: user } = useUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ name: string; email: string; message: string }>();
  const [message, setMessage] = useState("");
  return (
    <main className="section page two-col">
      <div>
        <span className="eyebrow">LET'S BEGIN A CONVERSATION</span>
        <h1>
          Your story.
          <br />
          <em>Our inspiration.</em>
        </h1>
        <p>
          Tell us what you imagine. Submit an inquiry or request a consultation
          from your portal.
        </p>
        {settings.data?.contactConfigured ? (
          <address>
            <p>{settings.data.address}</p>
            <a href={"tel:" + settings.data.phone}>{settings.data.phone}</a>
            {settings.data.whatsapp && (
              <p>
                <a
                  href={"https://wa.me/" + settings.data.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp inquiry
                </a>
              </p>
            )}
          </address>
        ) : (
          <p className="notice">
            Phone, address and WhatsApp await owner configuration.
          </p>
        )}
        <Link className="button" to={user ? "/portal" : "/login"}>
          Request a private tour
        </Link>
      </div>
      <form
        className="panel"
        onSubmit={handleSubmit(async (values) => {
          try {
            await api("/inquiries", "POST", values);
            setMessage("Inquiry saved. Email delivery is not configured.");
            reset();
          } catch (e: any) {
            setMessage(e.message);
          }
        })}
      >
        <label>
          Name
          <input {...register("name", { required: true, minLength: 2 })} />
        </label>
        <label>
          Email
          <input type="email" {...register("email", { required: true })} />
        </label>
        <label>
          Your vision
          <textarea
            rows={6}
            {...register("message", { required: true, minLength: 10 })}
          />
        </label>
        <button className="button" disabled={isSubmitting}>
          Send inquiry <ArrowUpRight />
        </button>
        <p role="status">{message}</p>
      </form>
    </main>
  );
}
export function Gallery() {
  return (
    <main className="section page">
      <span className="eyebrow">THE BEAUTY IN EVERY DETAIL</span>
      <h1>Grand gallery</h1>
      <MediaGallery />
    </main>
  );
}
export const content: Record<
  string,
  { title: string; intro: string; items: string[] }
> = {
  story: {
    title: "The art of celebration.",
    intro:
      "RoyalVows brings a considered approach to spaces, hospitality and the details that make a day yours.",
    items: [
      "A palace for your story",
      "Thoughtful planning from first conversation to final farewell",
      "An illustrative collection awaiting real property configuration",
    ],
  },
  services: {
    title: "Signature experiences.",
    intro:
      "A celebration is a thousand thoughtful details, beautifully brought together.",
    items: [
      "Wedding coordination and event timelines",
      "Floral and stage design consultation",
      "Photography, sound and lighting requirements",
      "Guest seating and arrival planning",
    ],
  },
  catering: {
    title: "A menu to remember.",
    intro:
      "Explore collection-based dining estimates and record dietary requirements for your planner.",
    items: [
      "Menus and dietary needs confirmed during consultation",
      "Per-head pricing from the selected collection",
      "Kitchen and supplier operations require further setup",
    ],
  },
  privacy: {
    title: "Privacy notice | draft.",
    intro:
      "This platform stores account, booking and payment-report information in MongoDB. The operator must finalize this notice before launch.",
    items: [
      "Passwords are hashed; sessions use HTTP-only cookies.",
      "Payment card credentials are never collected.",
      "Retention and operator legal contacts require configuration.",
    ],
  },
  terms: {
    title: "Booking terms | draft.",
    intro:
      "Demo estimates do not constitute a production contract. Operator terms must be approved before launch.",
    items: [
      "Pending requests reserve fixed slots until reviewed or cancelled.",
      "Manual payments require authorized approval.",
      "Cancellation releases the slot; refunds are recorded separately.",
    ],
  },
};
export function Editorial({ kind }: { kind: string }) {
  const c = content[kind];
  return (
    <main className="section page editorial">
      <span className="eyebrow">ROYALVOWS</span>
      <h1>{c.title}</h1>
      <p className="lead">{c.intro}</p>
      {c.items.map((s, i) => (
        <section key={s}>
          <span className="eyebrow">0{i + 1}</span>
          <h2>{s}</h2>
        </section>
      ))}
      <Link className="button" to="/contact">
        Begin a conversation <ArrowUpRight />
      </Link>
    </main>
  );
}

function SignaturePreview() {
  const q = useData("/packages");
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CRAFTED FOR YOUR OCCASION</span>
          <h2>Signature collections</h2>
        </div>
        <Link to="/collections">
          Discover your collection <ArrowUpRight />
        </Link>
      </div>
      <State query={q} />
      <PackageOffer />
      <div className="signature-list">
        {q.data?.map((r, i) => (
          <Link to="/collections" key={r._id}>
            <span>0{i + 1}</span>
            <h3>{r.name}</h3>
            <small>From {money(r.perHead)} per guest</small>
            <ArrowUpRight />
          </Link>
        ))}
      </div>
    </section>
  );
}
