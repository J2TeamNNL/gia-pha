/**
 * Bộ tính layout cây gia phả — HÀM THUẦN.
 *
 * Không import React, không đọc store, không phụ thuộc bất cứ gì ngoài
 * input truyền vào. Vì vậy gọi được trực tiếp từ Node để test đơn vị.
 *
 * Nguyên lý (xem docs/tree-layout.md để biết bằng chứng đo đạc):
 * 1. `y` = đời tuyệt đối (đếm từ tổ tiên xa nhất tìm được trong đồ thị) × pitch hằng số.
 * 2. `x` reserve đủ chiều rộng subtree — không bao giờ chỉ căn theo bản thân một node.
 * 3. Con được nhóm theo ĐÚNG bộ cha/mẹ đã ghi (không suy diễn) — half-sibling từ
 *    hai bà khác nhau không lẫn vào cùng một nhóm.
 * 4. Người không có cha/mẹ ghi nhận nhưng có vợ/chồng ("married-in", hoặc ông/bà
 *    gốc của rừng) được ghép cạnh vợ/chồng thay vì trở thành một "gốc" độc lập
 *    lạc chỗ. Người có cha/mẹ ghi nhận luôn được đặt theo chính gia đình ruột của
 *    họ — hôn nhân giữa hai người CÙNG có huyết thống riêng (anh em họ lấy nhau)
 *    chỉ là một đường nối, không ảnh hưởng toạ độ hai bên (giữ cross-link, không
 *    clone người, không thể tạo chu trình đệ quy vì cạnh PARENT_OF luôn tăng đời).
 * 5. Toàn bộ đệ quy có visited-guard nên chịu được dữ liệu hỏng (chu trình
 *    PARENT_OF do thiếu FK constraint) mà không bao giờ loop vô hạn.
 */

export interface LayoutConfig {
  /** px mỗi cột ngang (x) */
  colWidth: number;
  /** px mỗi đời (y) */
  rowHeight: number;
  /** chiều cao card cố định — dùng để tính điểm bắt đầu/kết thúc đường nối */
  cardHeight: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  colWidth: 240,
  rowHeight: 180,
  cardHeight: 120,
};

/** Chỉ cần đúng shape này — Person/Relationship thật của app thoả mãn tự nhiên. */
export interface LayoutPerson {
  id: string;
  birth_year?: number;
}

export type LayoutRelationType =
  | "PARENT_OF"
  | "ADOPTED_PARENT_OF"
  | "SPOUSE"
  | "EX_SPOUSE"
  | string;

export interface LayoutRelationship {
  person_id: string;
  related_to_id: string;
  rel_type: LayoutRelationType;
  is_primary?: boolean;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  generation: number;
  /** id của connected component (đồ thị rời rạc — cây là FOREST) */
  componentId: string;
}

export type ConnectorKind = "parent-child" | "spouse" | "ex-spouse";

export interface ConnectorPath {
  kind: ConnectorKind;
  /** thuộc tính `d` — có thể chứa NHIỀU subpath (nhiều lệnh M) trong CÙNG một path */
  d: string;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  connectors: ConnectorPath[];
}

const PARENT_TYPES = new Set(["PARENT_OF", "ADOPTED_PARENT_OF"]);
const SPOUSE_TYPES = new Set(["SPOUSE", "EX_SPOUSE"]);

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** DSU đơn giản — chỉ dùng để gắn nhãn connected component, không dùng cho toạ độ. */
function buildComponents(
  ids: string[],
  edges: LayoutRelationship[],
): Map<string, string> {
  const parent = new Map<string, string>(ids.map((id) => [id, id]));
  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const e of edges) union(e.person_id, e.related_to_id);
  const result = new Map<string, string>();
  for (const id of ids) result.set(id, find(id));
  return result;
}

/**
 * Đời tuyệt đối (y) — BFS đa gốc, chịu được chu trình dữ liệu hỏng.
 * Gốc = người không có cha/mẹ ghi nhận => đời 0. Con = cha/mẹ + 1.
 * Vợ/chồng (SPOUSE + EX_SPOUSE) = cùng đời với người kia.
 */
