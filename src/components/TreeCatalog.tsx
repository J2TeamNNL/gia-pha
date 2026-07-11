"use client";

import { useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import type { TreeMetadata } from "@/db/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TreeCatalogProps = {
  trees: TreeMetadata[];
  activeTreeId: string | null;
  busy: boolean;
  error?: string;
  onCreate: (name: string) => Promise<void>;
  onOpen: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TreeCatalog({
  trees,
  activeTreeId,
  busy,
  error,
  onCreate,
  onOpen,
  onRename,
  onDelete,
}: TreeCatalogProps) {
  const [newTreeName, setNewTreeName] = useState("");
  const [editingTreeId, setEditingTreeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate(newTreeName);
    setNewTreeName("");
  };

  const submitRename = async (event: React.FormEvent, id: string) => {
    event.preventDefault();
    await onRename(id, editingName);
    setEditingTreeId(null);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-stone-50 p-5 sm:p-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-stone-800 p-3 text-white">
            <FolderTree className="size-7" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-stone-900">Cây gia phả</h1>
            <p className="mt-1 text-sm text-stone-500">
              Mỗi cây được lưu trong một cơ sở dữ liệu riêng trên thiết bị này.
            </p>
          </div>
        </div>

        <form onSubmit={submitCreate} className="flex gap-2 rounded-xl border bg-white p-3 shadow-sm">
          <Input
            aria-label="Tên cây gia phả mới"
            value={newTreeName}
            onChange={(event) => setNewTreeName(event.target.value)}
            placeholder="Ví dụ: Họ Nguyễn"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !newTreeName.trim()}>
            <Plus /> Tạo cây
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {trees.length === 0 && !busy ? (
            <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
              Chưa có cây nào. Tạo cây đầu tiên để bắt đầu.
            </p>
          ) : (
            trees.map((tree) => {
              const isActive = tree.id === activeTreeId;
              const isEditing = tree.id === editingTreeId;
              const isConfirmingDelete = tree.id === confirmingDeleteId;

              return (
                <article key={tree.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  {isEditing ? (
                    <form onSubmit={(event) => submitRename(event, tree.id)} className="flex gap-2">
                      <Input
                        aria-label="Tên cây gia phả"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        autoFocus
                        disabled={busy}
                      />
                      <Button type="submit" size="sm" disabled={busy}>Lưu</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingTreeId(null)} disabled={busy}>Hủy</Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-stone-900">{tree.name}</h2>
                        <p className="mt-1 text-xs text-stone-500">
                          {isActive ? "Đang mở" : "Chưa mở"} · tạo {new Date(tree.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant={isActive ? "secondary" : "default"} onClick={() => onOpen(tree.id)} disabled={busy || isActive}>
                          {isActive ? "Đang mở" : "Mở"}
                        </Button>
                        <Button type="button" size="icon-sm" variant="outline" aria-label={`Đổi tên ${tree.name}`} onClick={() => { setEditingTreeId(tree.id); setEditingName(tree.name); }} disabled={busy}>
                          <Pencil />
                        </Button>
                        <Button type="button" size="icon-sm" variant="outline" aria-label={`Xóa ${tree.name}`} onClick={() => setConfirmingDeleteId(tree.id)} disabled={busy}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  )}

                  {isConfirmingDelete && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-900">Xóa vĩnh viễn “{tree.name}” và toàn bộ dữ liệu trong cây này?</p>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(tree.id)} disabled={busy}>Xác nhận xóa</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setConfirmingDeleteId(null)} disabled={busy}>Hủy</Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
