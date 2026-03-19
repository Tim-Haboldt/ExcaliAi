export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
                <p className="text-sm text-zinc-500">Loading...</p>
            </div>
        </div>
    );
}
