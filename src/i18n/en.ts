/**
 * English translation dictionary
 */
import type { Dictionary } from "./vi";

export const en: Dictionary = {
  appName: "Family Roots",
  appTagline: "Family Tree",

  header: {
    addMember: "Add Member",
    treeCatalog: "Family tree catalog",
  },

  search: {
    placeholder: "Search members…",
    label: "Search members",
    noResults: "No members found.",
    clear: "Clear search",
  },

  onboarding: {
    title: "Start Your Family Tree",
    subtitle: "First, let's add",
    selfLabel: "yourself",
    tip: "💡 Your profile will be the center of the tree — all titles (Uncle/Aunt/Grandparent...) will be shown relative to you.",
    startButton: "Start My Family Tree →",
  },

  form: {
    lastName: "Last Name",
    middleName: "Middle Name",
    firstName: "First Name",
    optional: "(optional)",
    required: "*",
    gender: "Gender",
    male: "🙎‍♂️ Male",
    female: "🙎‍♀️ Female",
    phone: "Phone Number",
    note: "Notes",
    displayName: "Display name:",
    surnameSuggestion: "suggest:",
    addDetails: "Add details (optional)",
    hideDetails: "Hide details",
    editLater: "You can edit more information after saving.",
    cancel: "Cancel",
    save: "Save Member",
    saveSelf: "Get Started →",
    fullForm: "Open full form",
    addMember: "Add Member",
    lastNamePlaceholder: "e.g. Smith",
    middleNamePlaceholder: "e.g. James",
    firstNamePlaceholder: "e.g. John",
    phonePlaceholder: "912 345 678",
    notePlaceholder: "Add a note...",
    unknownGender: "Not known",
    saveAndNext: "Save and add another",
    savedNotice: "Saved {name}.",
    relationLabel: "Relationship to {name}",
    relationNone: "No relationship",
    relParent: "Parent",
    relChild: "Child",
    relSpouse: "Spouse",
    relSibling: "Sibling",
    titleParent: "Add a parent",
    titleChild: "Add a child",
    titleSpouse: "Add a spouse",
    titleSibling: "Add a sibling",
    errors: {
      nameRequired: "Please enter at least the first name.",
      genericError: "An error occurred.",
      siblingNeedsParent:
        "No parent is known for {name}. Add a father or mother first; siblings link through them.",
    },
  },

  canvas: {
    emptyTitle: "Empty Family Tree",
    emptyDesc: "Start by adding the first member — an ancestor or yourself.",
    addFirst: "Add First Member",
    membersCount: "members",
    relationships: "relationships",
  },

  graph: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fitView: "Fit to view",
    depthLabel: "Generations shown",
    depthAll: "All",
    focusSelected: "Focus on selected person",
    hiddenNotice: "{count} members hidden by the display limit",
  },

  profile: {
    alive: "Living",
    deceased: "Deceased",
    phone: "📞 Phone",
    address: "📍 Address",
    facebook: "🌐 Facebook",
    note: "📝 Notes",
    biography: "📖 Biography",
    setAsAnchor: "Set as center",
    anchorBadge: "You",
    closePanel: "Close details panel",
  },

  personCard: {
    deceased: "Deceased",
  },

  branch: {
    open: "Branches",
    title: "Branches and how they address each other",
    description:
      "Each branch carries its own region. One tree can hold a Quảng Trị paternal line, a Hà Nội maternal line, and a southern spouse's family, each addressed in its own register.",
    defaultRegion: "Default region",
    defaultRegionHint:
      "Used for anyone in no branch. This is your choice, not a guess.",
    create: "Add a branch",
    namePlaceholder: "e.g. Paternal line (Quảng Trị)",
    region: "Region",
    province: "Province / ancestral home",
    provincePlaceholder: "e.g. Quảng Trị",
    provinceHint:
      "Type any province name, current or historical. Only Quảng Trị carries its own words today; anywhere else uses the region's shared words until you correct them.",
    roots: "Root people",
    rootsHint:
      "Their descendants, and the partners who married in, belong to the branch automatically.",
    manual: "Assigned by hand",
    manualHint:
      "For people who must be addressed correctly but share no ancestor. Manual assignments survive a recompute.",
    addPerson: "Add a person",
    searchPlaceholder: "Search by name…",
    noResults: "Nobody found.",
    remove: "Remove",
    memberCount: "{count} people",
    recompute: "Recompute members",
    recomputing: "Recomputing…",
    deleteBranch: "Delete branch",
    deleteConfirm: "Delete this branch? Its members fall back to the default region.",
    empty: "No branches yet.",
    selectBranch: "Select a branch to edit.",
    close: "Close",
    hasDialect: "Has its own words",
    noDialect: "Uses the region's words",
    regions: { BAC: "North", TRUNG: "Central", NAM: "South" },
  },

  paste: {
    open: "Paste a list",
    title: "Paste a list from a spreadsheet",
    description:
      "Copy rows out of Excel or Google Sheets and paste them below. Review the preview before saving.",
    formatHint:
      "Columns: Full name, Gender, Birth year, Father, Mother, Spouse. Name parents and partners exactly as they appear in this list or already in the tree. When a name repeats, add the birth year in brackets: Nguyễn Văn An (1950).",
    placeholder: "Paste here…",
    headerDetected: "Header row recognised.",
    headerAssumed:
      "No header row found — reading columns in order: Full name, Gender, Birth year, Father, Mother, Spouse.",
    preview: "Preview",
    previewLimited:
      "Showing the first {shown} of {total} rows; every row is still checked and saved.",
    empty: "Nothing to preview yet.",
    row: "Row",
    status: "Status",
    ready: "Ready",
    hasWarning: "Needs a look",
    hasError: "Error",
    summary: "{ready} ready · {warning} need a look · {error} with errors",
    importAll: "Save {count} people",
    importPartial: "Skip {error} failing rows, save {count} people",
    importing: "Saving…",
    close: "Close",
    done: "Added {persons} people and {relationships} relationships.",
    columns: {
      fullName: "Full name",
      gender: "Gender",
      birthYear: "Birth year",
      deathYear: "Death year",
      father: "Father",
      mother: "Mother",
      spouse: "Spouse",
      phone: "Phone",
      address: "Address",
      note: "Notes",
    },
  },
};
