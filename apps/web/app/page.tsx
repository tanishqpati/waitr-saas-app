import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <main className="w-full max-w-sm flex flex-col items-center gap-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Waitr</h1>
        <nav className="flex flex-col gap-3 w-full">
          <Link
            href="/login"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
          >
            Owner login
          </Link>
          <Link
            href="/kitchen"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
          >
            Kitchen
          </Link>
          <Link
            href="/r/demo"
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
          >
            View menu (demo)
          </Link>
        </nav>
      </main>
    </div>
  );
}