function computeGenerations(
  ids: string[],
  parentsOf: Map<string, string[]>,
  childrenOfPerson: Map<string, string[]>,
  spousesOf: Map<string, string[]>,
): Map<string, number> {
  const gen = new Map<string, number>();
  const queue: string[] = [];
  const hasParents = (id: string) => (parentsOf.get(id)?.length ?? 0) > 0;

  const seed = (id: string, g: number) => {
    if (gen.has(id)) return;
    gen.set(id, g);
    queue.push(id);
  };

  for (const id of ids) if (!hasParents(id)) seed(id, 0);

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const g = gen.get(id)!;
    for (const c of childrenOfPerson.get(id) ?? []) seed(c, g + 1);
    for (const s of spousesOf.get(id) ?? []) seed(s, g);

    // Hàng đợi cạn nhưng vẫn còn người chưa gán đời => chu trình PARENT_OF
    // không có gốc (bug thiếu FK). Chốt một người ở đời 0 để cắt chu trình
    // và tiếp tục — không loop vô hạn, không rớt người nào.
    if (head === queue.length) {
      for (const id2 of ids) {
        if (!gen.has(id2)) {
          seed(id2, 0);
          break;
        }
      }
    }
  }

  return gen;
}

interface FamilyUnit {
  parentIds: string[];
  children: string[];
}

