import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
export type Row = Record<string, any>;
export const money = (n: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(n / 100);
let csrf = "";
export async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Request failed");
  if (j.data?.csrf) csrf = j.data.csrf;
  return j.data;
}
export function useData(path: string) {
  return useQuery<Row[]>({
    queryKey: [path],
    queryFn: () => api(path),
    retry: 1,
  });
}
export function useUser() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: () => api("/auth/me"),
    retry: false,
  });
}
export const image =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=2000&q=85";
export const themes = [
  "Royal Gold",
  "Ivory Elegance",
  "Enchanted Garden",
  "Crystal Palace",
  "Rose Gold Romance",
  "Mughal Heritage",
  "Midnight Luxury",
  "Modern Minimal Glamour",
];
export const events = ["Barat", "Walima", "Mehndi", "Nikah"];
export function State({ query }: { query: any }) {
  if (query.isPending)
    return (
      <p className="notice" role="status">
        Preparing your experience...
      </p>
    );
  if (query.error)
    return (
      <div className="notice" role="alert">
        {query.error.message}
        <button onClick={() => query.refetch()}>Retry</button>
        <small>Start the API and MongoDB using the setup instructions.</small>
      </div>
    );
  return null;
}
export function Monogram() {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-label="RoyalVows monogram"
      className="monogram"
    >
      <path
        d="M14 63V17h18q20 0 20 13t-20 13H14m19 0 21 20M43 17l17 46 17-46M8 8h64v64H8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
export function VenueCard({ venue: v }: { venue: Row }) {
  return (
    <Link to={"/palaces/" + v._id} className="venue-card">
      <div className="venue-photo">
        <img
          src={v.image}
          alt={"Demo atmosphere for " + v.name}
          loading="lazy"
        />
        <span>{v.demo ? "DEMO VENUE" : "PALACE COLLECTION"}</span>
        <ArrowUpRight />
      </div>
      <small>
        {v.city} &middot; {v.outdoor ? "Garden / outdoor" : "Indoor palace"}{" "}
        &middot; Up to {v.capacity} guests
      </small>
      <h3>{v.name}</h3>
      <p>Venue rental from {money(v.rental)}</p>
    </Link>
  );
}

export const businessDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
