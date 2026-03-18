"use client";

import { useState, type FormEvent } from "react";
import { useAuthenticate } from "@/app/hooks/useAuth";

type AuthMode = "login" | "register";

export function AuthForm() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");

    const authenticateMutation = useAuthenticate();

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");

        try {
            await authenticateMutation.mutateAsync({ mode, username });
        } catch (submitError) {
            if (submitError instanceof Error) {
                setError(submitError.message);
            } else {
                setError("Network error. Please try again.");
            }
        }
    }

    function switchMode() {
        setMode(mode === "login" ? "register" : "login");
        setError("");
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-sm rounded-xl border border-foreground/10 bg-background p-8 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">
                    {mode === "login" ? "Welcome back" : "Create an account"}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-1.5 block text-sm font-medium text-foreground/70"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            placeholder="Enter your username"
                            autoFocus
                            required
                            minLength={3}
                            maxLength={32}
                            className="w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        />
                    </div>

                    {error && (
                        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            authenticateMutation.isPending ||
                            username.length < 3
                        }
                        className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {authenticateMutation.isPending
                            ? "Please wait..."
                            : mode === "login"
                              ? "Sign in"
                              : "Create account"}
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-foreground/50">
                    {mode === "login"
                        ? "Don't have an account?"
                        : "Already have an account?"}{" "}
                    <button
                        type="button"
                        onClick={switchMode}
                        className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
                    >
                        {mode === "login" ? "Register" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
