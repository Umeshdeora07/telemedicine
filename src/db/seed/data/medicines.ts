/**
 * Demo medicine catalogue with India Telemedicine Practice Guidelines (2020)
 * list categories:
 *   O          — safe to prescribe in any mode of teleconsultation
 *   A          — first consult only by video; may be re-prescribed for refill in follow-up
 *   B          — only in a follow-up consult, as add-on for a condition already diagnosed
 *   prohibited — never by teleconsultation (Schedule X; NDPS narcotic/psychotropic)
 *
 * IMPORTANT: this list is illustrative. Before launch, a clinical pharmacist
 * must check every entry against the official TPG annexures, CDSCO schedules
 * and current notifications. Admins can edit categories.
 */
type M = [genericName: string, form: string, strengths: string[], drugClass: string, list: "O" | "A" | "B" | "prohibited", schedule: string, brands?: string[]];

export const MEDICINES: M[] = [
  // ----------------------------------------------------------------- List O
  ["Paracetamol", "tablet", ["500 mg", "650 mg"], "analgesic_antipyretic", "O", "OTC", ["Crocin", "Dolo"]],
  ["Paracetamol", "syrup", ["120 mg/5 ml", "250 mg/5 ml"], "analgesic_antipyretic", "O", "OTC", ["Calpol"]],
  ["Oral rehydration salts (ORS)", "sachet", ["WHO formula"], "rehydration", "O", "OTC", ["Electral"]],
  ["Zinc sulphate", "dispersible tablet", ["10 mg", "20 mg"], "mineral", "O", "OTC"],
  ["Cetirizine", "tablet", ["10 mg"], "antihistamine", "O", "OTC", ["Cetzine"]],
  ["Antacid (aluminium hydroxide + magnesium hydroxide)", "suspension", ["10 ml"], "antacid", "O", "OTC", ["Digene", "Gelusil"]],
  ["Cholecalciferol (vitamin D3)", "sachet", ["60,000 IU"], "vitamin", "O", "OTC"],
  ["Calcium carbonate + vitamin D3", "tablet", ["500 mg + 250 IU"], "mineral", "O", "OTC", ["Shelcal"]],
  ["Ferrous ascorbate + folic acid", "tablet", ["100 mg + 1.5 mg"], "haematinic", "O", "OTC"],
  ["Folic acid", "tablet", ["5 mg"], "vitamin", "O", "OTC"],
  ["Multivitamin", "tablet", ["1 tablet"], "vitamin", "O", "OTC"],
  ["Saline nasal drops", "nasal drops", ["0.65%"], "nasal_saline", "O", "OTC"],
  ["Xylometazoline", "nasal spray", ["0.05%", "0.1%"], "decongestant", "O", "OTC", ["Otrivin"]],
  ["Carboxymethylcellulose", "eye drops", ["0.5%"], "lubricant_eye", "O", "OTC", ["Refresh Tears"]],
  ["Simethicone", "drops", ["40 mg/ml"], "antiflatulent", "O", "OTC"],
  ["Ispaghula husk", "powder", ["3.5 g"], "laxative_bulk", "O", "OTC", ["Isabgol"]],
  ["Calamine lotion", "lotion", ["8%"], "topical_soothing", "O", "OTC"],
  ["Povidone-iodine", "ointment", ["5%"], "antiseptic", "O", "OTC", ["Betadine"]],
  ["Clotrimazole dusting powder", "powder", ["1%"], "antifungal_azole", "O", "OTC"],
  ["Menthol and eucalyptus lozenges", "lozenge", ["1 lozenge"], "lozenge", "O", "OTC"],
  ["Myo-inositol", "sachet", ["2 g"], "supplement", "O", "OTC"],

  // ----------------------------------------------------------------- List A
  ["Amoxicillin", "capsule", ["250 mg", "500 mg"], "penicillin", "A", "H", ["Mox"]],
  ["Amoxicillin + clavulanic acid", "tablet", ["625 mg"], "penicillin", "A", "H", ["Augmentin"]],
  ["Azithromycin", "tablet", ["250 mg", "500 mg"], "macrolide", "A", "H", ["Azithral"]],
  ["Cefixime", "tablet", ["200 mg"], "cephalosporin", "A", "H", ["Taxim-O"]],
  ["Doxycycline", "capsule", ["100 mg"], "tetracycline", "A", "H"],
  ["Nitrofurantoin", "capsule", ["100 mg"], "nitrofuran", "A", "H"],
  ["Metronidazole", "tablet", ["400 mg"], "nitroimidazole", "A", "H", ["Flagyl"]],
  ["Fluconazole", "tablet", ["150 mg"], "antifungal_azole", "A", "H"],
  ["Clotrimazole", "cream", ["1%"], "antifungal_azole", "A", "H"],
  ["Clotrimazole vaginal pessary", "pessary", ["100 mg", "500 mg"], "antifungal_azole", "A", "H"],
  ["Terbinafine", "cream", ["1%"], "antifungal_allylamine", "A", "H"],
  ["Ketoconazole", "shampoo", ["2%"], "antifungal_azole", "A", "H"],
  ["Mupirocin", "ointment", ["2%"], "topical_antibiotic", "A", "H", ["T-Bact"]],
  ["Fusidic acid", "cream", ["2%"], "topical_antibiotic", "A", "H"],
  ["Adapalene", "gel", ["0.1%"], "retinoid_topical", "A", "H"],
  ["Benzoyl peroxide", "gel", ["2.5%", "5%"], "topical_acne", "A", "H"],
  ["Clindamycin", "gel", ["1%"], "topical_antibiotic", "A", "H"],
  ["Hydrocortisone", "cream", ["1%"], "corticosteroid_topical", "A", "H"],
  ["Permethrin", "cream", ["5%"], "scabicide", "A", "H"],
  ["Moxifloxacin", "eye drops", ["0.5%"], "fluoroquinolone", "A", "H"],
  ["Ondansetron", "tablet", ["4 mg"], "antiemetic", "A", "H"],
  ["Domperidone", "tablet", ["10 mg"], "antiemetic", "A", "H"],
  ["Pantoprazole", "tablet", ["40 mg"], "ppi", "A", "H", ["Pan"]],
  ["Omeprazole", "capsule", ["20 mg"], "ppi", "A", "H"],
  ["Famotidine", "tablet", ["20 mg", "40 mg"], "h2_blocker", "A", "H"],
  ["Levocetirizine", "tablet", ["5 mg"], "antihistamine", "A", "H"],
  ["Fexofenadine", "tablet", ["120 mg", "180 mg"], "antihistamine", "A", "H", ["Allegra"]],
  ["Montelukast", "tablet", ["10 mg"], "leukotriene_antagonist", "A", "H"],
  ["Ibuprofen", "tablet", ["200 mg", "400 mg"], "nsaid", "A", "H", ["Brufen"]],
  ["Mefenamic acid", "tablet", ["250 mg", "500 mg"], "nsaid", "A", "H", ["Meftal"]],
  ["Diclofenac", "gel", ["1%"], "nsaid", "A", "H", ["Voveran gel"]],
  ["Dicyclomine", "tablet", ["10 mg", "20 mg"], "antispasmodic", "A", "H"],
  ["Loperamide", "capsule", ["2 mg"], "antidiarrhoeal", "A", "H"],
  ["Tranexamic acid", "tablet", ["500 mg"], "antifibrinolytic", "A", "H"],
  ["Lactulose", "solution", ["10 g/15 ml"], "laxative_osmotic", "A", "H"],
  ["Minoxidil", "topical solution", ["2%", "5%"], "hair_growth_topical", "A", "H"],

  // ----------------------------------------------------------------- List B
  ["Metformin", "tablet", ["500 mg", "1000 mg"], "biguanide", "B", "H", ["Glycomet"]],
  ["Metformin extended release", "tablet", ["500 mg", "1000 mg"], "biguanide", "B", "H"],
  ["Glimepiride", "tablet", ["1 mg", "2 mg"], "sulfonylurea", "B", "H"],
  ["Sitagliptin", "tablet", ["50 mg", "100 mg"], "dpp4_inhibitor", "B", "H"],
  ["Insulin glargine", "injection", ["100 IU/ml"], "insulin", "B", "H"],
  ["Amlodipine", "tablet", ["2.5 mg", "5 mg", "10 mg"], "calcium_channel_blocker", "B", "H"],
  ["Telmisartan", "tablet", ["20 mg", "40 mg", "80 mg"], "arb", "B", "H", ["Telma"]],
  ["Losartan", "tablet", ["25 mg", "50 mg"], "arb", "B", "H"],
  ["Metoprolol succinate", "tablet", ["25 mg", "50 mg"], "beta_blocker", "B", "H"],
  ["Atorvastatin", "tablet", ["10 mg", "20 mg", "40 mg"], "statin", "B", "H"],
  ["Rosuvastatin", "tablet", ["5 mg", "10 mg", "20 mg"], "statin", "B", "H"],
  ["Aspirin (low dose)", "tablet", ["75 mg"], "antiplatelet", "B", "H", ["Ecosprin"]],
  ["Clopidogrel", "tablet", ["75 mg"], "antiplatelet", "B", "H"],
  ["Levothyroxine", "tablet", ["25 mcg", "50 mcg", "75 mcg", "100 mcg"], "thyroid_hormone", "B", "H", ["Thyronorm", "Eltroxin"]],
  ["Carbimazole", "tablet", ["5 mg", "10 mg"], "antithyroid", "B", "H"],
  ["Salbutamol", "inhaler", ["100 mcg/puff"], "beta2_agonist", "B", "H", ["Asthalin"]],
  ["Budesonide + formoterol", "inhaler", ["200/6 mcg"], "ics_laba", "B", "H"],
  ["Sertraline", "tablet", ["25 mg", "50 mg"], "ssri", "B", "H"],
  ["Escitalopram", "tablet", ["5 mg", "10 mg"], "ssri", "B", "H"],
  ["Fluoxetine", "capsule", ["20 mg"], "ssri", "B", "H"],
  ["Propranolol", "tablet", ["10 mg", "20 mg", "40 mg"], "beta_blocker", "B", "H"],
  ["Prednisolone", "tablet", ["5 mg", "10 mg"], "corticosteroid_oral", "B", "H"],
  ["Isotretinoin", "capsule", ["10 mg", "20 mg"], "retinoid_oral", "B", "H"],
  ["Progesterone (micronised)", "capsule", ["200 mg"], "progestogen", "B", "H"],

  // ----------------------------------------------------------- Prohibited
  ["Alprazolam", "tablet", ["0.25 mg", "0.5 mg"], "benzodiazepine", "prohibited", "NDPS (psychotropic)"],
  ["Clonazepam", "tablet", ["0.5 mg"], "benzodiazepine", "prohibited", "NDPS (psychotropic)"],
  ["Diazepam", "tablet", ["5 mg"], "benzodiazepine", "prohibited", "NDPS (psychotropic)"],
  ["Lorazepam", "tablet", ["1 mg", "2 mg"], "benzodiazepine", "prohibited", "NDPS (psychotropic)"],
  ["Zolpidem", "tablet", ["5 mg", "10 mg"], "sedative_hypnotic", "prohibited", "NDPS (psychotropic)"],
  ["Tramadol", "tablet", ["50 mg"], "opioid", "prohibited", "NDPS (psychotropic)"],
  ["Codeine phosphate (cough syrup)", "syrup", ["10 mg/5 ml"], "opioid", "prohibited", "NDPS (narcotic)"],
  ["Morphine", "tablet", ["10 mg"], "opioid", "prohibited", "NDPS (narcotic)"],
  ["Buprenorphine", "tablet", ["0.4 mg"], "opioid", "prohibited", "NDPS (psychotropic)"],
  ["Methylphenidate", "tablet", ["10 mg"], "stimulant", "prohibited", "Schedule X"],
  ["Phenobarbital", "tablet", ["30 mg", "60 mg"], "barbiturate", "prohibited", "NDPS (psychotropic)"],
];
