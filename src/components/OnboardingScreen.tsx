"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TreePine, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { createPerson, setAnchorPerson } from "@/db/persons";
import type { Gender } from "@/db/types";
import { cn } from "@/lib/utils";
import { PhoneInput } from "@/components/PhoneInput";

export function OnboardingScreen() {
  const { addPerson, setAnchorPersonId } = useTreeStore();
  const t = useTranslation();

  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError(t.form.errors.nameRequired);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fullPhone = phoneLocal.trim()
        ? `+84${phoneLocal.replace(/^0/, "").replace(/\D/g, "")}`
        : undefined;

      const person = await createPerson({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        middle_name: middleName.trim() || undefined,
        gender,
        is_living: true,
        phone_number: fullPhone,
        is_anchor: true,
      });
      await setAnchorPerson(person.id);
      addPerson({ ...person, is_anchor: true });
      setAnchorPersonId(person.id);
    } catch (err) {
      setError((err as Error).message ?? t.form.errors.genericError);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-stone-50 to-stone-100">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden"
      >
        <div className="bg-stone-800 text-white px-6 py-5 flex items-center gap-3">
          <div className="bg-white/10 rounded-xl p-2">
            <TreePine className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif">
              {t.onboarding.title}
            </h2>
            <p className="text-stone-300 text-sm">
              {t.onboarding.subtitle}{" "}
              <strong className="text-white">{t.onboarding.selfLabel}</strong>.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleStart}
          className="p-6 flex flex-col gap-4"
          autoComplete="on"
        >
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            {t.onboarding.tip}
          </p>

          {/* Name fields in a 3-col grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-last" className="text-xs">
                {t.form.lastName}
              </Label>
              <Input
                id="ob-last"
                name="family-name"
                autoComplete="family-name"
                placeholder={t.form.lastNamePlaceholder}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoFocus
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-middle" className="text-xs">
                {t.form.middleName}
              </Label>
              <Input
                id="ob-middle"
                name="additional-name"
                autoComplete="additional-name"
                placeholder={t.form.middleNamePlaceholder}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-first" className="text-xs">
                {t.form.firstName}{" "}
                <span className="text-red-500">{t.form.required}</span>
              </Label>
              <Input
                id="ob-first"
                name="given-name"
                autoComplete="given-name"
                placeholder={t.form.firstNamePlaceholder}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {(lastName || firstName) && (
            <p className="text-xs text-stone-500">
              {t.form.displayName}{" "}
              <strong className="text-stone-800">
                {[lastName, middleName, firstName].filter(Boolean).join(" ")}
              </strong>
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t.form.gender}</Label>
            <div className="flex gap-2">
              {(["MALE", "FEMALE"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                    gender === g
                      ? "bg-stone-800 text-white border-stone-800"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50",
                  )}
                >
                  {g === "MALE" ? t.form.male : t.form.female}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ob-phone" className="text-xs">
              {t.form.phone}{" "}
              <span className="text-stone-400 font-normal">
                {t.form.optional}
              </span>
            </Label>
            <PhoneInput
              value={phoneLocal}
              onChange={setPhoneLocal}
              id="ob-phone"
              placeholder={t.form.phonePlaceholder}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white h-11 rounded-xl font-semibold mt-1"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t.onboarding.startButton
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
