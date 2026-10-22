import { Suspense } from "react";
import { VerifyClient } from "./verify-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function CertificateVerifyPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Verifying credential on institution ledger...</p>
        </div>
      }
    >
      <VerifyWrapper params={params} />
    </Suspense>
  );
}

async function VerifyWrapper({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <VerifyClient code={code} />;
}
