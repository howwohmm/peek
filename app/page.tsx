import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full space-y-12">
        <div className="space-y-3">
          <h1 className="text-4xl tracking-tight">peek</h1>
          <p className="text-ink-dim leading-relaxed">
            see your students' screens from the front of the lab. consent-gated, read-only, no install.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/teach"
            className="block w-full text-center py-3 px-4 bg-accent text-bg-sunk hover:opacity-90 transition-opacity rounded"
          >
            i'm the teacher — create class
          </Link>
          <Link
            href="/join"
            className="block w-full text-center py-3 px-4 border border-line text-ink hover:border-ink-mute transition-colors rounded"
          >
            i'm a student — join class
          </Link>
        </div>

        <p className="text-ink-mute text-xs leading-relaxed">
          peek is open source under AGPL-3.0. self-host it for your school. nothing leaves your network.
        </p>
      </div>
    </main>
  );
}
