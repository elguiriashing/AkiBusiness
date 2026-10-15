import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { config, isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { roleSwapEnabled } from "@/lib/product-roles";
import { createPrivateLocation } from "./actions";
export default async function PrivateLocations({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(
    locale,
    `/${locale}/business/locations`,
  );
  const query = await searchParams;
  const es = locale === "es";
  const ready =
    roleSwapEnabled && process.env.AKISUITE_PRIVATE_LOCATIONS_READY === "true";
  const parsedPage = Number(query.page || "0");
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 0
      ? Math.min(parsedPage, 200)
      : 0;
  const { data: memberships, error } = await supabase.rpc(
    "list_managed_operating_locations",
    { p_limit: 50, p_offset: page * 50 },
  );
  const requestId = z.string().uuid().safeParse(query.requestId);
  return (
    <main className="business-main">
      <Link href={`/${locale}/business`}>
        {es ? "Volver a mi gestión" : "Back to management"}
      </Link>
      <h1>
        {es ? "Ubicaciones de trabajo privadas" : "Private operating locations"}
      </h1>
      <p>
        {es
          ? "Crea un espacio de trabajo sin publicar una ficha. Cada ubicación conserva sus propios permisos. Las funciones de pago requieren su plan correspondiente."
          : "Create a workspace without publishing a listing. Each location retains its own permissions. Paid features require their applicable plan."}
      </p>
      {error && (
        <p role="alert">
          {es
            ? "No se pudieron cargar tus ubicaciones."
            : "Your locations could not be loaded."}
        </p>
      )}
      {query.error && (
        <p role="alert">
          {query.error === "conflict"
            ? es
              ? "Esta solicitud ya se usó con otro nombre. Conserva el nombre original para reintentar."
              : "This request was already used with another name. Keep the original name to retry."
            : es
              ? "No se pudo crear la ubicación. Revisa los datos o reintenta cuando el servicio esté disponible."
              : "The location could not be created. Check the details or retry when the service is available."}
        </p>
      )}
      {!error && (
        <ul>
          {(memberships || []).map(
            (workspace: { id: string; name: string }) => (
              <li key={workspace.id}>
                <a
                  href={`${config.crmUrl}/?workspace=${encodeURIComponent(workspace.id)}`}
                >
                  {workspace.name}
                </a>
              </li>
            ),
          )}
        </ul>
      )}
      {!error && (
        <nav aria-label={es ? "Páginas de ubicaciones" : "Location pages"}>
          {page > 0 && (
            <Link href={`/${locale}/business/locations?page=${page - 1}`}>
              {es ? "Anterior" : "Previous"}
            </Link>
          )}
          {(memberships || []).length === 50 && page < 200 && (
            <Link href={`/${locale}/business/locations?page=${page + 1}`}>
              {es ? "Siguiente" : "Next"}
            </Link>
          )}
        </nav>
      )}
      {ready ? (
        <form action={createPrivateLocation}>
          <input type="hidden" name="locale" value={locale} />
          <input
            type="hidden"
            name="requestId"
            value={requestId.success ? requestId.data : crypto.randomUUID()}
          />
          <label>
            {es ? "Nombre de la ubicación" : "Location name"}
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={query.name?.slice(0, 120) || ""}
            />
          </label>
          <button type="submit">
            {es ? "Crear ubicación privada" : "Create private location"}
          </button>
        </form>
      ) : (
        <p>
          {es
            ? "La creación de nuevas ubicaciones aún no está disponible. Tus espacios existentes conservan su acceso."
            : "New location creation is not available yet. Existing workspaces retain their access."}
        </p>
      )}
    </main>
  );
}
