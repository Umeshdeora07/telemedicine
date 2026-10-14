/**
 * Brand settings. "CareMitra" is a placeholder name: change it here (or set
 * NEXT_PUBLIC_BRAND_NAME) and it updates across the site, emails, PDFs and
 * translations.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "CareMitra",
  tagline: "Trusted doctors, online and in clinic",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "help@caremitra.example",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91 80000 00000",
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+91 80000 00000",
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY || "CareMitra Health Private Limited (placeholder)",
  registeredAddress:
    process.env.NEXT_PUBLIC_REGISTERED_ADDRESS || "Registered office address to be added, Bengaluru, Karnataka, India",
  gstin: process.env.NEXT_PUBLIC_GSTIN || "29ABCDE1234F1Z5 (placeholder)",
  grievanceOfficer: {
    name: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME || "Grievance Officer (name to be appointed)",
    email: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || "grievance@caremitra.example",
    phone: process.env.NEXT_PUBLIC_GRIEVANCE_PHONE || "+91 80000 00001",
    hours: "Monday to Saturday, 9 am to 6 pm IST",
  },
  // Published response times for complaints (shown on the grievance page).
  grievanceSla: { acknowledgeHours: 24, resolveDays: 15 },
} as const;
