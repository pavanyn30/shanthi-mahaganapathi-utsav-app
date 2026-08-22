import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const handleSelect = (lang: "en" | "kn") => {
    i18n.changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-amber-500/30 bg-background/80 px-3 text-xs font-bold text-foreground shadow-sm hover:border-amber-500/60 hover:bg-accent"
          aria-label="Select language"
        >
          <Globe className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
          <span>{currentLang === "kn" ? "🇮🇳 ಕನ್ನಡ" : "🇬🇧 English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 rounded-2xl border-amber-500/30 p-1.5 shadow-xl"
      >
        <DropdownMenuItem
          onClick={() => handleSelect("en")}
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${
            currentLang === "en" ? "bg-amber-500/10 text-amber-500" : "text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🇬🇧</span> English
          </span>
          {currentLang === "en" && <Check className="h-3.5 w-3.5 text-amber-500" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("kn")}
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${
            currentLang === "kn" ? "bg-amber-500/10 text-amber-500" : "text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🇮🇳</span> ಕನ್ನಡ (Kannada)
          </span>
          {currentLang === "kn" && <Check className="h-3.5 w-3.5 text-amber-500" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
