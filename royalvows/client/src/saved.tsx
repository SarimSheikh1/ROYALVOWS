import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useData, useUser, VenueCard, type Row } from "./core";
export function SaveVenue({ id }: { id: string }) {
  const { data: session } = useUser();
  const profile = useData("/profile", session?.user.role === "Customer");
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  if (!session || session.user.role !== "Customer") return null;
  const p = profile.data as unknown as Row | undefined;
  const saved = p?.savedVenues?.includes(id);
  return (
    <>
      <button
        className="text-link"
        onClick={async () => {
          try {
            if (!p) throw new Error("Profile is loading");
            await api("/profile", "PATCH", {
              name: p.name,
              savedVenues: saved
                ? p.savedVenues.filter((v: string) => v !== id)
                : [...p.savedVenues, id],
            });
            await qc.invalidateQueries({ queryKey: ["/profile"] });
            setMessage(saved ? "Removed from saved palaces." : "Palace saved.");
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        {saved ? "Remove from saved palaces" : "Save this palace"}
      </button>
      <small role="status">{message}</small>
    </>
  );
}
export function SavedPalaces() {
  const profile = useData("/profile"),
    venues = useData("/venues");
  const p = profile.data as unknown as Row | undefined;
  const records =
    venues.data?.filter((v) => p?.savedVenues?.includes(v._id)) || [];
  return (
    <>
      {!records.length ? (
        <p className="notice">
          No saved palaces yet. Open a palace page and save your favorites.
        </p>
      ) : (
        <div className="venue-grid">
          {records.map((v) => (
            <VenueCard key={v._id} venue={v} />
          ))}
        </div>
      )}
    </>
  );
}
