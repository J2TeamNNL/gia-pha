"use client";

/**
 * Nút Xuất / Nhập file gia phả.
 *
 * Đây là ĐƯỜNG THOÁT của người dùng: toàn bộ dữ liệu chỉ nằm trong IndexedDB của
 * một trình duyệt, và trình duyệt có thể xoá nó. Không có màn hình này thì
 * `src/db/backup.ts` chỉ là code không ai gọi tới.
 *
 * Luồng nhập cố tình có ba bước và không rút ngắn được:
 *   chọn file → mở file đếm row cho người dùng xem → xác nhận rồi mới thay thế.
 * Trước khi thay thế, cây hiện tại luôn được tải về làm bản an toàn.
 */
import { useRef, useState } from "react";
import { Download, Upload, TriangleAlert } from "lucide-react";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import {
  downloadBackup,
  inspectBackupFile,
  restoreFromBackup,
  type BackupContents,
} from "@/db/backup";
import { getAllPersons, getAllRelationships } from "@/db/persons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "Đã tải về: 14 người, 21 quan hệ" — số ghép ngoài từ điển, đúng cách dự án
 * đang làm với `canvas.membersCount` (từ điển chỉ giữ danh từ trần).
 */
function countLine(
  verb: string,
  c: BackupContents,
  nouns: { persons: string; relationships: string },
): string {
  return `${verb}: ${c.persons} ${nouns.persons}, ${c.relationships} ${nouns.relationships}`;
}

type Pending = { file: File; contents: BackupContents; current: BackupContents };

export function BackupControls() {
  const setPersons = useTreeStore((s) => s.setPersons);
  const setRelationships = useTreeStore((s) => s.setRelationships);
  const s = useTranslation().backup;

  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const reportError = (err: unknown) =>
    setError(err instanceof Error ? err.message : String(err));

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const c = await downloadBackup();
      setStatus(countLine(s.exported, c, s));
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleFilePicked(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      // Verify TRƯỚC khi hỏi: không bao giờ mời người dùng xác nhận một file
      // mà ta còn chưa biết có mở được không.
      const { contents } = await inspectBackupFile(file);
      const [persons, relationships] = await Promise.all([
        getAllPersons(),
        getAllRelationships(),
      ]);
      setPending({
        file,
        contents,
        current: {
          persons: persons.length,
          relationships: relationships.length,
          quarantined: 0,
          schemaVersion: 0,
        },
      });
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleConfirmRestore() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const { restored } = await restoreFromBackup(pending.file, {
        skipSafetyBackup: pending.current.persons === 0,
      });
      setPersons(await getAllPersons());
      setRelationships(await getAllRelationships());
      setStatus(countLine(s.restored, restored, s));
      setPending(null);
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  const pillClass =
    "flex items-center gap-1.5 border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-700 text-sm px-3 py-2 rounded-full transition-colors min-h-11";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className={pillClass}
          title={s.export}
        >
          <Download className="size-4" aria-hidden />
          <span className="hidden md:inline">{s.export}</span>
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className={pillClass}
          title={s.import}
        >
          <Upload className="size-4" aria-hidden />
          <span className="hidden md:inline">{s.import}</span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".sqlite,.db,application/x-sqlite3"
          className="hidden"
          onChange={(e) => void handleFilePicked(e.target.files?.[0])}
        />
      </div>

      {(status || error) && (
        <p
          role="status"
          className={`text-xs ${error ? "text-red-700" : "text-stone-600"}`}
        >
          {error ?? status}
        </p>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-amber-600" aria-hidden />
              {s.confirmTitle}
            </DialogTitle>
            <DialogDescription>{s.confirmBody}</DialogDescription>
          </DialogHeader>

          {pending && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-stone-200 p-3">
                <dt className="text-xs text-stone-500">{s.currentTree}</dt>
                <dd className="font-medium text-stone-800">
                  {pending.current.persons} {s.persons}
                  <br />
                  {pending.current.relationships} {s.relationships}
                </dd>
              </div>
              <div className="rounded-lg border border-stone-800 p-3">
                <dt className="text-xs text-stone-500">{s.incomingFile}</dt>
                <dd className="font-medium text-stone-900">
                  {pending.contents.persons} {s.persons}
                  <br />
                  {pending.contents.relationships} {s.relationships}
                </dd>
              </div>
            </dl>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-4 py-2 rounded-full border border-stone-300 text-sm min-h-11"
            >
              {s.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmRestore()}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white text-sm font-medium min-h-11"
            >
              {busy ? s.working : s.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
