import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="border-b border-border bg-surface/50">
      <div className="container mx-auto px-4 py-1 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="gap-2 text-xs text-muted-foreground hover:text-primary" dir="ltr">
          <Languages className="size-4" /> {language === "ar" ? "English" : "العربية"}
        </Button>
      </div>
    </div>
  );
}