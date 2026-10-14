export type Role = "patient" | "caregiver" | "doctor" | "clinic_coordinator" | "care_coordinator" | "super_admin";

export const STAFF_ROLES: Role[] = ["doctor", "clinic_coordinator", "care_coordinator", "super_admin"];
export const PATIENT_ROLES: Role[] = ["patient", "caregiver"];

export function isStaff(role: string) {
  return STAFF_ROLES.includes(role as Role);
}

export function homeFor(role: string) {
  switch (role) {
    case "doctor":
      return "/doctor";
    case "clinic_coordinator":
      return "/clinic";
    case "care_coordinator":
      return "/coordinator";
    case "super_admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  patient: "Patient",
  caregiver: "Family member / caregiver",
  doctor: "Doctor",
  clinic_coordinator: "Clinic coordinator",
  care_coordinator: "Care coordinator",
  super_admin: "Super admin",
};