export function computeTreeLayout(
  persons: LayoutPerson[],
  relationships: LayoutRelationship[],
  anchorId?: string | null,
  configOverrides: Partial<LayoutConfig> = {},
): TreeLayout {
  const cfg: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...configOverrides };
  const ids = persons.map((p) => p.id);
  const validIds = new Set(ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  const birthYearOf = new Map<string, number>(
    persons.map((p) => [p.id, p.birth_year ?? Number.POSITIVE_INFINITY]),
  );
  const sortKey = (id: string) =>
    (birthYearOf.get(id) ?? Number.POSITIVE_INFINITY) * 1_000_000 +
    (order.get(id) ?? 0);

  // Lọc quan hệ hỏng: id không tồn tại, hoặc tự tham chiếu chính mình
  // (bug "tự làm cha mình" đã biết — chưa có FK/CHECK constraint chặn ở DB).
  const rels = relationships.filter(
    (r) =>
      validIds.has(r.person_id) &&
      validIds.has(r.related_to_id) &&
      r.person_id !== r.related_to_id,
  );
  const parentEdges = rels.filter((r) => PARENT_TYPES.has(r.rel_type));
  const spouseEdges = rels.filter((r) => SPOUSE_TYPES.has(r.rel_type));

  const parentsOf = new Map<string, string[]>();
  const childrenOfPerson = new Map<string, string[]>();
  for (const r of parentEdges) {
    pushMap(parentsOf, r.related_to_id, r.person_id);
    pushMap(childrenOfPerson, r.person_id, r.related_to_id);
  }
  const spousesOf = new Map<string, string[]>();
  for (const r of spouseEdges) {
    pushMap(spousesOf, r.person_id, r.related_to_id);
    pushMap(spousesOf, r.related_to_id, r.person_id);
  }
  const hasParents = (id: string) => (parentsOf.get(id)?.length ?? 0) > 0;

  // ── 1. Đời tuyệt đối (y) ─────────────────────────────────────────────────
  const genMap = computeGenerations(ids, parentsOf, childrenOfPerson, spousesOf);

  // ── 2. Family unit — nhóm con theo ĐÚNG bộ cha/mẹ đã ghi ────────────────
  // Con của bà 1 và con của bà 2 có key khác nhau => không lẫn nhóm, không
  // cần union_id (chưa có trong data model hiện tại — xem báo cáo).
  const unitsByKey = new Map<string, FamilyUnit>();
  const unitsByParent = new Map<string, string[]>();
  for (const id of ids) {
    const parents = [...new Set(parentsOf.get(id) ?? [])].sort();
    if (parents.length === 0) continue;
    const key = parents.join("|");
    let unit = unitsByKey.get(key);
    if (!unit) {
      unit = { parentIds: parents, children: [] };
      unitsByKey.set(key, unit);
      for (const pid of parents) pushMap(unitsByParent, pid, key);
    }
    unit.children.push(id);
  }
  for (const unit of unitsByKey.values()) {
    unit.children.sort((a, b) => sortKey(a) - sortKey(b));
  }
  /**
   * Một unit 2-cha-mẹ (vd "cha|me") được đăng ký ở CẢ HAI `unitsByParent`.
   * Nếu để cả hai cha/mẹ cùng đệ quy vào cùng unit đó khi tính subtree của
   * CHÍNH HỌ, người xử lý SAU sẽ đọc lại toạ độ con mà người xử lý TRƯỚC đã
   * cố định và "tự căn" vào đúng chỗ đó — trùng khít (bug đã đo: bà nội
   * trùng ông ngoại). Chỉ MỘT cha/mẹ (id nhỏ nhất trong unit — xác định,
   * không cần đệ quy để chọn) chịu trách nhiệm reserve chiều rộng + đặt x
   * cho unit đó; người còn lại (vd "me") không xử lý unit này ở đây — họ vẫn
   * có toạ độ riêng, đến từ CHÍNH gia đình ruột của họ (bước 2, vai trò con).
   */
  const ownedUnitsOf = (id: string): string[] =>
    (unitsByParent.get(id) ?? []).filter(
      (key) => unitsByKey.get(key)!.parentIds[0] === id,
    );

  // ── 3. Người không có cha/mẹ ghi nhận nhưng có vợ/chồng => ghép cạnh ────
  // Người CÓ cha/mẹ ghi nhận (vd "me" trong fixture 4 ông bà) luôn được đặt
  // theo gia đình ruột của chính họ ở bước 2 — không đi qua nhánh này, nên
  // không có xung đột "vừa theo cha mẹ ruột vừa bám vợ/chồng".
  const attachTargetRaw = new Map<string, string>();
  for (const id of ids) {
    if (hasParents(id)) continue;
    const spouses = (spousesOf.get(id) ?? []).filter((s) => validIds.has(s));
    if (spouses.length === 0) continue;
    const bloodSpouse = spouses.find((s) => hasParents(s));
    if (bloodSpouse) {
      attachTargetRaw.set(id, bloodSpouse);
      continue;
    }
    // Cả hai đều không rõ cha/mẹ (vd ông/bà gốc của rừng) — id nhỏ hơn làm
    // gốc để đệ quy, người kia bám theo. Quy tắc xác định, không đệ quy.
    const smallest = [id, ...spouses].slice().sort()[0];
    if (smallest !== id) attachTargetRaw.set(id, smallest);
  }
  function resolveAttach(id: string, seen: Set<string> = new Set()): string {
    const target = attachTargetRaw.get(id);
    if (!target || seen.has(id)) return id; // guard chu trình bám nhau
    seen.add(id);
    return resolveAttach(target, seen);
  }
  const attachedByTarget = new Map<string, string[]>();
  for (const id of ids) {
    const resolved = resolveAttach(id);
    if (resolved !== id) pushMap(attachedByTarget, resolved, id);
  }
  for (const list of attachedByTarget.values()) list.sort();

  // ── 4. Chiều rộng subtree (đệ quy, memo + visited-guard chống chu trình) ─
  const widthCache = new Map<string, number>();
  const widthInProgress = new Set<string>();
  function unitWidth(key: string): number {
    const unit = unitsByKey.get(key)!;
    return unit.children.reduce((sum, c) => sum + personWidth(c), 0);
  }
  function personWidth(id: string): number {
    const cached = widthCache.get(id);
    if (cached !== undefined) return cached;
    if (widthInProgress.has(id)) return 1; // chu trình dữ liệu hỏng — cắt tại đây
    widthInProgress.add(id);
    const units = ownedUnitsOf(id);
    const base = units.length
      ? units.reduce((sum, key) => sum + unitWidth(key), 0)
      : 1;
    const extra = (attachedByTarget.get(id) ?? []).length;
    const width = base + extra;
    widthInProgress.delete(id);
    widthCache.set(id, width);
    return width;
  }

  // ── 5. Đặt x — đệ quy từ gốc, reserve đủ chiều rộng subtree ─────────────
  const xMap = new Map<string, number>();
  function placePerson(id: string, leftX: number): void {
    if (xMap.has(id)) return; // đã đặt (hoặc đang được đặt — chống chu trình)
    xMap.set(id, leftX); // placeholder chống tái nhập đệ quy do dữ liệu hỏng
    const units = ownedUnitsOf(id);
    if (units.length === 0) {
      xMap.set(id, leftX);
      return;
    }
    let cursor = leftX;
    const childXs: number[] = [];
    for (const key of units) {
      const unit = unitsByKey.get(key)!;
      for (const child of unit.children) {
        placePerson(child, cursor);
        childXs.push(xMap.get(child)!);
        cursor += personWidth(child);
      }
    }
    xMap.set(id, (Math.min(...childXs) + Math.max(...childXs)) / 2);
  }

  const components = buildComponents(ids, rels);
  const roots = persons.filter(
    (p) => !hasParents(p.id) && resolveAttach(p.id) === p.id,
  );
  roots.sort((a, b) => sortKey(a.id) - sortKey(b.id));
  if (anchorId && validIds.has(anchorId)) {
    const anchorComponent = components.get(anchorId);
    roots.sort((a, b) => {
      const aScore = components.get(a.id) === anchorComponent ? 0 : 1;
      const bScore = components.get(b.id) === anchorComponent ? 0 : 1;
      return aScore - bScore;
    });
  }

  let cursor = 0;
  for (const root of roots) {
    placePerson(root.id, cursor);
    cursor += personWidth(root.id);
  }
  // An toàn: không rớt ai (vd chu trình PARENT_OF không gốc — bug đã biết).
  // Bỏ qua người "bám vợ/chồng" (resolveAttach(id) !== id) — họ được đặt ở
  // bước ghép cạnh dưới đây; đặt họ độc lập ở đây sẽ tính lại subtree con của
  // người họ bám vào và trùng toạ độ với chính người đó.
  for (const id of ids) {
    if (!xMap.has(id) && resolveAttach(id) === id) {
      placePerson(id, cursor);
      cursor += personWidth(id) || 1;
    }
  }
  // Ghép người "married-in" / ông-bà-gốc-bám-nhau cạnh người họ bám vào.
  for (const [targetId, attached] of attachedByTarget.entries()) {
    const baseX = xMap.get(targetId);
    if (baseX === undefined) continue;
    attached.forEach((attachedId, i) => {
      if (!xMap.has(attachedId)) xMap.set(attachedId, baseX + i + 1);
    });
  }

  const nodes: LayoutNode[] = persons.map((p) => ({
    id: p.id,
    x: (xMap.get(p.id) ?? 0) * cfg.colWidth,
    y: (genMap.get(p.id) ?? 0) * cfg.rowHeight,
    generation: genMap.get(p.id) ?? 0,
    componentId: components.get(p.id) ?? p.id,
  }));

  const connectors = buildConnectors(unitsByKey, spouseEdges, xMap, genMap, cfg);

  return { nodes, connectors };
}

