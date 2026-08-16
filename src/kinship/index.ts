export { MAX_PATH_DEPTH, resolvePath } from "./path";
export { compareSeniority } from "./seniority";
export { resolveBranchAddresses, profileFor } from "./branchContext";
export {
  BAC,
  TRUNG,
  NAM,
  TRUNG_QUANG_TRI,
  REGION_PROFILES,
  resolveAddress,
  birthOrderLabel,
  withProvince,
} from "./dictionaries";
export type {
  AddressContext,
  BranchAddress,
  BranchDialect,
} from "./branchContext";
export type {
  AddressEntry,
  AddressPair,
  AddressResolution,
  AddressStatus,
  DictAddressEntry,
  DictAddressPair,
  DictSelfRef,
  EgoGender,
  HopKind,
  KinshipGender,
  KinshipPerson,
  KinshipRelationship,
  KinshipRelationType,
  PathHop,
  PathResult,
  RegionCode,
  RegionProfile,
  Register,
  Seniority,
  SeniorityInput,
} from "./types";
