import { useData } from "./core";
export function PackageOffer() {
  const services = useData("/services");
  const included = services.data?.filter((service) => service.includedWithPackage);
  if (!included?.length) return null;
  return <aside className="package-offer" aria-label="Complimentary package benefits">
    <span className="eyebrow">OUR GIFT TO YOUR CELEBRATION</span>
    <h3>More joy, included.</h3>
    <p>Choose any wedding collection and enjoy these complimentary extras.</p>
    <ul>{included.map((service) => <li key={service._id}>{service.description || service.name} <strong>Included free</strong></li>)}</ul>
  </aside>;
}