import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Code2, Cpu, Globe, Mail, ShieldCheck, Heart, Zap } from "lucide-react";

interface DeveloperCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeveloperCreditModal({ open, onOpenChange }: DeveloperCreditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-amber-500/30 shadow-2xl">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 p-6 text-white overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />
          
          <div className="relative z-10">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-md mb-3 px-3 py-1 font-semibold text-xs inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" /> Technology &amp; Software Partner
            </Badge>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-stone-950/40 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Code2 className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold font-display text-white tracking-wide">
                  PYN TECHNOLOGIES
                </DialogTitle>
                <DialogDescription className="text-amber-100 text-xs mt-0.5">
                  Innovating Digital Solutions &amp; High-Performance Applications
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The entire digital platform for <strong className="text-foreground font-semibold">SHANTHI MAHA GANAPATHI 2026</strong> was conceptualized, designed, and engineered by <strong className="text-amber-600 dark:text-amber-400 font-semibold">PYN TECHNOLOGIES</strong>.
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-amber-500" /> Key Features Built &amp; Managed
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-foreground">Real-time Architecture</span>
                  <span className="text-muted-foreground text-[11px]">Instant updates &amp; live counts</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-foreground">QR Entry &amp; Passes</span>
                  <span className="text-muted-foreground text-[11px]">Secure verification system</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                <Globe className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-foreground">Live Streaming</span>
                  <span className="text-muted-foreground text-[11px]">Integrated video darshan</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                <Heart className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-foreground">Community &amp; Seva</span>
                  <span className="text-muted-foreground text-[11px]">Volunteer &amp; donor workflows</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Made with ❤️ by</span>
              <a
                href="https://pyn-technologies.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-amber-500 underline"
              >
                PYN TECHNOLOGIES
              </a>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="https://pyn-technologies.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto rounded-full gradient-saffron text-primary-foreground font-semibold text-xs px-5 py-2 text-center shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Visit Official Website</span>
              </a>

              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="rounded-full text-xs px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
