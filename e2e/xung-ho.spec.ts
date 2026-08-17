import { expect, test } from "@playwright/test";

const PASTED_FAMILY = [
  "Họ tên\tGiới tính\tNăm sinh\tCha",
  "Nguyễn Văn Tổ\tNam\t1930",
  "Nguyễn Văn Cả\tNam\t1955\tNguyễn Văn Tổ",
  "Nguyễn Văn Bố\tNam\t1960\tNguyễn Văn Tổ",
  "Nguyễn Long\tNam\t1990\tNguyễn Văn Bố",
].join("\n");

async function createTreeWithPastedFamily(
  page: import("@playwright/test").Page,
  treeName: string,
) {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => crossOriginIsolated)).toBe(true);

  await page.getByLabel("Tên cây gia phả mới").fill(treeName);
  await page.getByRole("button", { name: "Tạo cây" }).click();
  await page.locator("#ob-first").fill("Người Đầu");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Người Đầu", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Dán danh sách" }).click();
  await page.getByPlaceholder("Dán vào đây…").fill(PASTED_FAMILY);
  await expect(page.getByText(/4 dòng sẵn sàng/)).toBeVisible();
  await page.getByRole("button", { name: /Lưu 4 người/ }).click();
  await expect(page.getByText(/Đã thêm 4 người và 3 quan hệ/)).toBeVisible();
  await page.getByRole("button", { name: "Đóng" }).click();
}

async function makeLongTheReferencePerson(
  page: import("@playwright/test").Page,
) {
  const search = page.getByRole("combobox", { name: "Tìm kiếm thành viên" });
  await search.fill("nguyen long");
  await expect(page.getByRole("option", { name: /Nguyễn Long/ })).toBeVisible();
  await search.press("Enter");
  await page.getByRole("button", { name: "Đặt làm trung tâm" }).click();
  await expect(page.getByText("⭐ Bản thân")).toBeVisible();
  await page.keyboard.press("Escape");
  // The deselected card fades its add-buttons out; wait for them to go rather
  // than racing the animation.
  await expect(page.locator('[title="Thêm con"]')).toHaveCount(0);
}

test("pastes a family, then names the father's elder brother bác", async ({
  page,
}) => {
  await createTreeWithPastedFamily(page, "Cây Xưng Hô");
  await makeLongTheReferencePerson(page);

  // Show every generation so the uncle is on screen, not clipped by depth.
  await page.getByLabel("Số thế hệ hiển thị").selectOption({ label: "Tất cả" });

  const uncleCard = page.getByRole("button", { name: /Nguyễn Văn Cả/ });
  await expect(uncleCard).toBeVisible();
  await expect(uncleCard).toContainText("bác");

  // The panel spells out both halves of the pair.
  await uncleCard.click();
  await expect(page.getByText("Gọi", { exact: false })).toBeVisible();
  await expect(page.getByText("cháu", { exact: false }).first()).toBeVisible();
});

test("lists relatives with their terms and exports them", async ({ page }) => {
  await createTreeWithPastedFamily(page, "Cây Danh Sách");
  await makeLongTheReferencePerson(page);

  await page.getByRole("button", { name: "Danh sách họ hàng" }).click();
  const uncleRow = page.getByRole("row", { name: /Nguyễn Văn Cả/ });
  await expect(uncleRow).toBeVisible();
  await expect(uncleRow).toContainText("bác");

  // The invitation wording is the user's own template, filled per relative.
  await page
    .getByLabel("Mẫu câu thiệp mời")
    .fill("Kính mời {call} {name}");
  await expect(page.getByText("Kính mời bác Nguyễn Văn Cả")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
});

test("creates a branch and shows it in the graph legend", async ({ page }) => {
  await createTreeWithPastedFamily(page, "Cây Nhánh");

  await page.getByRole("button", { name: "Nhánh" }).click();
  await page.getByRole("button", { name: "+ Thêm nhánh" }).click();

  await page.getByLabel("vd: Họ nội (Quảng Trị)").fill("Họ nội");
  await page.getByLabel("Tỉnh / quê quán").fill("Quảng Trị");
  await page.getByLabel("Tỉnh / quê quán").blur();
  await page
    .getByRole("group", { name: "Vùng", exact: true })
    .getByRole("button", { name: "Miền Trung" })
    .click();
  await expect(page.getByText("Có bộ từ riêng")).toBeVisible();

  // Rooting the branch at the ancestor pulls in every descendant.
  await page.getByPlaceholder("Tìm theo tên…").first().fill("Nguyễn Văn Tổ");
  await page.getByRole("button", { name: /Nguyễn Văn Tổ/ }).click();
  await expect(page.getByText(/4 người/)).toBeVisible();

  await page.getByRole("button", { name: "Đóng" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Họ nội" }),
  ).toBeVisible();
});

test("a birth year typed into the form decides bác versus chú", async ({
  page,
}) => {
  await createTreeWithPastedFamily(page, "Cây Vai Vế");
  await makeLongTheReferencePerson(page);
  await page.getByLabel("Số thế hệ hiển thị").selectOption({ label: "Tất cả" });

  // A brother of the father, born after him, is chú rather than bác.
  await page.getByRole("button", { name: /Nguyễn Văn Bố/ }).click();
  await page.getByTitle("Thêm anh chị em").click();
  await page.getByLabel("Họ tên").fill("Nguyễn Văn Út");
  await page.getByLabel("Năm sinh").fill("1970");
  await page.getByRole("button", { name: "Lưu và đóng" }).click();

  const youngerUncle = page.getByRole("button", { name: /Nguyễn Văn Út/ });
  await expect(youngerUncle).toBeVisible();
  await expect(youngerUncle).toContainText("chú");

  // The elder brother from the pasted list stays bác, so the split is real.
  await expect(page.getByRole("button", { name: /Nguyễn Văn Cả/ })).toContainText(
    "bác",
  );
});
