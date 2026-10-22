import { Suspense } from "react";
import { SubmissionsClient } from "./submissions-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HackathonSubmissionsGalleryPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Loading project showcase gallery...</p>
        </div>
      }
    >
      <SubmissionsWrapper params={params} />
    </Suspense>
  );
}

async function SubmissionsWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubmissionsClient hackathonId={id} />;
}
