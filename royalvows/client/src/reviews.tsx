import { useState } from "react";
import { api, useData, State } from "./core";
export function ReviewSubmission() {
  const q = useData("/bookings");
  const [booking, setBooking] = useState(""),
    [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [message, setMessage] = useState("");
  const completed = q.data?.filter((b) => b.status === "Completed") || [];
  return (
    <>
      <State query={q} />
      {completed.length ? (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/reviews", "POST", { booking, rating, text });
              setMessage(
                "Thank you. Your review is saved and awaiting moderation.",
              );
            } catch (e: any) {
              setMessage(e.message);
            }
          }}
        >
          <h2>Remember your celebration</h2>
          <label>
            Completed celebration
            <select
              value={booking}
              required
              onChange={(e) => setBooking(e.target.value)}
            >
              <option value="">Choose event</option>
              {completed.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.venue?.name} - {b.date}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label>
            Your experience
            <textarea
              minLength={10}
              maxLength={2000}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className="button">Submit review</button>
          <p role="status">{message}</p>
        </form>
      ) : (
        <p className="notice">
          Reviews are available after a celebration has been completed.
        </p>
      )}
    </>
  );
}
export function PublishedReviews() {
  const q = useData("/reviews");
  if (!q.data?.length) return null;
  return (
    <section className="section">
      <span className="eyebrow">MEMORIES, IN THEIR OWN WORDS</span>
      <h2>Celebrations remembered.</h2>
      {q.data.map((r) => (
        <blockquote className="published-review" key={r._id}>
          <p>{r.text}</p>
          <small>{r.rating} / 5 - Verified completed booking</small>
        </blockquote>
      ))}
    </section>
  );
}
