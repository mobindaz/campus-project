import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          Campus Operations Platform — Single-Tenant College Deployment
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to <span className="text-primary">campus-ops</span>
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed">
          Placement Management & Transfer Certificate (TC) Management platform initialized with Tailwind CSS, shadcn/ui, TypeScript, and clean modular service architecture.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button variant="default" size="lg">
            Get Started
          </Button>
          <Button variant="outline" size="lg">
            View Architecture Specs
          </Button>
        </div>

        <div className="pt-8 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs text-muted-foreground">
          <div className="p-4 rounded-lg bg-accent/20 border border-border/50">
            <div className="font-semibold text-foreground mb-1">Architecture</div>
            Independent Single-Tenant Postgres & Next.js App Router
          </div>
          <div className="p-4 rounded-lg bg-accent/20 border border-border/50">
            <div className="font-semibold text-foreground mb-1">Seed Profile</div>
            Demo Diploma College (Sample Departments & Programs)
          </div>
          <div className="p-4 rounded-lg bg-accent/20 border border-border/50">
            <div className="font-semibold text-foreground mb-1">Stack</div>
            TypeScript Strict, Tailwind CSS v4, shadcn/ui, Zod
          </div>
        </div>
      </div>
    </main>
  );
}
