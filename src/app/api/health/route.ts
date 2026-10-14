export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { product: "akibusiness", status: "ok" },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
