import { Navigation } from "@/components/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 ml-0 md:ml-64 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
