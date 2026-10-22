import { Suspense } from "react";
import { RegistrationsClient } from "./registrations-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HackathonRegistrationsPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Loading registrations manager...</p>
        </div>
      }
    >
      <RegistrationsWrapper params={params} />
    </Suspense>
  );
}

async function RegistrationsWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegistrationsClient hackathonId={id} />;
}
