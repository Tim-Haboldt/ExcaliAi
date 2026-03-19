"use client";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="max-w-md text-center">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    Something went wrong
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                    {error.message || "An unexpected error occurred."}
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-opacity hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-900"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
