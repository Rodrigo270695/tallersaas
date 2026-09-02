export default function GuestLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-muted/30">
            <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
                {children}
            </div>
        </div>
    );
}
