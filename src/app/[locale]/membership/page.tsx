import { notFound } from "next/navigation";
import { SuitePricingExperience } from "@/components/SuitePricingExperience";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Memberships · AkiHQ",
  robots: { index: false, follow: false },
};

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "es") notFound();
  return (
    <SuitePricingExperience
      locale={locale}
      product="akihq"
      personalUnlocked={false}
      logo="/brand/hq-mark.svg"
    />
  );
}
