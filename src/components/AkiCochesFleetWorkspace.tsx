import { rentalCategoryLabels } from "@/lib/akiconduzco";
import {
  createVenueRentalCompany,
  createVenueRentalVehicle,
  createVenueRentalBlock,
  updateVenueRentalBookingStatus,
  updateVenueRentalVehicle,
} from "@/app/[locale]/business/venue/[id]/actions";
import styles from "./AkiCochesFleetWorkspace.module.css";

type Vehicle = {
  id: string;
  name: string;
  category: keyof typeof rentalCategoryLabels;
  transmission: "manual" | "automatic";
  fuel: string;
  seats: number;
  luggage: number;
  daily_price_cents: number;
  deposit_cents: number;
  cover_media_id: string | null;
  active: boolean;
};
type Booking = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: string;
  contact_name: string;
  quoted_total_cents: number;
};
type Block = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export function AkiCochesFleetWorkspace({
  locale,
  venueId,
  venueName,
  company,
  vehicles,
  media,
  bookings,
  blocks,
}: {
  locale: "en" | "es";
  venueId: string;
  venueName: string;
  company: { id: string; status: string } | null;
  vehicles: Vehicle[];
  media: { id: string; alt: string }[];
  bookings: Booking[];
  blocks: Block[];
}) {
  const es = locale === "es";
  if (!company) {
    return (
      <section className={styles.empty}>
        <span>AkiCoches</span>
        <h3>
          {es ? "Activa la flota de este local" : "Enable this venue’s fleet"}
        </h3>
        <p>
          {es
            ? "AkiCoches vive dentro de tu local: comparte equipo, fotos y ubicación, mientras los coches siguen siendo un catálogo de alquiler independiente."
            : "AkiCoches lives inside this venue: it shares its team, photos and location while keeping vehicles as an independent rental catalogue."}
        </p>
        <form action={createVenueRentalCompany}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="name" value={venueName} />
          <button className="button" type="submit">
            {es ? "Activar AkiCoches" : "Enable AkiCoches"}
          </button>
        </form>
      </section>
    );
  }
  const status =
    company.status === "published"
      ? es
        ? "En directo"
        : "Live"
      : es
        ? "En revisión"
        : "In review";
  return (
    <div className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span>AkiCoches · {status}</span>
          <h3>
            {es
              ? "Tu flota, preparada para salir"
              : "Your fleet, ready to move"}
          </h3>
          <p>
            {es
              ? "Añade vehículos, controla su visibilidad y usa la biblioteca multimedia de esta misma pantalla para subir, elegir o retirar fotos."
              : "Add vehicles, control visibility, and use the shared media library below to upload, choose or remove photos."}
          </p>
        </div>
        <div className={styles.metric}>
          <strong>{vehicles.length}</strong>
          <small>{es ? "vehículos" : "vehicles"}</small>
        </div>
      </header>
      <div className={styles.grid}>
        <form className={styles.create} action={createVenueRentalVehicle}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="companyId" value={company.id} />
          <h3>{es ? "Añadir vehículo" : "Add vehicle"}</h3>
          <label>
            {es ? "Nombre visible" : "Listing name"}
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Toyota Yaris"
            />
          </label>
          <div className={styles.two}>
            <label>
              {es ? "Categoría" : "Category"}
              <select name="category" defaultValue="economy">
                {Object.entries(rentalCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {es ? "Transmisión" : "Transmission"}
              <select name="transmission">
                <option value="manual">{es ? "Manual" : "Manual"}</option>
                <option value="automatic">
                  {es ? "Automático" : "Automatic"}
                </option>
              </select>
            </label>
          </div>
          <div className={styles.two}>
            <label>
              {es ? "Precio/día (€)" : "Daily price (€)"}
              <input name="dailyPrice" type="number" min="1" required />
            </label>
            <label>
              {es ? "Fianza (€)" : "Deposit (€)"}
              <input
                name="deposit"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </label>
          </div>
          <div className={styles.two}>
            <label>
              {es ? "Plazas" : "Seats"}
              <input
                name="seats"
                type="number"
                min="2"
                max="9"
                defaultValue="5"
                required
              />
            </label>
            <label>
              {es ? "Maletas" : "Bags"}
              <input
                name="luggage"
                type="number"
                min="0"
                max="12"
                defaultValue="2"
                required
              />
            </label>
          </div>
          <label>
            {es ? "Combustible" : "Fuel"}
            <select name="fuel">
              <option value="petrol">{es ? "Gasolina" : "Petrol"}</option>
              <option value="diesel">{es ? "Diésel" : "Diesel"}</option>
              <option value="hybrid">{es ? "Híbrido" : "Hybrid"}</option>
              <option value="electric">{es ? "Eléctrico" : "Electric"}</option>
            </select>
          </label>
          <label>
            {es ? "Foto de portada" : "Cover image"}
            <select name="mediaId">
              <option value="">
                {es ? "Sin foto todavía" : "No photo yet"}
              </option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.alt}
                </option>
              ))}
            </select>
            <small>
              {es
                ? "Gestiona las fotos en la biblioteca de esta pantalla."
                : "Manage photos in the library on this screen."}
            </small>
          </label>
          <button className="button" type="submit">
            {es ? "Añadir a la flota" : "Add to fleet"}
          </button>
        </form>
        <section className={styles.list}>
          <h3>{es ? "Flota actual" : "Current fleet"}</h3>
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <article key={vehicle.id} className={styles.vehicle}>
                <div>
                  <strong>{vehicle.name}</strong>
                  <small>
                    {rentalCategoryLabels[vehicle.category]?.[locale] ||
                      vehicle.category}{" "}
                    · {vehicle.seats} {es ? "plazas" : "seats"}
                  </small>
                </div>
                <form action={updateVenueRentalVehicle} className={styles.edit}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <input type="hidden" name="companyId" value={company.id} />
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <label>
                    {es ? "Precio/día (€)" : "Daily (€)"}
                    <input
                      name="dailyPrice"
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue={vehicle.daily_price_cents / 100}
                      required
                    />
                  </label>
                  <label>
                    {es ? "Fianza (€)" : "Deposit (€)"}
                    <input
                      name="deposit"
                      type="number"
                      min="0"
                      max="50000"
                      defaultValue={vehicle.deposit_cents / 100}
                      required
                    />
                  </label>
                  <label>
                    {es ? "Portada" : "Cover"}
                    <select
                      name="mediaId"
                      defaultValue={vehicle.cover_media_id || ""}
                    >
                      <option value="">{es ? "Sin foto" : "No photo"}</option>
                      {media.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.alt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {es ? "Estado" : "Status"}
                    <select name="active" defaultValue={String(vehicle.active)}>
                      <option value="true">{es ? "Visible" : "Live"}</option>
                      <option value="false">{es ? "Oculto" : "Hidden"}</option>
                    </select>
                  </label>
                  <button type="submit">{es ? "Guardar" : "Save"}</button>
                </form>
              </article>
            ))
          ) : (
            <p>
              {es
                ? "Añade el primer coche para empezar."
                : "Add the first car to get started."}
            </p>
          )}
        </section>
      </div>
      <div className={styles.grid}>
        <section className={styles.list}>
          <h3>{es ? "Disponibilidad" : "Availability"}</h3>
          <p>
            {es
              ? "Bloquea los días en que un coche no se puede alquilar."
              : "Block dates when a car is unavailable."}
          </p>
          <form action={createVenueRentalBlock} className={styles.create}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="companyId" value={company.id} />
            <label>
              {es ? "Coche" : "Vehicle"}
              <select name="vehicleId" required>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.two}>
              <label>
                {es ? "Desde" : "From"}
                <input type="date" name="start" required />
              </label>
              <label>
                {es ? "Hasta (exclusivo)" : "Until (exclusive)"}
                <input type="date" name="end" required />
              </label>
            </div>
            <button
              className="button"
              type="submit"
              disabled={!vehicles.length}
            >
              {es ? "Bloquear fechas" : "Block dates"}
            </button>
          </form>
          {blocks
            .filter((block) => block.reason === "maintenance")
            .map((block) => (
              <p key={block.id}>
                {vehicles.find((vehicle) => vehicle.id === block.vehicle_id)
                  ?.name || "Vehicle"}{" "}
                · {block.start_date} → {block.end_date}
              </p>
            ))}
        </section>
        <section className={styles.list}>
          <h3>{es ? "Solicitudes" : "Requests"}</h3>
          {bookings.length ? (
            bookings.map((booking) => (
              <article key={booking.id} className={styles.request}>
                <strong>
                  {booking.contact_name} ·{" "}
                  {vehicles.find((vehicle) => vehicle.id === booking.vehicle_id)
                    ?.name || "Vehicle"}
                </strong>
                <small>
                  {booking.start_date} → {booking.end_date} · €
                  {(booking.quoted_total_cents / 100).toFixed(0)} ·{" "}
                  {booking.status}
                </small>
                {booking.status === "requested" && (
                  <form action={updateVenueRentalBookingStatus}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="companyId" value={company.id} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button name="status" value="confirmed" type="submit">
                      {es ? "Confirmar" : "Confirm"}
                    </button>
                    <button name="status" value="declined" type="submit">
                      {es ? "Rechazar" : "Decline"}
                    </button>
                  </form>
                )}
              </article>
            ))
          ) : (
            <p>{es ? "Aún no hay solicitudes." : "No requests yet."}</p>
          )}
        </section>
      </div>
    </div>
  );
}
