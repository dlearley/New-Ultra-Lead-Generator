import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4 py-24 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-500">
          Prospecting Workbench
        </p>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Zero in on your next high-converting accounts
        </h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-300">
          Use the AI-assisted search experience to mix natural language queries with structured filters,
          visualize prospects on a live map, manage lead lists, and maintain data quality with powerful tools.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/search"
            className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-base font-medium text-white shadow-lg transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            Launch Search Workspace
          </Link>
          <Link
            href="/lists"
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-base font-medium text-zinc-700 transition hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200"
          >
            Manage Lead Lists
          </Link>
          <Link
            href="/data-tools"
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-base font-medium text-zinc-700 transition hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200"
          >
            Data Tools
          </Link>
        </div>
      </div>
    </main>
  );
}