function buildConnectors(
  unitsByKey: Map<string, FamilyUnit>,
  spouseEdges: LayoutRelationship[],
  xOf: Map<string, number>,
  genOf: Map<string, number>,
  cfg: LayoutConfig,
): ConnectorPath[] {
  const px = (x: number) => x * cfg.colWidth;
  const py = (g: number) => g * cfg.rowHeight;
  const halfCard = cfg.cardHeight / 2;

  // Cha/mẹ → con: MỘT path duy nhất chứa mọi subpath (mỗi unit = 1 drop + N bus).
  let parentChildD = "";
  for (const unit of unitsByKey.values()) {
    const parentXs = unit.parentIds
      .map((id) => xOf.get(id))
      .filter((x): x is number => x !== undefined);
    if (parentXs.length === 0 || unit.children.length === 0) continue;
    const parentGen = Math.min(
      ...unit.parentIds.map((id) => genOf.get(id) ?? 0),
    );
    const midX = px((Math.min(...parentXs) + Math.max(...parentXs)) / 2);
    const parentY = py(parentGen) + halfCard;
    const busY = py(parentGen) + cfg.rowHeight / 2;
    parentChildD += `M ${midX} ${parentY} L ${midX} ${busY} `;
    for (const child of unit.children) {
      const childX = xOf.get(child);
      const childGen = genOf.get(child);
      if (childX === undefined || childGen === undefined) continue;
      const cx = px(childX);
      const cy = py(childGen) - halfCard;
      parentChildD += `M ${midX} ${busY} L ${cx} ${busY} L ${cx} ${cy} `;
    }
  }

  // Vợ/chồng — MỘT path cho SPOUSE (nét liền), MỘT path riêng cho EX_SPOUSE
  // (nét đứt — renderer áp strokeDasharray theo `kind`). Dedupe theo cặp,
  // không còn path "bridge" trùng hình học.
  let spouseD = "";
  let exSpouseD = "";
  const seenPairs = new Set<string>();
  for (const r of spouseEdges) {
    const pairKey = [r.person_id, r.related_to_id].sort().join("|");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const x1 = xOf.get(r.person_id);
    const x2 = xOf.get(r.related_to_id);
    const g1 = genOf.get(r.person_id);
    const g2 = genOf.get(r.related_to_id);
    if (x1 === undefined || x2 === undefined || g1 === undefined || g2 === undefined) continue;
    const line = `M ${px(x1)} ${py(g1)} L ${px(x2)} ${py(g2)} `;
    if (r.rel_type === "EX_SPOUSE") exSpouseD += line;
    else spouseD += line;
  }

  const connectors: ConnectorPath[] = [];
  if (parentChildD.trim()) connectors.push({ kind: "parent-child", d: parentChildD.trim() });
  if (spouseD.trim()) connectors.push({ kind: "spouse", d: spouseD.trim() });
  if (exSpouseD.trim()) connectors.push({ kind: "ex-spouse", d: exSpouseD.trim() });
  return connectors;
}
