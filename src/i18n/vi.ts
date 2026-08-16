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
    unknownGender: string;
    saveAndNext: string;
    savedNotice: string;
    relationLabel: string;
    relationNone: string;
    relParent: string;
    relChild: string;
    relSpouse: string;
    relSibling: string;
    titleParent: string;
    titleChild: string;
    titleSpouse: string;
    titleSibling: string;
    errors: {
      nameRequired: string;
      genericError: string;
      siblingNeedsParent: string;
    };
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
  relatives: {
    open: string;
    title: string;
    description: string;
    close: string;
    noAnchor: string;
    empty: string;
    count: string;
    columns: {
      name: string;
      call: string;
      selfRef: string;
      branch: string;
      generation: string;
      birthYear: string;
      note: string;
    };
    sortBy: string;
    sortKinship: string;
    sortName: string;
    sortBranch: string;
    register: string;
    registers: { spoken: string; formal: string; reference: string };
    exportAs: string;
    invitation: string;
    invitationHint: string;
    invitationPlaceholder: string;
    invitationCopy: string;
    invitationCopied: string;
    invitationEmpty: string;
    unresolved: string;
    viaSpouse: string;
  };
  kinship: {
    unknown: string;
    callLabel: string;
    selfLabel: string;
    viaSpouse: string;
    noAnchor: string;
    defaultBranch: string;
  };
  branch: {
    open: string;
    title: string;
    description: string;
    defaultRegion: string;
    defaultRegionHint: string;
    create: string;
    namePlaceholder: string;
    region: string;
    province: string;
    provincePlaceholder: string;
    provinceHint: string;
    hasDialect: string;
    noDialect: string;
    roots: string;
    rootsHint: string;
    manual: string;
    manualHint: string;
    addPerson: string;
    searchPlaceholder: string;
    noResults: string;
    remove: string;
    memberCount: string;
    recompute: string;
    recomputing: string;
    deleteBranch: string;
    deleteConfirm: string;
    empty: string;
    selectBranch: string;
    close: string;
    regions: { BAC: string; TRUNG: string; NAM: string };
  };
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
    unknownGender: "Chưa rõ",
    saveAndNext: "Lưu và thêm tiếp",
    savedNotice: "Đã lưu {name}.",
    relationLabel: "Quan hệ với {name}",
    relationNone: "Không nối quan hệ",
    relParent: "Cha/Mẹ",
    relChild: "Con",
    relSpouse: "Vợ/Chồng",
    relSibling: "Anh/Chị/Em",
    titleParent: "Thêm cha/mẹ",
    titleChild: "Thêm con cái",
    titleSpouse: "Thêm vợ/chồng",
    titleSibling: "Thêm anh/chị/em",
    errors: {
      nameRequired: "Vui lòng nhập ít nhất Tên.",
      genericError: "Đã có lỗi xảy ra.",
      siblingNeedsParent:
        "Chưa biết cha/mẹ của {name}. Hãy thêm cha hoặc mẹ trước, anh/chị/em sẽ tự nối qua đó.",
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

  relatives: {
    open: "Danh sách họ hàng",
    title: "Danh sách họ hàng",
    description:
      "Mọi người thân tính từ người đang làm trung tâm, kèm cách bạn gọi họ và cách bạn xưng.",
    close: "Đóng",
    noAnchor: "Hãy chọn một người làm trung tâm trước.",
    empty: "Chưa có người thân nào để liệt kê.",
    count: "{count} dòng",
    columns: {
      name: "Họ tên",
      call: "Gọi",
      selfRef: "Xưng",
      branch: "Nhánh",
      generation: "Vai vế",
      birthYear: "Năm sinh",
      note: "Ghi chú",
    },
    sortBy: "Sắp xếp",
    sortKinship: "Theo nhánh & vai vế",
    sortName: "Theo tên",
    sortBranch: "Theo nhánh",
    register: "Giọng",
    registers: { spoken: "Nói thường", formal: "Trang trọng", reference: "Nhắc đến" },
    exportAs: "Xuất",
    invitation: "Mẫu câu thiệp mời",
    invitationHint:
      "Bạn tự viết mẫu, app điền tên vào. Dùng {call} cho cách gọi và {name} cho họ tên. Ví dụ: Kính mời {call} {name}.",
    invitationPlaceholder: "Kính mời {call} {name}",
    invitationCopy: "Chép toàn bộ",
    invitationCopied: "Đã chép.",
    invitationEmpty: "Viết mẫu câu ở trên để xem kết quả.",
    unresolved: "chưa rõ",
    viaSpouse: "gọi thay ngôi",
  },

  kinship: {
    unknown: "chưa rõ",
    callLabel: "Gọi",
    selfLabel: "xưng",
    viaSpouse: "gọi thay ngôi qua {name}",
    noAnchor: "Chọn một người làm trung tâm để hiện xưng hô.",
    defaultBranch: "Chưa thuộc nhánh nào",
  },

  branch: {
    open: "Nhánh",
    title: "Nhánh và cách xưng hô",
    description:
      "Mỗi nhánh có vùng miền riêng. Cùng một cây có thể vừa có họ nội Quảng Trị, họ ngoại Hà Nội, vừa có bên vợ miền Nam — mỗi bên xưng hô theo giọng của mình.",
    defaultRegion: "Vùng mặc định",
    defaultRegionHint:
      "Dùng cho người chưa thuộc nhánh nào. Khi bạn đang nhập liên tục vào một nhánh, vùng sẽ tự đi theo người vừa nhập; lựa chọn dưới đây là mức dự phòng cuối cùng.",
    create: "Thêm nhánh",
    namePlaceholder: "vd: Họ nội (Quảng Trị)",
    region: "Vùng",
    province: "Tỉnh / quê quán",
    provincePlaceholder: "vd: Quảng Trị",
    provinceHint:
      "Gõ tên tỉnh cũ hay mới đều được. Hiện chỉ Quảng Trị có bộ từ riêng; tỉnh khác dùng từ chung của miền cho tới khi bạn tự sửa.",
    roots: "Người gốc của nhánh",
    rootsHint:
      "Con cháu của những người này, và vợ/chồng của họ, tự động thuộc nhánh.",
    manual: "Gán thêm thủ công",
    manualHint:
      "Dành cho người cần xưng hô đúng nhưng không chung tổ tiên. Gán tay không bị mất khi tính lại.",
    addPerson: "Thêm người",
    searchPlaceholder: "Tìm theo tên…",
    noResults: "Không tìm thấy ai.",
    remove: "Bỏ",
    memberCount: "{count} người",
    recompute: "Tính lại thành viên",
    recomputing: "Đang tính…",
    deleteBranch: "Xóa nhánh",
    deleteConfirm: "Xóa nhánh này? Cách xưng hô của những người trong nhánh sẽ quay về vùng mặc định.",
    empty: "Chưa có nhánh nào.",
    selectBranch: "Chọn một nhánh để chỉnh sửa.",
    close: "Đóng",
    hasDialect: "Có bộ từ riêng",
    noDialect: "Dùng từ chung của miền",
    regions: { BAC: "Miền Bắc", TRUNG: "Miền Trung", NAM: "Miền Nam" },
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
