/**
 * English translation dictionary
 */
import type { Dictionary } from "./vi";

export const en: Dictionary = {
  appName: "Family Roots",
  appTagline: "Family Tree",

  header: {
    addMember: "Add Member",
    signInGoogle: "Sign in with Google",
    installPwa: "Install App",
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
    errors: {
      nameRequired: "Please enter at least the first name.",
      genericError: "An error occurred.",
      siblingNeedsParent:
        "This person has no recorded parent yet, so a sibling can't be linked. Add a parent for this person first.",
    },
  },

  backup: {
    export: "Export file",
    import: "Import file",
    exported: "Downloaded",
    restored: "Imported",
    confirmTitle: "Replace the whole tree with this file?",
    confirmBody:
      "The tree on this device will be replaced. The current version is downloaded to your machine first so you can go back.",
    currentTree: "Current tree",
    incomingFile: "Incoming file",
    persons: "people",
    relationships: "relationships",
    cancel: "Cancel",
    confirm: "Replace",
    working: "Working…",
  },
  canvas: {
    emptyTitle: "Empty Family Tree",
    emptyDesc: "Start by adding the first member — an ancestor or yourself.",
    addFirst: "Add First Member",
    membersCount: "members",
    relationships: "relationships",
    loadErrorTitle: "Couldn't load the family tree",
    reload: "Reload page",
  },
  viewport: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit to screen",
    reset: "Reset to 100%",
    canvasLabel:
      "Family tree — scroll to pan, Ctrl/Cmd + scroll or pinch to zoom, arrow keys to pan",
  },

  profile: {
    alive: "Living",
    statusUnknown: "Unknown",
    deceased: "Deceased",
    phone: "📞 Phone",
    address: "📍 Address",
    facebook: "🌐 Facebook",
    note: "📝 Notes",
    biography: "📖 Biography",
    setAsAnchor: "Set as center",
  },

  personCard: {
    deceased: "Deceased",
  },
};
