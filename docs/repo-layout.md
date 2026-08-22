# Cấu trúc repo — mỗi thư mục là gì, ai tạo, xử lý thế nào

> Kiểm chứng: 2026-08-22 bằng `git ls-files`, `git status`, `git worktree list`, `cat .gitignore`.
> Tài liệu này tồn tại vì repo từng có vài thư mục ẩn không rõ nguồn gốc. `.plan/`, `.agent/`, `.claude/` đã xoá trong ngày 2026-08-22 — §2 ghi lại một lần mất dữ liệu vĩnh viễn để không tái diễn.

## 1. Bảng tổng hợp

| Đường dẫn | Là gì | Git | Ai tạo | Xử lý |
|---|---|---|---|---|
| `src/` | mã nguồn, 28 file | tracked | — | — |
| `public/` | chỉ có 5 svg mặc định của Next + `sql-wasm.wasm` | tracked | — | thiếu manifest + icon → Phase 3 |
| `docs/` | tài liệu evergreen | **untracked** | phiên 2026-08-22 | commit khi anh muốn |
| `plans/` | roadmap + đề xuất + 19 report | **untracked** | phiên 2026-08-22 | commit khi anh muốn |
| `references/` | 3 repo tham khảo đã clone | **gitignored** (`/references`) | — | không sửa. Chỉ đọc |
| `CLAUDE.md` | context cho AI agent | **untracked** | phiên 2026-08-22 | commit |
| `AGENTS.md` | **symlink → CLAUDE.md** | **untracked** | phiên 2026-08-22 | commit. Dùng cho Codex/agent khác |
| `.agents/` | 1 file `rules/rule.md` — AG Kit bridge dùng chung Claude Code + Codex | tracked (1 file) | — | giữ |
| `.agent/` | **ĐÃ XOÁ 2026-08-22 — mất vĩnh viễn.** Antigravity Kit: 20 agent · 36 skill · 11 workflow · 2 script Python · `.shared/ui-ux-pro-max` | gitignored (`.gitignore:44`) → git **chưa bao giờ** có bản copy | — | xem §2 |
| `.claude/` | **ĐÃ XOÁ 2026-08-22.** memory của subagent + 1 worktree git đã vỡ | untracked, không gitignored | subagent phiên 2026-08-22 (memory) · phiên 16/03 (worktree) | §3 và §4. Sẽ tự sinh lại — xem luật ở §3 |
| `out/` | build output static export, 2.0 MB | gitignored | `pnpm build` | disposable |
| `.next/` | cache build | gitignored | `pnpm build` | disposable |
| `tsconfig.tsbuildinfo` | cache TS | gitignored (`*.tsbuildinfo`) | `pnpm build` | disposable |
| `next-env.d.ts` | Next tự sinh | gitignored | Next | disposable |
| `test-exec.js` | script nháp 12 dòng, `require("./node_modules/sql.js/…")` | tracked | — | **nguồn 1 lỗi lint** (`no-require-imports`). Nên xoá hoặc chuyển vào harness test ở Phase 0 |
| `package-lock.json` | đã xoá (chuyển sang pnpm) | staged deletion | phiên trước | `pnpm-lock.yaml` thay thế, đang untracked → commit |
| `.DS_Store` | ở root, `references/`, `src/` | gitignored | macOS Finder | vô hại |
| `.plan/` | ĐÃ XOÁ 2026-08-22 | staged deletion | — | nội dung đã migrate sang `docs/` + `plans/roadmap.md`. Phục hồi: `git restore --staged .plan && git checkout .plan` |

## 2. `.agent/` — ĐÃ XOÁ 2026-08-22, không phục hồi được

**Ghi lại vì đây là một lần mất dữ liệu vĩnh viễn.**

Nội dung: Antigravity Kit — 20 specialist agent, 36 skill, 11 workflow slash-command, 2 script validate Python (`checklist.py`, `verify_all.py`), `.shared/ui-ux-pro-max` (27 file: 50 style, 21 palette, 50 font). Tổng 202 file. **Tooling, không phải tài liệu dự án** — nên `.agent/ARCHITECTURE.md` là tài liệu của Antigravity Kit, không phải của Gia Phả, và đã không được merge vào [architecture.md](architecture.md).

**Vì sao không phục hồi được** — đã kiểm cả 4 đường:

| Đường | Kết quả |
|---|---|
| Git | `.gitignore:44` là `.agent` → **loại trừ có chủ đích**, git chưa bao giờ có bản copy nào. `git ls-files .agent` → 0 |
| Backup tar | `~/agent-kit-backup-260822.tgz` tồn tại nhưng **29 byte / 0 entry** — lệnh `tar` chạy sau khi thư mục đã bị xoá, nên archive rỗng |
| Bản copy trong worktree tháng 3 | chỉ có `.agents/` (1 file), **không có** `.agent/` |
| APFS snapshot / Time Machine | `tmutil listlocalsnapshots /` → rỗng · `tmutil destinationinfo` → *No destinations configured* |

**Không ảnh hưởng gì tới dự án hay tới Claude Code**: `.agent/` là tooling cho Antigravity IDE, không có file nào của nó được `src/` hay build dùng. AgentKit global ở `~/.claude/skills` (102 skill) **còn nguyên**, và `.agents/rules/rule.md` (bản 1 file, có track trong git) cũng còn.

**Nếu cần lại**: cài lại kit từ nguồn phát hành của nó. Không có bản local nào để lấy.

