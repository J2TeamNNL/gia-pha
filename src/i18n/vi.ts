/**
 * Dictionary interface — add new keys here first, then implement in en.ts / vi.ts
 */
export interface Dictionary {
  appName: string;
  appTagline: string;
  header: {
    addMember: string;
    treeCatalog: string;
  };
  search: {
    placeholder: string;
    label: string;
    noResults: string;
    clear: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    selfLabel: string;
    tip: string;
    startButton: string;
  };
  form: {
    lastName: string;
    middleName: string;
    firstName: string;
    optional: string;
    required: string;
    gender: string;
    male: string;
    female: string;
    phone: string;
    note: string;
    displayName: string;
    surnameSuggestion: string;
    addDetails: string;
    hideDetails: string;
    editLater: string;
    cancel: string;
    save: string;
    saveSelf: string;
    fullForm: string;
    addMember: string;
    lastNamePlaceholder: string;
    middleNamePlaceholder: string;
    firstNamePlaceholder: string;
    phonePlaceholder: string;
    notePlaceholder: string;
    errors: { nameRequired: string; genericError: string };
  };
  canvas: {
    emptyTitle: string;
    emptyDesc: string;
    addFirst: string;
    membersCount: string;
    relationships: string;
  };
  graph: {
    zoomIn: string;
    zoomOut: string;
    fitView: string;
    depthLabel: string;
    depthAll: string;
    focusSelected: string;
    hiddenNotice: string;
  };
  profile: {
    alive: string;
    deceased: string;
    phone: string;
    address: string;
    facebook: string;
    note: string;
    biography: string;
    setAsAnchor: string;
    anchorBadge: string;
    closePanel: string;
  };
  personCard: { deceased: string };
  paste: {
    open: string;
    title: string;
    description: string;
    formatHint: string;
    placeholder: string;
    headerDetected: string;
    headerAssumed: string;
    preview: string;
    previewLimited: string;
    empty: string;
    row: string;
    status: string;
    ready: string;
    hasWarning: string;
    hasError: string;
    summary: string;
    importAll: string;
    importPartial: string;
    importing: string;
    close: string;
    done: string;
    columns: {
      fullName: string;
      gender: string;
      birthYear: string;
      deathYear: string;
      father: string;
      mother: string;
      spouse: string;
      phone: string;
      address: string;
      note: string;
    };
  };
}

/**
 * Vietnamese translation dictionary
 */
