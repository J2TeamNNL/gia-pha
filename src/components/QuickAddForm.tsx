"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTreeStore } from "@/store/treeStore";
import { bulkImport, linksForRelation, type RelationKind } from "@/db/bulk";
import type { Gender } from "@/db/types";
import { displayName } from "@/lib/personName";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { PhoneInput } from "./PhoneInput";

interface QuickAddFormProps {
  onClose: () => void;
}

const PARENT_TYPES = new Set(["PARENT_OF", "ADOPTED_PARENT_OF"]);
const NEW_PERSON = "new-person";

export function QuickAddForm({ onClose }: QuickAddFormProps) {
  const {
    frequentlyUsedFields,
    trackFieldUsage,
    formMode,
    openForm,
    persons,
    relationships,
    anchorPersonId,
    selectedPersonId,
    formPreFill,
    addImported,
  } = useTreeStore();
  const t = useTranslation();

  const relationTargetId = formPreFill?.targetId ?? selectedPersonId;
  const relationTarget = persons.find(
    (person) => person.id === relationTargetId,
  );

  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [note, setNote] = useState("");
  const [relation, setRelation] = useState<RelationKind>(
    formPreFill?.relType ?? (relationTarget ? "child" : "none"),
  );
  const [showAdvanced, setShowAdvanced] = useState(formMode === "full");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const givenNameRef = useRef<HTMLInputElement>(null);

  const hasSavedPhone = frequentlyUsedFields.includes("phone_number");

  const surnameSuggestions = useMemo(() => {
    const anchor = persons.find((person) => person.id === anchorPersonId);
    const unique = [
      ...new Set(
        persons
          .map((person) => person.last_name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    if (!anchor?.last_name) return unique;
    return [
      anchor.last_name,
      ...unique.filter((name) => name !== anchor.last_name),
    ];
  }, [persons, anchorPersonId]);

  const parentIdsOfTarget = useMemo(
    () =>
      relationships
        .filter(
          (relationship) =>
            PARENT_TYPES.has(relationship.rel_type) &&
            relationship.related_to_id === relationTargetId,
        )
        .map((relationship) => relationship.person_id),
    [relationships, relationTargetId],
  );

  const fill = (template: string, name: string) =>
    template.replace("{name}", name);

  const save = async (keepOpen: boolean) => {
    if (!firstName.trim()) {
      setError(t.form.errors.nameRequired);
      return;
    }
    if (
      relation === "sibling" &&
      relationTarget &&
      !parentIdsOfTarget.length
    ) {
      setError(
        fill(t.form.errors.siblingNeedsParent, displayName(relationTarget)),
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const phoneNumber = phoneLocal.trim()
        ? `+84${phoneLocal.replace(/^0/, "").replace(/\D/g, "")}`
        : undefined;
      const result = await bulkImport({
        persons: [
          {
            externalId: NEW_PERSON,
            first_name: firstName.trim(),
            last_name: lastName.trim() || undefined,
            middle_name: middleName.trim() || undefined,
            gender,
            is_living: true,
            phone_number: phoneNumber,
            notes: note.trim() || undefined,
          },
        ],
        relationships: linksForRelation(
          relation,
          NEW_PERSON,
          relationTargetId,
          parentIdsOfTarget,
        ),
      });
      addImported(result.persons, result.relationships);
      if (phoneLocal.trim()) trackFieldUsage("phone_number");

      if (!keepOpen) {
        onClose();
        return;
      }
      setSavedNotice(fill(t.form.savedNotice, displayName(result.persons[0])));
      setMiddleName("");
      setFirstName("");
      setPhoneLocal("");
      setNote("");
      givenNameRef.current?.focus();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t.form.errors.genericError,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const title = relationTarget
    ? {
        parent: t.form.titleParent,
        child: t.form.titleChild,
        spouse: t.form.titleSpouse,
        sibling: t.form.titleSibling,
        none: t.form.addMember,
      }[relation]
    : t.form.addMember;

  const RELATIONS: { kind: RelationKind; label: string }[] = [
    { kind: "child", label: t.form.relChild },
    { kind: "parent", label: t.form.relParent },
    { kind: "spouse", label: t.form.relSpouse },
    { kind: "sibling", label: t.form.relSibling },
    { kind: "none", label: t.form.relationNone },
  ];

  const GENDERS: { value: Gender; label: string }[] = [
    { value: "MALE", label: t.form.male },
    { value: "FEMALE", label: t.form.female },
    { value: "UNKNOWN", label: t.form.unknownGender },
  ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void save(true);
        }
      }}
      className="flex flex-col gap-4"
      autoComplete="on"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-stone-700">
          <User className="size-4" />
          <span className="font-semibold text-base">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={t.form.cancel}
        >
          <X className="size-5" />
        </button>
      </div>

      {relationTarget && (
        <div className="space-y-1.5">
          <Label>{fill(t.form.relationLabel, displayName(relationTarget))}</Label>
          <div className="flex flex-wrap gap-1.5">
            {RELATIONS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => setRelation(kind)}
                aria-pressed={relation === kind}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  relation === kind
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {surnameSuggestions.length > 0 && (
        <datalist id="surname-suggestions">
          {surnameSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="qa-last">
            {t.form.lastName}
            {surnameSuggestions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-stone-400">
                ({t.form.surnameSuggestion}{" "}
                {surnameSuggestions.slice(0, 2).join(", ")})
              </span>
            )}
          </Label>
          <Input
            id="qa-last"
            name="family-name"
            autoComplete="family-name"
            list={
              surnameSuggestions.length > 0 ? "surname-suggestions" : undefined
            }
            placeholder={t.form.lastNamePlaceholder}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-middle">
            {t.form.middleName}{" "}
            <span className="text-stone-400 text-xs font-normal">
              {t.form.optional}
            </span>
          </Label>
          <Input
            id="qa-middle"
            name="additional-name"
            autoComplete="additional-name"
            placeholder={t.form.middleNamePlaceholder}
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-first">
            {t.form.firstName}{" "}
            <span className="text-red-500">{t.form.required}</span>
          </Label>
          <Input
            id="qa-first"
            ref={givenNameRef}
            name="given-name"
            autoComplete="given-name"
            placeholder={t.form.firstNamePlaceholder}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoFocus
          />
        </div>
        {(lastName || firstName) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-stone-400 pl-1"
          >
            {t.form.displayName}{" "}
            <strong className="text-stone-600">
              {[lastName, middleName, firstName].filter(Boolean).join(" ")}
            </strong>
          </motion.p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>
          {t.form.gender} <span className="text-red-500">{t.form.required}</span>
        </Label>
        <div className="flex gap-2">
          {GENDERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              aria-pressed={gender === value}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                gender === value
                  ? "bg-stone-800 text-white border-stone-800"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasSavedPhone && (
        <div className="space-y-1.5">
          <Label>{t.form.phone}</Label>
          <PhoneInput value={phoneLocal} onChange={setPhoneLocal} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((shown) => !shown)}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            showAdvanced && "rotate-180",
          )}
        />
        {showAdvanced ? t.form.hideDetails : t.form.addDetails}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
              {!hasSavedPhone && (
                <div className="space-y-1.5">
                  <Label>{t.form.phone}</Label>
                  <PhoneInput value={phoneLocal} onChange={setPhoneLocal} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="qa-note">{t.form.note}</Label>
                <Input
                  id="qa-note"
                  placeholder={t.form.notePlaceholder}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              <p className="text-xs text-stone-400 italic">
                {t.form.editLater}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {savedNotice && !error && (
        <p
          role="status"
          className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          {savedNotice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
        <Button
          type="button"
          onClick={() => void save(true)}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            t.form.saveAndNext
          )}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            {t.form.cancel}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-stone-800 hover:bg-stone-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t.form.save
            )}
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openForm("full")}
        className="text-center text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2"
      >
        {t.form.fullForm}
      </button>
    </form>
  );
}