**Bài học vận hành**: `tar -czf backup.tgz X && rm -rf X` chỉ an toàn khi `X` còn tồn tại. Nếu `X` đã mất thì `tar` vẫn tạo archive rỗng và `&&` vẫn đúng, nên lệnh "trông như" đã backup. Kiểm tra bằng `tar -tzf backup.tgz | wc -l` trước khi tin.

## 3. `.claude/` — ĐÃ XOÁ 2026-08-22. `docs/` là nguồn duy nhất

### Quyết định
`docs/` + `CLAUDE.md` là nguồn chân lý duy nhất. **Không giữ memory riêng cho agent trong repo này.**

### Vì sao
`.claude/agent-memory/` là bộ nhớ bền theo **loại agent** (`planner/`, `code-reviewer/`), do subagent tự ghi. Nội dung của nó (phiên 2026-08-22) là kiến thức thật, nhưng **toàn bộ đã được rút vào `docs/`** — nên giữ lại chỉ tạo bản trùng. Ba lý do bỏ:

1. **Hai nguồn nói cùng một chuyện thì sẽ lệch nhau.** Đúng failure mode đã ghi ở [decisions.md](decisions.md) D10 (changelog đi trước code) và đúng lý do 3 file `analysis-*.md` phải gắn nhãn SUPERSEDED.
2. **Phân mảnh theo loại agent.** Memory của `code-reviewer` thì `planner` không đọc được. `CLAUDE.md` thì mọi agent đều tự load.
3. **Untracked.** Clone repo là mất, review không thấy, và nó âm thầm lệch khỏi `docs/`.

Lợi ích duy nhất của nó — tự load không cần ai chỉ — thì `CLAUDE.md` đã làm, và làm tốt hơn: dùng chung mọi agent, có trong git, người đọc được.

### Kiến thức đã rút đi đâu
Đã đối chiếu 10/10 fact, không mất gì:

| Từ memory | Đã fold vào |
|---|---|
| host `sqlite3` 3.51.0 ≠ wasm app ship 3.49.1; pragma phải test ở wasm; `foreign_keys` no-op trong transaction; generated column vô hình với `pragma_table_info` | [architecture.md](architecture.md) §6 |
| Cách chạy codex không treo (prompt ~4KB treo 27 phút; đừng pipe `tail`; không có binary `timeout`; codex khẳng định sai rất tự tin) | [`../CLAUDE.md`](../CLAUDE.md) |
| Vision local-first đã khoá | [decisions.md](decisions.md) D1 |
| Durability là trục review số 1 + calibration "không xét lại" (`escapeSql` không khai thác được; avatar `<img>` là privacy chứ không phải XSS) | [sync-durability.md](sync-durability.md) §7, [privacy.md](privacy.md) §2 |
| Changelog đi trước code | [decisions.md](decisions.md) D10, [`../plans/roadmap.md`](../plans/roadmap.md) |

### Luật cho phiên sau
`.claude/agent-memory/` **sẽ tự sinh lại** — subagent ghi vào đó tự động, xoá không chặn được. Khi thấy nó xuất hiện:

1. Đọc, rút cái gì mới vào `docs/`.
2. Xoá thư mục.
3. **Không** coi nó là authority. Khi memory và `docs/` xung đột, **`docs/` thắng**.

## 4. `.claude/worktrees/flamboyant-moser/` — worktree git đã VỠ, ĐÃ XOÁ

Một bản copy đầy đủ của repo, 1.8 MB, timestamp **2026-03-16 22:13**. Không liên quan phiên hiện tại.

**Đã vỡ, không phải worktree dùng được:**
- `git status` bên trong → `fatal: not a git repository: (null)` — con trỏ `.git` trỏ vào chỗ không còn tồn tại
- `git worktree list` ở repo chính **chỉ thấy repo chính** → git không quản lý nó nữa, `git worktree prune` cũng vô dụng

**Tác hại thật:** `pnpm lint` quét cả `.claude/worktrees/flamboyant-moser/src/` — một bản `src/` cũ — vì `.claude/` không được `eslint.config.mjs` hay `tsconfig.json` loại trừ.

**`src/` trong đó thừa:** diff với repo chính cho đúng 5 file khác — `page.tsx`, `FamilyTreeCanvas.tsx`, `PersonCard.tsx`, `QuickAddForm.tsx`, `persons.ts` — chính là 5 file đang dirty ở main. Nghĩa là nó chỉ giữ trạng thái đã commit `8ed7c2a`, thứ git đã có.

**Đã cứu ra trước khi xoá:** 7 ảnh PNG chụp UI thời v0.4 (16/03) → `plans/reports/ui-260316/`. Đó là thứ duy nhất không tái tạo được.

**Đã xoá 2026-08-22.** 7 ảnh PNG được cứu ra `plans/reports/ui-260316/` trước khi xoá.

## 5. Việc dọn còn tồn

| Việc | Lý do |
|---|---|
| Thêm `.claude/` vào `.gitignore` | Nó **sẽ tự sinh lại** (§3) — subagent ghi vào đó tự động. Gitignore để lần sau nó không thành rác untracked. **Lưu ý**: eslint flat config KHÔNG đọc `.gitignore`, nên việc này không tự sửa được lint |
| Loại `.claude/` trong `eslint.config.mjs` | Phòng ngừa: khi `.claude/` sinh lại, nếu có worktree bên trong thì lint sẽ lại quét bản `src/` trùng |
| Xoá hoặc chuyển `test-exec.js` | 1 trong 12 lỗi lint. Nó là script nháp gọi thẳng `node_modules` — đúng việc mà harness test Phase 0 sẽ làm tử tế |
| Commit `pnpm-lock.yaml` | `package-lock.json` đã xoá, lockfile mới đang untracked → chưa ai reproduce được dependency |
