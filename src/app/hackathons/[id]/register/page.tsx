import { Suspense } from "react";
import { RegisterClient } from "./register-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HackathonRegisterPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Loading registration form...</p>
        </div>
      }
    >
      <RegisterWrapper params={params} />
    </Suspense>
  );
}

async function RegisterWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegisterClient hackathonId={id} />;
}
