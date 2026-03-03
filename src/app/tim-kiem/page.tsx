import { EventCard } from "@/components/events/event-card";
import { SearchForm } from "@/components/events/search-form";
import { SiteShell } from "@/components/layout/site-shell";
import { searchEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = readParam(params.query);
  const eventType = readParam(params.eventType);
  const page = Number(readParam(params.page) ?? "1");

  const result = await searchEvents({
    query,
    eventType,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 12
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <SiteShell>
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Tim kiem su kien</h1>
          <p className="text-sm text-fg/70">
            Tim thay {result.total} su kien phu hop bo loc cua ban
          </p>
        </div>
        <SearchForm />

        {result.items.length === 0 ? (
          <div className="card-glass rounded-2xl p-8 text-center text-sm text-fg/75">
            Khong tim thay su kien nao. Hay thay doi tu khoa hoac bo loc.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNum) => {
              const nextParams = new URLSearchParams();
              if (query) nextParams.set("query", query);
              if (eventType) nextParams.set("eventType", eventType);
              nextParams.set("page", String(pageNum));

              return (
                <a
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm ${
                    result.page === pageNum
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border bg-card text-fg/80"
                  }`}
                  href={`/tim-kiem?${nextParams.toString()}`}
                  key={pageNum}
                >
                  {pageNum}
                </a>
              );
            }
          )}
        </div>
      </section>
    </SiteShell>
  );
}

