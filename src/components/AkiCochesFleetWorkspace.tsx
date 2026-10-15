import type { ReactNode } from "react";
import { RentalOperatorDesk } from "./RentalOperatorDesk";
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
  mediaStudio,
  readError,
  feedback,
}: {
  locale: "en" | "es";
  venueId: string;
  venueName: string;
  company: {
    id: string;
    status: string;
    slug?: string;
    name?: string;
    city?: string;
    address?: string;
  } | null;
  vehicles: Vehicle[];
  media: { id: string; alt: string; url?: string }[];
  mediaStudio?: ReactNode;
  readError?: boolean;
  feedback?: "error" | "success";
  bookings: Booking[];
  blocks: Block[];
}) {
  const es = locale === "es";
  if (readError && !company)
    return (
      <p role="alert">
        {es
          ? "No se pudo cargar la empresa. Recarga la página."
          : "Could not load the company. Reload the page."}
      </p>
    );
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
  return (
    <RentalOperatorDesk
      locale={locale}
      venueId={venueId}
      company={{ ...company, name: company.name || venueName }}
      vehicles={vehicles}
      media={media}
      bookings={bookings}
      blocks={blocks}
      mediaStudio={mediaStudio}
      readError={readError}
      feedback={feedback}
      actions={{
        create: createVenueRentalVehicle,
        update: updateVenueRentalVehicle,
        block: createVenueRentalBlock,
        booking: updateVenueRentalBookingStatus,
      }}
    />
  );
}
