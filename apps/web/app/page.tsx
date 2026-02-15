import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <main className="w-full max-w-sm flex flex-col items-center gap-8">
        <h1 className="text-2xl font-semibold text-foreground">Waitr</h1>
        <nav className="flex flex-col gap-3 w-full">
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Owner login</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/onboarding">Continue setup</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/kitchen">Kitchen</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/r/demo">View menu (demo)</Link>
          </Button>
        </nav>
      </main>
    </div>
  );
}
