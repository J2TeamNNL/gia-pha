"use client";

import { FamilyTreeCanvas } from "@/components/FamilyTreeCanvas";
import { SidePanel } from "@/components/SidePanel";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { TreePine, Plus, Globe } from "lucide-react";
import type { Locale } from "@/i18n";

export default function Home() {
  const { openForm, isOnboarding, persons, locale, setLocale } = useTreeStore();
  const t = useTranslation();
  const showOnboarding = isOnboarding && persons.length === 0;

  const LOCALES: { code: Locale; label: string }[] = [
    { code: "vi", label: "🇻🇳 VI" },
    { code: "en", label: "🇬🇧 EN" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <header className="h-14 px-5 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <TreePine className="size-5 text-stone-700" />
          <span className="font-bold font-serif text-lg text-stone-800 tracking-tight">
            {t.appName}
          </span>
          <span className="hidden sm:inline-block text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full border border-stone-200 font-medium">
            {t.appTagline}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex items-center gap-1 border border-stone-200 rounded-full px-1 py-1 bg-white">
            <Globe className="size-3.5 text-stone-400 ml-1.5" />
            {LOCALES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  locale === code
                    ? "bg-stone-800 text-white"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {!showOnboarding && (
            <button
              onClick={() => openForm("quick")}
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors shadow-sm"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.header.addMember}</span>
            </button>
          )}
          <button className="flex items-center gap-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm px-4 py-2 rounded-full transition-colors">
            <svg className="size-4" viewBox="0 0 48 48" fill="none">
              <path
                d="M43.6 20.1H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.2 6.5 29.4 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.1-2.6-.4-3.9z"
                fill="#FFC107"
              />
              <path
                d="m6.3 14.7 6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
                fill="#FF3D00"
              />
              <path
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.2-11.3-7.8L6 33.4C9.4 39.6 16.2 44 24 44z"
                fill="#4CAF50"
              />
              <path
                d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.4l6.2 5.2C36.9 38 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"
                fill="#1976D2"
              />
            </svg>
            {t.header.signInGoogle}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {showOnboarding ? (
          <OnboardingScreen />
        ) : (
          <>
            <FamilyTreeCanvas />
            <SidePanel />
          </>
        )}
      </main>
    </div>
  );
}
