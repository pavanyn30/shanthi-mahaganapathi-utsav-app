import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Mail, AlertTriangle, CheckCircle2, Lock, FileText } from "lucide-react";

export const Route = createFileRoute("/child-safety")({
  head: () => ({
    meta: [
      { title: "Child Safety Standards — Shanthi Maha Ganapathi" },
      {
        name: "description",
        content:
          "Shanthi Maha Ganapathi Child Safety Standards (CSAE). Our zero-tolerance policy against child sexual abuse and exploitation, and reporting mechanisms.",
      },
      { property: "og:title", content: "Child Safety Standards — Shanthi Maha Ganapathi" },
      {
        property: "og:description",
        content:
          "Official Child Safety Standards policy for Shanthi Maha Ganapathi complying with Google Play Console CSAE requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: ChildSafetyPage,
});

function ChildSafetyPage() {
  const commitments = [
    "We strictly prohibit Child Sexual Abuse Material (CSAM).",
    "We prohibit grooming, exploitation, harassment, or abuse involving minors.",
    "We remove any violating content immediately.",
    "We permanently suspend users who violate these policies.",
    "We cooperate with law enforcement whenever legally required.",
    "We comply with Google Play Child Safety Standards.",
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="rounded-3xl gradient-temple p-8 text-white shadow-lift sm:p-10">
        <div className="flex items-center gap-3 text-amber-300">
          <ShieldCheck className="h-8 w-8 shrink-0" />
          <span className="text-sm font-bold uppercase tracking-wider">Safety & Policy</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl text-white">
          Child Safety Standards
        </h1>
        <p className="mt-3 text-sm font-medium text-amber-100/90 sm:text-base">
          Effective Date: <time dateTime="2026-08-05">August 5, 2026</time>
        </p>
      </div>

      {/* Introduction */}
      <div className="card-premium mt-8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Introduction</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Shanthi Maha Ganapathi is committed to providing a safe environment for all users and has
          zero tolerance for child sexual abuse and exploitation (CSAE).
        </p>
      </div>

      {/* Our Commitments */}
      <div className="card-premium mt-8 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Our Commitments
          </h2>
        </div>
        <ul className="mt-6 grid gap-4">
          {commitments.map((commitment, index) => (
            <li
              key={index}
              className="flex items-start gap-3.5 rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-base font-medium text-foreground">{commitment}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reporting Abuse */}
      <div className="card-premium mt-8 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Reporting Abuse
          </h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Users can report inappropriate content or suspected child exploitation by contacting us
          immediately.
        </p>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contact Email
          </h3>
          <a
            href="mailto:support.shanthiseva@gmail.com"
            className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-primary hover:underline sm:text-xl break-all"
          >
            <Mail className="h-5 w-5 shrink-0" />
            support.shanthiseva@gmail.com
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            All reports regarding child safety and exploitation are handled with highest priority.
          </p>
        </div>
      </div>

      {/* Policy Statement */}
      <div className="card-premium mt-8 p-6 sm:p-8 border-l-4 border-l-primary">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Policy Statement
          </h2>
        </div>
        <p className="mt-4 text-base font-semibold leading-relaxed text-foreground">
          Any content involving child exploitation, abuse, or illegal activity is strictly
          prohibited and will result in immediate action.
        </p>
      </div>
    </div>
  );
}
