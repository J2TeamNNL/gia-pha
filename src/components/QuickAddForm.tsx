"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTreeStore } from "@/store/treeStore";
import { createPerson, createRelationship } from "@/db/persons";
import type { Gender } from "@/db/types";
import { cn } from "@/lib/utils";
import { PhoneInput } from "./PhoneInput";

interface QuickAddFormProps {
  onClose: () => void;
}

export function QuickAddForm({ onClose }: QuickAddFormProps) {
  const {
    addPerson,
    frequentlyUsedFields,
    trackFieldUsage,
    formMode,
    openForm,
    persons,
    anchorPersonId,
    formPreFill,
    addRelationship,
  } = useTreeStore();

  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [note, setNote] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(formMode === "full");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSavedPhone = frequentlyUsedFields.includes("phone_number");

  // Build unique surname suggestions from existing persons, anchor name first
  const surnameSuggestions = (() => {
    const anchor = persons.find((p) => p.id === anchorPersonId);
    const allLastNames = persons
      .map((p) => p.last_name)
      .filter(Boolean) as string[];
    const unique = [...new Set(allLastNames)];
    if (anchor?.last_name) {
      // put anchor's surname first
      return [
        anchor.last_name,
        ...unique.filter((n) => n !== anchor.last_name),
      ];
    }
    return unique;
  })();

  const fullPhoneNumber = phoneLocal.trim()
    ? `+84${phoneLocal.replace(/^0/, "").replace(/\D/g, "")}`
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Vui lòng nhập ít nhất Tên.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newPerson = await createPerson({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        middle_name: middleName.trim() || undefined,
        gender,
        is_living: true,
        phone_number: fullPhoneNumber,
        notes: note.trim() || undefined,
      });
      addPerson(newPerson);

      // Add relationship if prefilled
      if (formPreFill) {
        let rel1, rel2;
        switch (formPreFill.relType) {
          case "parent":
            // newPerson is parent of targetId
            rel1 = await createRelationship(
              newPerson.id,
              formPreFill.targetId,
              "PARENT_OF",
            );
            break;
          case "child":
            // targetId is parent of newPerson
            rel1 = await createRelationship(
              formPreFill.targetId,
              newPerson.id,
              "PARENT_OF",
            );
            break;
          case "spouse":
            rel1 = await createRelationship(
              newPerson.id,
              formPreFill.targetId,
              "SPOUSE",
            );
            rel2 = await createRelationship(
              formPreFill.targetId,
              newPerson.id,
              "SPOUSE",
            );
            break;
          case "sibling":
            // Sibling relationships are implicit through shared parents in standard genealogy,
            // but for a quick MVP we might just want them linked if we don't have parents yet.
            // Leaving unimplemented in DB for now to avoid schema drift, or could add "SIBLING" to types.ts later.
            console.warn(
              "Sibling direct relationship not yet supported by DB schema.",
            );
            break;
        }
        if (rel1) addRelationship(rel1);
        if (rel2) addRelationship(rel2);
      }

      if (phoneLocal.trim()) trackFieldUsage("phone_number");
      onClose();
    } catch (err) {
      setError((err as Error).message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      autoComplete="on"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-stone-700">
          <User className="size-4" />
          <span className="font-semibold text-base">
            {!formPreFill && "Thêm thành viên"}
            {formPreFill?.relType === "parent" && "Thêm cha/mẹ"}
            {formPreFill?.relType === "child" && "Thêm con cái"}
            {formPreFill?.relType === "spouse" && "Thêm vợ/chồng"}
            {formPreFill?.relType === "sibling" && "Thêm anh/chị/em"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* datalist for surname suggestions */}
      {surnameSuggestions.length > 0 && (
        <datalist id="surname-suggestions">
          {surnameSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}

      {/* Name fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="qa-last">
            Họ
            {surnameSuggestions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-stone-400">
                (gợi ý: {surnameSuggestions.slice(0, 2).join(", ")})
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
            placeholder="vd: Nguyễn / Smith"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-middle">
            Tên đệm{" "}
            <span className="text-stone-400 text-xs font-normal">
              (tùy chọn)
            </span>
          </Label>
          <Input
            id="qa-middle"
            name="additional-name"
            autoComplete="additional-name"
            placeholder="vd: Văn / Mary"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-first">
            Tên <span className="text-red-500">*</span>
          </Label>
          <Input
            id="qa-first"
            name="given-name"
            autoComplete="given-name"
            placeholder="vd: An / John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        {(lastName || firstName) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-stone-400 pl-1"
          >
            Hiển thị:{" "}
            <strong className="text-stone-600">
              {[lastName, middleName, firstName].filter(Boolean).join(" ")}
            </strong>
          </motion.p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <Label>
          Giới tính <span className="text-red-500">*</span>
        </Label>
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
              {g === "MALE" ? "🙎‍♂️ Nam" : "🙎‍♀️ Nữ"}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Memory phone */}
      {hasSavedPhone && (
        <div className="space-y-1.5">
          <Label>Số điện thoại</Label>
          <PhoneInput value={phoneLocal} onChange={setPhoneLocal} />
        </div>
      )}

      {/* Toggle Advanced */}
      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            showAdvanced && "rotate-180",
          )}
        />
        {showAdvanced ? "Ẩn chi tiết" : "Thêm chi tiết (tùy chọn)"}
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
                  <Label>Số điện thoại</Label>
                  <PhoneInput value={phoneLocal} onChange={setPhoneLocal} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="qa-note">Ghi chú</Label>
                <Input
                  id="qa-note"
                  placeholder="Thêm ghi chú..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <p className="text-xs text-stone-400 italic">
                Chỉnh sửa thêm sau khi lưu.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2 border-t border-stone-100">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-stone-800 hover:bg-stone-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Lưu thành viên"
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => openForm("full")}
        className="text-center text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2"
      >
        Mở form đầy đủ
      </button>
    </form>
  );
}
