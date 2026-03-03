/**
 * Dictionary interface — add new keys here first, then implement in en.ts / vi.ts
 */
export interface Dictionary {
  appName: string;
  appTagline: string;
  header: { addMember: string; signInGoogle: string; installPwa: string };
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
  profile: {
    alive: string;
    deceased: string;
    phone: string;
    address: string;
    facebook: string;
    note: string;
    biography: string;
    setAsAnchor: string;
  };
  personCard: { deceased: string };
}

/**
 * Vietnamese translation dictionary
 */
export const vi: Dictionary = {
  appName: "Cội Nguồn",
  appTagline: "Gia Phả",

  // Header
  header: {
    addMember: "Thêm thành viên",
    signInGoogle: "Đăng nhập Google",
    installPwa: "Cài đặt App",
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
  },

  personCard: {
    deceased: "Đã mất",
  },
};