export const vi: Dictionary = {
  appName: "Gia Phả",
  appTagline: "Gia phả local-first",

  // Header
  header: {
    addMember: "Thêm thành viên",
    treeCatalog: "Danh sách cây gia phả",
  },

  // Search
  search: {
    placeholder: "Tìm thành viên…",
    label: "Tìm kiếm thành viên",
    noResults: "Không tìm thấy thành viên nào.",
    clear: "Xóa tìm kiếm",
  },

  // Onboarding
  onboarding: {
    title: "Bắt đầu Cây Gia Phả",
    subtitle: "Trước tiên, hãy điền thông tin của",
    selfLabel: "bạn",
    tip: "💡 Thông tin của bạn sẽ là trung tâm của cây — mọi danh xưng (Anh/Em/Bác/Cháu...) sẽ được tính từ hướng nhìn của bạn.",
    startButton: "Bắt đầu Cây Gia Phả của tôi →",
  },

  // Form fields
  form: {
    lastName: "Họ",
    middleName: "Tên đệm",
    firstName: "Tên",
    optional: "(tùy chọn)",
    required: "*",
    gender: "Giới tính",
    male: "🙎‍♂️ Nam",
    female: "🙎‍♀️ Nữ",
    phone: "Số điện thoại",
    note: "Ghi chú",
    displayName: "Hiển thị:",
    surnameSuggestion: "gợi ý:",
    addDetails: "Thêm chi tiết (tùy chọn)",
    hideDetails: "Ẩn chi tiết",
    editLater: "Chỉnh sửa thêm sau khi lưu.",
    cancel: "Hủy",
    save: "Lưu thành viên",
    saveSelf: "Bắt đầu →",
    fullForm: "Mở form đầy đủ",
    addMember: "Thêm thành viên",
    lastNamePlaceholder: "vd: Nguyễn",
    middleNamePlaceholder: "vd: Văn",
    firstNamePlaceholder: "vd: An",
    phonePlaceholder: "912 345 678",
    notePlaceholder: "Thêm ghi chú...",
    errors: {
      nameRequired: "Vui lòng nhập ít nhất Tên.",
      genericError: "Đã có lỗi xảy ra.",
    },
  },

  // Canvas
  canvas: {
    emptyTitle: "Cây Gia Phả trống",
    emptyDesc:
      "Bắt đầu bằng cách thêm thành viên đầu tiên — tổ tiên hoặc bản thân bạn.",
    addFirst: "Thêm thành viên đầu tiên",
    membersCount: "thành viên",
    relationships: "mối quan hệ",
  },

  // Graph controls
  graph: {
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    fitView: "Vừa khung nhìn",
    depthLabel: "Số thế hệ hiển thị",
    depthAll: "Tất cả",
    focusSelected: "Tập trung vào người đang chọn",
    hiddenNotice: "{count} thành viên đang ẩn do giới hạn hiển thị",
  },

  // Profile panel
  profile: {
    alive: "Còn sống",
    deceased: "Đã mất",
    phone: "📞 SĐT",
    address: "📍 Địa chỉ",
    facebook: "🌐 Facebook",
    note: "📝 Ghi chú",
    biography: "📖 Tiểu sử",
    setAsAnchor: "Đặt làm trung tâm",
    anchorBadge: "Bản thân",
    closePanel: "Đóng bảng thông tin",
  },

  personCard: {
    deceased: "Đã mất",
  },

  paste: {
    open: "Dán danh sách",
    title: "Dán danh sách từ Excel",
    description:
      "Sao chép các dòng từ Excel hoặc Google Sheets rồi dán vào ô dưới. Xem trước rồi mới lưu.",
    formatHint:
      "Cột: Họ tên, Giới tính, Năm sinh, Cha, Mẹ, Vợ/Chồng. Cha/Mẹ/Vợ/Chồng ghi đúng họ tên của người trong danh sách hoặc đã có trong cây. Trùng tên thì ghi thêm năm sinh trong ngoặc: Nguyễn Văn An (1950).",
    placeholder: "Dán vào đây…",
    headerDetected: "Đã nhận ra dòng tiêu đề.",
    headerAssumed:
      "Không thấy dòng tiêu đề — đọc theo thứ tự: Họ tên, Giới tính, Năm sinh, Cha, Mẹ, Vợ/Chồng.",
    preview: "Xem trước",
    previewLimited:
      "Chỉ hiện {shown}/{total} dòng đầu; tất cả các dòng vẫn được kiểm tra và lưu.",
    empty: "Chưa có gì để xem trước.",
    row: "Dòng",
    status: "Tình trạng",
    ready: "Sẵn sàng",
    hasWarning: "Cần xem lại",
    hasError: "Lỗi",
    summary: "{ready} dòng sẵn sàng · {warning} cần xem lại · {error} lỗi",
    importAll: "Lưu {count} người",
    importPartial: "Bỏ qua {error} dòng lỗi, lưu {count} người",
    importing: "Đang lưu…",
    close: "Đóng",
    done: "Đã thêm {persons} người và {relationships} quan hệ.",
    columns: {
      fullName: "Họ tên",
      gender: "Giới tính",
      birthYear: "Năm sinh",
      deathYear: "Năm mất",
      father: "Cha",
      mother: "Mẹ",
      spouse: "Vợ/Chồng",
      phone: "Điện thoại",
      address: "Địa chỉ",
      note: "Ghi chú",
    },
  },
};
