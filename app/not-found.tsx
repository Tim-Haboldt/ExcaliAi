import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="max-w-md text-center">
                <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-50">
                    404
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                    The page you&apos;re looking for doesn&apos;t exist.
                </p>
                <Link
                    href="/"
                    className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-opacity hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-900"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
