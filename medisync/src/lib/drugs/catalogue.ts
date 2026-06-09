export interface DrugEntry {
  name: string
  category: string
  defaultStrength?: string
  defaultForm?: 'Tablet' | 'Capsule' | 'Liquid' | 'Injection'
}

export const DRUG_CATALOGUE: DrugEntry[] = [
  // ── Cardiovascular — ACE Inhibitors ──────────────────────────────────────
  { name: 'Lisinopril',       category: 'ACE Inhibitor',       defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Enalapril',        category: 'ACE Inhibitor',       defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Ramipril',         category: 'ACE Inhibitor',       defaultStrength: '5mg',    defaultForm: 'Capsule' },
  { name: 'Perindopril',      category: 'ACE Inhibitor',       defaultStrength: '4mg',    defaultForm: 'Tablet' },
  { name: 'Quinapril',        category: 'ACE Inhibitor',       defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Fosinopril',       category: 'ACE Inhibitor',       defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Captopril',        category: 'ACE Inhibitor',       defaultStrength: '25mg',   defaultForm: 'Tablet' },
  { name: 'Benazepril',       category: 'ACE Inhibitor',       defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Trandolapril',     category: 'ACE Inhibitor',       defaultStrength: '2mg',    defaultForm: 'Tablet' },

  // ── Cardiovascular — ARBs ─────────────────────────────────────────────────
  { name: 'Losartan',         category: 'ARB',                 defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Valsartan',        category: 'ARB',                 defaultStrength: '80mg',   defaultForm: 'Tablet' },
  { name: 'Irbesartan',       category: 'ARB',                 defaultStrength: '150mg',  defaultForm: 'Tablet' },
  { name: 'Candesartan',      category: 'ARB',                 defaultStrength: '8mg',    defaultForm: 'Tablet' },
  { name: 'Olmesartan',       category: 'ARB',                 defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Telmisartan',      category: 'ARB',                 defaultStrength: '40mg',   defaultForm: 'Tablet' },
  { name: 'Azilsartan',       category: 'ARB',                 defaultStrength: '40mg',   defaultForm: 'Tablet' },

  // ── Cardiovascular — Beta Blockers ────────────────────────────────────────
  { name: 'Metoprolol',       category: 'Beta Blocker',        defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Atenolol',         category: 'Beta Blocker',        defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Bisoprolol',       category: 'Beta Blocker',        defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Carvedilol',       category: 'Beta Blocker',        defaultStrength: '12.5mg', defaultForm: 'Tablet' },
  { name: 'Propranolol',      category: 'Beta Blocker',        defaultStrength: '40mg',   defaultForm: 'Tablet' },
  { name: 'Nebivolol',        category: 'Beta Blocker',        defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Labetalol',        category: 'Beta Blocker',        defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Acebutolol',       category: 'Beta Blocker',        defaultStrength: '400mg',  defaultForm: 'Capsule' },
  { name: 'Nadolol',          category: 'Beta Blocker',        defaultStrength: '40mg',   defaultForm: 'Tablet' },

  // ── Cardiovascular — Calcium Channel Blockers ─────────────────────────────
  { name: 'Amlodipine',       category: 'Calcium Channel Blocker', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Nifedipine',       category: 'Calcium Channel Blocker', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Diltiazem',        category: 'Calcium Channel Blocker', defaultStrength: '60mg', defaultForm: 'Tablet' },
  { name: 'Verapamil',        category: 'Calcium Channel Blocker', defaultStrength: '80mg', defaultForm: 'Tablet' },
  { name: 'Felodipine',       category: 'Calcium Channel Blocker', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Nicardipine',      category: 'Calcium Channel Blocker', defaultStrength: '20mg', defaultForm: 'Capsule' },
  { name: 'Lercanidipine',    category: 'Calcium Channel Blocker', defaultStrength: '10mg', defaultForm: 'Tablet' },

  // ── Cardiovascular — Statins ──────────────────────────────────────────────
  { name: 'Atorvastatin',     category: 'Statin',              defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Rosuvastatin',     category: 'Statin',              defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Simvastatin',      category: 'Statin',              defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Pravastatin',      category: 'Statin',              defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Fluvastatin',      category: 'Statin',              defaultStrength: '20mg',   defaultForm: 'Capsule' },
  { name: 'Pitavastatin',     category: 'Statin',              defaultStrength: '2mg',    defaultForm: 'Tablet' },
  { name: 'Lovastatin',       category: 'Statin',              defaultStrength: '20mg',   defaultForm: 'Tablet' },

  // ── Cardiovascular — Diuretics ────────────────────────────────────────────
  { name: 'Furosemide',       category: 'Loop Diuretic',       defaultStrength: '40mg',   defaultForm: 'Tablet' },
  { name: 'Bumetanide',       category: 'Loop Diuretic',       defaultStrength: '1mg',    defaultForm: 'Tablet' },
  { name: 'Torsemide',        category: 'Loop Diuretic',       defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Hydrochlorothiazide', category: 'Thiazide Diuretic', defaultStrength: '25mg',  defaultForm: 'Tablet' },
  { name: 'Chlorthalidone',   category: 'Thiazide Diuretic',   defaultStrength: '25mg',   defaultForm: 'Tablet' },
  { name: 'Indapamide',       category: 'Thiazide Diuretic',   defaultStrength: '2.5mg',  defaultForm: 'Tablet' },
  { name: 'Spironolactone',   category: 'Potassium-sparing Diuretic', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Eplerenone',       category: 'Potassium-sparing Diuretic', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Amiloride',        category: 'Potassium-sparing Diuretic', defaultStrength: '5mg',  defaultForm: 'Tablet' },

  // ── Cardiovascular — Anticoagulants / Antiplatelets ───────────────────────
  { name: 'Warfarin',         category: 'Anticoagulant',       defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Apixaban',         category: 'Anticoagulant (DOAC)', defaultStrength: '5mg',   defaultForm: 'Tablet' },
  { name: 'Rivaroxaban',      category: 'Anticoagulant (DOAC)', defaultStrength: '20mg',  defaultForm: 'Tablet' },
  { name: 'Dabigatran',       category: 'Anticoagulant (DOAC)', defaultStrength: '150mg', defaultForm: 'Capsule' },
  { name: 'Edoxaban',         category: 'Anticoagulant (DOAC)', defaultStrength: '60mg',  defaultForm: 'Tablet' },
  { name: 'Aspirin',          category: 'Antiplatelet',        defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Clopidogrel',      category: 'Antiplatelet',        defaultStrength: '75mg',   defaultForm: 'Tablet' },
  { name: 'Ticagrelor',       category: 'Antiplatelet',        defaultStrength: '90mg',   defaultForm: 'Tablet' },
  { name: 'Prasugrel',        category: 'Antiplatelet',        defaultStrength: '10mg',   defaultForm: 'Tablet' },

  // ── Cardiovascular — Nitrates / Other ─────────────────────────────────────
  { name: 'Isosorbide Mononitrate', category: 'Nitrate',       defaultStrength: '30mg',   defaultForm: 'Tablet' },
  { name: 'Isosorbide Dinitrate',   category: 'Nitrate',       defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Glyceryl Trinitrate',    category: 'Nitrate',       defaultStrength: '500mcg', defaultForm: 'Tablet' },
  { name: 'Amiodarone',       category: 'Antiarrhythmic',      defaultStrength: '200mg',  defaultForm: 'Tablet' },
  { name: 'Digoxin',          category: 'Cardiac Glycoside',   defaultStrength: '125mcg', defaultForm: 'Tablet' },
  { name: 'Ivabradine',       category: 'Heart Rate Agent',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Sacubitril/Valsartan', category: 'ARNi',            defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Potassium Chloride', category: 'Electrolyte',       defaultStrength: '600mg',  defaultForm: 'Tablet' },
  { name: 'Ezetimibe',        category: 'Cholesterol Absorption Inhibitor', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Fenofibrate',      category: 'Fibrate',             defaultStrength: '145mg',  defaultForm: 'Tablet' },

  // ── Diabetes ──────────────────────────────────────────────────────────────
  { name: 'Metformin',        category: 'Biguanide',           defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Glipizide',        category: 'Sulfonylurea',        defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Glibenclamide',    category: 'Sulfonylurea',        defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Gliclazide',       category: 'Sulfonylurea',        defaultStrength: '80mg',   defaultForm: 'Tablet' },
  { name: 'Glimepiride',      category: 'Sulfonylurea',        defaultStrength: '2mg',    defaultForm: 'Tablet' },
  { name: 'Sitagliptin',      category: 'DPP-4 Inhibitor',    defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Saxagliptin',      category: 'DPP-4 Inhibitor',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Linagliptin',      category: 'DPP-4 Inhibitor',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Alogliptin',       category: 'DPP-4 Inhibitor',    defaultStrength: '25mg',   defaultForm: 'Tablet' },
  { name: 'Empagliflozin',    category: 'SGLT2 Inhibitor',    defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Dapagliflozin',    category: 'SGLT2 Inhibitor',    defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Canagliflozin',    category: 'SGLT2 Inhibitor',    defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Ertugliflozin',    category: 'SGLT2 Inhibitor',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Semaglutide',      category: 'GLP-1 Agonist',      defaultStrength: '0.5mg',  defaultForm: 'Injection' },
  { name: 'Liraglutide',      category: 'GLP-1 Agonist',      defaultStrength: '1.2mg',  defaultForm: 'Injection' },
  { name: 'Dulaglutide',      category: 'GLP-1 Agonist',      defaultStrength: '0.75mg', defaultForm: 'Injection' },
  { name: 'Exenatide',        category: 'GLP-1 Agonist',      defaultStrength: '5mcg',   defaultForm: 'Injection' },
  { name: 'Pioglitazone',     category: 'Thiazolidinedione',  defaultStrength: '15mg',   defaultForm: 'Tablet' },
  { name: 'Acarbose',         category: 'Alpha-Glucosidase Inhibitor', defaultStrength: '50mg', defaultForm: 'Tablet' },
  { name: 'Insulin Glargine', category: 'Insulin (Long-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },
  { name: 'Insulin Detemir',  category: 'Insulin (Long-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },
  { name: 'Insulin Degludec', category: 'Insulin (Long-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },
  { name: 'Insulin Lispro',   category: 'Insulin (Rapid-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },
  { name: 'Insulin Aspart',   category: 'Insulin (Rapid-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },
  { name: 'Insulin Glulisine', category: 'Insulin (Rapid-acting)', defaultStrength: '100 U/mL', defaultForm: 'Injection' },

  // ── CNS — Antidepressants ─────────────────────────────────────────────────
  { name: 'Sertraline',       category: 'SSRI',                defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Escitalopram',     category: 'SSRI',                defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Fluoxetine',       category: 'SSRI',                defaultStrength: '20mg',   defaultForm: 'Capsule' },
  { name: 'Paroxetine',       category: 'SSRI',                defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Citalopram',       category: 'SSRI',                defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Fluvoxamine',      category: 'SSRI',                defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Venlafaxine',      category: 'SNRI',                defaultStrength: '75mg',   defaultForm: 'Capsule' },
  { name: 'Duloxetine',       category: 'SNRI',                defaultStrength: '30mg',   defaultForm: 'Capsule' },
  { name: 'Desvenlafaxine',   category: 'SNRI',                defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Mirtazapine',      category: 'NaSSA',               defaultStrength: '15mg',   defaultForm: 'Tablet' },
  { name: 'Bupropion',        category: 'NDRI',                defaultStrength: '150mg',  defaultForm: 'Tablet' },
  { name: 'Amitriptyline',    category: 'Tricyclic Antidepressant', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Nortriptyline',    category: 'Tricyclic Antidepressant', defaultStrength: '25mg', defaultForm: 'Capsule' },
  { name: 'Clomipramine',     category: 'Tricyclic Antidepressant', defaultStrength: '25mg', defaultForm: 'Capsule' },
  { name: 'Imipramine',       category: 'Tricyclic Antidepressant', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Trazodone',        category: 'Antidepressant',      defaultStrength: '50mg',   defaultForm: 'Tablet' },

  // ── CNS — Anxiolytics / Hypnotics ─────────────────────────────────────────
  { name: 'Diazepam',         category: 'Benzodiazepine',      defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Lorazepam',        category: 'Benzodiazepine',      defaultStrength: '1mg',    defaultForm: 'Tablet' },
  { name: 'Clonazepam',       category: 'Benzodiazepine',      defaultStrength: '0.5mg',  defaultForm: 'Tablet' },
  { name: 'Alprazolam',       category: 'Benzodiazepine',      defaultStrength: '0.25mg', defaultForm: 'Tablet' },
  { name: 'Temazepam',        category: 'Benzodiazepine (Hypnotic)', defaultStrength: '10mg', defaultForm: 'Capsule' },
  { name: 'Zolpidem',         category: 'Z-Drug Hypnotic',     defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Zopiclone',        category: 'Z-Drug Hypnotic',     defaultStrength: '7.5mg',  defaultForm: 'Tablet' },
  { name: 'Buspirone',        category: 'Anxiolytic',          defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Hydroxyzine',      category: 'Antihistamine / Anxiolytic', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Melatonin',        category: 'Sleep Aid',           defaultStrength: '3mg',    defaultForm: 'Tablet' },

  // ── CNS — Antipsychotics ──────────────────────────────────────────────────
  { name: 'Quetiapine',       category: 'Atypical Antipsychotic', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Olanzapine',       category: 'Atypical Antipsychotic', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Risperidone',      category: 'Atypical Antipsychotic', defaultStrength: '1mg',  defaultForm: 'Tablet' },
  { name: 'Aripiprazole',     category: 'Atypical Antipsychotic', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Clozapine',        category: 'Atypical Antipsychotic', defaultStrength: '25mg', defaultForm: 'Tablet' },
  { name: 'Ziprasidone',      category: 'Atypical Antipsychotic', defaultStrength: '20mg', defaultForm: 'Capsule' },
  { name: 'Haloperidol',      category: 'Typical Antipsychotic',  defaultStrength: '2mg',  defaultForm: 'Tablet' },

  // ── CNS — Anticonvulsants ─────────────────────────────────────────────────
  { name: 'Levetiracetam',    category: 'Anticonvulsant',      defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Lamotrigine',      category: 'Anticonvulsant',      defaultStrength: '25mg',   defaultForm: 'Tablet' },
  { name: 'Valproic Acid',    category: 'Anticonvulsant',      defaultStrength: '250mg',  defaultForm: 'Capsule' },
  { name: 'Carbamazepine',    category: 'Anticonvulsant',      defaultStrength: '200mg',  defaultForm: 'Tablet' },
  { name: 'Phenytoin',        category: 'Anticonvulsant',      defaultStrength: '100mg',  defaultForm: 'Capsule' },
  { name: 'Gabapentin',       category: 'Anticonvulsant / Neuropathic Pain', defaultStrength: '300mg', defaultForm: 'Capsule' },
  { name: 'Pregabalin',       category: 'Anticonvulsant / Neuropathic Pain', defaultStrength: '75mg',  defaultForm: 'Capsule' },
  { name: 'Topiramate',       category: 'Anticonvulsant',      defaultStrength: '25mg',   defaultForm: 'Tablet' },
  { name: 'Oxcarbazepine',    category: 'Anticonvulsant',      defaultStrength: '300mg',  defaultForm: 'Tablet' },
  { name: 'Zonisamide',       category: 'Anticonvulsant',      defaultStrength: '100mg',  defaultForm: 'Capsule' },
  { name: 'Lacosamide',       category: 'Anticonvulsant',      defaultStrength: '50mg',   defaultForm: 'Tablet' },

  // ── CNS — Pain / Opioids ─────────────────────────────────────────────────
  { name: 'Tramadol',         category: 'Opioid Analgesic',    defaultStrength: '50mg',   defaultForm: 'Capsule' },
  { name: 'Codeine',          category: 'Opioid Analgesic',    defaultStrength: '30mg',   defaultForm: 'Tablet' },
  { name: 'Morphine',         category: 'Opioid Analgesic',    defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Oxycodone',        category: 'Opioid Analgesic',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Hydrocodone',      category: 'Opioid Analgesic',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Fentanyl',         category: 'Opioid Analgesic',    defaultStrength: '25mcg/h', defaultForm: 'Injection' },
  { name: 'Buprenorphine',    category: 'Opioid Partial Agonist', defaultStrength: '8mg', defaultForm: 'Tablet' },
  { name: 'Naloxone',         category: 'Opioid Antagonist',   defaultStrength: '0.4mg',  defaultForm: 'Injection' },
  { name: 'Paracetamol',      category: 'Analgesic / Antipyretic', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Ibuprofen',        category: 'NSAID',               defaultStrength: '400mg',  defaultForm: 'Tablet' },
  { name: 'Naproxen',         category: 'NSAID',               defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Diclofenac',       category: 'NSAID',               defaultStrength: '50mg',   defaultForm: 'Tablet' },
  { name: 'Celecoxib',        category: 'COX-2 Inhibitor',     defaultStrength: '200mg',  defaultForm: 'Capsule' },
  { name: 'Etoricoxib',       category: 'COX-2 Inhibitor',     defaultStrength: '60mg',   defaultForm: 'Tablet' },
  { name: 'Ketorolac',        category: 'NSAID',               defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Pregabalin',       category: 'Neuropathic Pain',    defaultStrength: '75mg',   defaultForm: 'Capsule' },
  { name: 'Duloxetine',       category: 'Neuropathic Pain / SNRI', defaultStrength: '60mg', defaultForm: 'Capsule' },

  // ── CNS — Parkinson's / Dementia ──────────────────────────────────────────
  { name: 'Levodopa/Carbidopa', category: "Parkinson's",       defaultStrength: '100/25mg', defaultForm: 'Tablet' },
  { name: 'Pramipexole',      category: "Parkinson's",         defaultStrength: '0.25mg', defaultForm: 'Tablet' },
  { name: 'Ropinirole',       category: "Parkinson's",         defaultStrength: '0.25mg', defaultForm: 'Tablet' },
  { name: 'Donepezil',        category: 'Dementia / AChEI',    defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Rivastigmine',     category: 'Dementia / AChEI',    defaultStrength: '1.5mg',  defaultForm: 'Capsule' },
  { name: 'Galantamine',      category: 'Dementia / AChEI',    defaultStrength: '8mg',    defaultForm: 'Tablet' },
  { name: 'Memantine',        category: 'Dementia / NMDA Antagonist', defaultStrength: '10mg', defaultForm: 'Tablet' },

  // ── CNS — ADHD ────────────────────────────────────────────────────────────
  { name: 'Methylphenidate',  category: 'ADHD Stimulant',      defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Amphetamine/Dextroamphetamine', category: 'ADHD Stimulant', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Atomoxetine',      category: 'ADHD Non-stimulant',  defaultStrength: '18mg',   defaultForm: 'Capsule' },
  { name: 'Lisdexamfetamine', category: 'ADHD Stimulant',      defaultStrength: '20mg',   defaultForm: 'Capsule' },

  // ── Respiratory ───────────────────────────────────────────────────────────
  { name: 'Salbutamol',       category: 'SABA Bronchodilator', defaultStrength: '100mcg', defaultForm: 'Injection' },
  { name: 'Albuterol',        category: 'SABA Bronchodilator', defaultStrength: '2mg',    defaultForm: 'Tablet' },
  { name: 'Salmeterol',       category: 'LABA Bronchodilator', defaultStrength: '50mcg',  defaultForm: 'Injection' },
  { name: 'Formoterol',       category: 'LABA Bronchodilator', defaultStrength: '12mcg',  defaultForm: 'Capsule' },
  { name: 'Tiotropium',       category: 'LAMA Bronchodilator', defaultStrength: '18mcg',  defaultForm: 'Capsule' },
  { name: 'Umeclidinium',     category: 'LAMA Bronchodilator', defaultStrength: '62.5mcg', defaultForm: 'Injection' },
  { name: 'Ipratropium',      category: 'SAMA Bronchodilator', defaultStrength: '20mcg',  defaultForm: 'Injection' },
  { name: 'Fluticasone',      category: 'Inhaled Corticosteroid', defaultStrength: '100mcg', defaultForm: 'Injection' },
  { name: 'Budesonide',       category: 'Inhaled Corticosteroid', defaultStrength: '200mcg', defaultForm: 'Capsule' },
  { name: 'Beclomethasone',   category: 'Inhaled Corticosteroid', defaultStrength: '100mcg', defaultForm: 'Injection' },
  { name: 'Montelukast',      category: 'Leukotriene Antagonist', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Theophylline',     category: 'Methylxanthine',      defaultStrength: '100mg',  defaultForm: 'Tablet' },
  { name: 'Doxofylline',      category: 'Methylxanthine',      defaultStrength: '400mg',  defaultForm: 'Tablet' },

  // ── GI / Gastroenterology ─────────────────────────────────────────────────
  { name: 'Omeprazole',       category: 'Proton Pump Inhibitor', defaultStrength: '20mg', defaultForm: 'Capsule' },
  { name: 'Lansoprazole',     category: 'Proton Pump Inhibitor', defaultStrength: '30mg', defaultForm: 'Capsule' },
  { name: 'Esomeprazole',     category: 'Proton Pump Inhibitor', defaultStrength: '20mg', defaultForm: 'Tablet' },
  { name: 'Pantoprazole',     category: 'Proton Pump Inhibitor', defaultStrength: '40mg', defaultForm: 'Tablet' },
  { name: 'Rabeprazole',      category: 'Proton Pump Inhibitor', defaultStrength: '20mg', defaultForm: 'Tablet' },
  { name: 'Ranitidine',       category: 'H2 Blocker',          defaultStrength: '150mg',  defaultForm: 'Tablet' },
  { name: 'Famotidine',       category: 'H2 Blocker',          defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Ondansetron',      category: 'Antiemetic',          defaultStrength: '4mg',    defaultForm: 'Tablet' },
  { name: 'Metoclopramide',   category: 'Antiemetic / Prokinetic', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Domperidone',      category: 'Prokinetic / Antiemetic', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Prochlorperazine', category: 'Antiemetic',          defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Loperamide',       category: 'Antidiarrhoeal',      defaultStrength: '2mg',    defaultForm: 'Capsule' },
  { name: 'Mesalazine',       category: 'Aminosalicylate (IBD)', defaultStrength: '400mg', defaultForm: 'Tablet' },
  { name: 'Sulfasalazine',    category: 'Aminosalicylate (IBD)', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Azathioprine',     category: 'Immunosuppressant (IBD)', defaultStrength: '50mg', defaultForm: 'Tablet' },
  { name: 'Lactulose',        category: 'Osmotic Laxative',    defaultStrength: '10g/15mL', defaultForm: 'Liquid' },
  { name: 'Polyethylene Glycol', category: 'Osmotic Laxative', defaultStrength: '17g',    defaultForm: 'Liquid' },
  { name: 'Senna',            category: 'Stimulant Laxative',  defaultStrength: '7.5mg',  defaultForm: 'Tablet' },
  { name: 'Bisacodyl',        category: 'Stimulant Laxative',  defaultStrength: '5mg',    defaultForm: 'Tablet' },

  // ── Antibiotics ───────────────────────────────────────────────────────────
  { name: 'Amoxicillin',      category: 'Penicillin Antibiotic', defaultStrength: '500mg', defaultForm: 'Capsule' },
  { name: 'Amoxicillin-Clavulanate', category: 'Penicillin + BLI Antibiotic', defaultStrength: '875mg', defaultForm: 'Tablet' },
  { name: 'Flucloxacillin',   category: 'Penicillinase-resistant Penicillin', defaultStrength: '500mg', defaultForm: 'Capsule' },
  { name: 'Piperacillin-Tazobactam', category: 'Broad-spectrum Penicillin', defaultStrength: '4.5g', defaultForm: 'Injection' },
  { name: 'Cefalexin',        category: 'First-gen Cephalosporin', defaultStrength: '500mg', defaultForm: 'Capsule' },
  { name: 'Cefuroxime',       category: 'Second-gen Cephalosporin', defaultStrength: '250mg', defaultForm: 'Tablet' },
  { name: 'Ceftriaxone',      category: 'Third-gen Cephalosporin', defaultStrength: '1g',  defaultForm: 'Injection' },
  { name: 'Cefixime',         category: 'Third-gen Cephalosporin', defaultStrength: '200mg', defaultForm: 'Tablet' },
  { name: 'Ciprofloxacin',    category: 'Fluoroquinolone Antibiotic', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Levofloxacin',     category: 'Fluoroquinolone Antibiotic', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Moxifloxacin',     category: 'Fluoroquinolone Antibiotic', defaultStrength: '400mg', defaultForm: 'Tablet' },
  { name: 'Azithromycin',     category: 'Macrolide Antibiotic', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Clarithromycin',   category: 'Macrolide Antibiotic', defaultStrength: '250mg', defaultForm: 'Tablet' },
  { name: 'Erythromycin',     category: 'Macrolide Antibiotic', defaultStrength: '250mg', defaultForm: 'Tablet' },
  { name: 'Doxycycline',      category: 'Tetracycline Antibiotic', defaultStrength: '100mg', defaultForm: 'Capsule' },
  { name: 'Tetracycline',     category: 'Tetracycline Antibiotic', defaultStrength: '250mg', defaultForm: 'Capsule' },
  { name: 'Trimethoprim',     category: 'Antibiotic',          defaultStrength: '200mg',  defaultForm: 'Tablet' },
  { name: 'Co-trimoxazole',   category: 'Antibiotic (Sulfonamide)', defaultStrength: '960mg', defaultForm: 'Tablet' },
  { name: 'Metronidazole',    category: 'Antibiotic / Antiprotozoal', defaultStrength: '400mg', defaultForm: 'Tablet' },
  { name: 'Clindamycin',      category: 'Lincosamide Antibiotic', defaultStrength: '150mg', defaultForm: 'Capsule' },
  { name: 'Nitrofurantoin',   category: 'Antibiotic (UTI)',    defaultStrength: '100mg',  defaultForm: 'Capsule' },
  { name: 'Vancomycin',       category: 'Glycopeptide Antibiotic', defaultStrength: '125mg', defaultForm: 'Capsule' },
  { name: 'Linezolid',        category: 'Oxazolidinone Antibiotic', defaultStrength: '600mg', defaultForm: 'Tablet' },
  { name: 'Meropenem',        category: 'Carbapenem Antibiotic', defaultStrength: '500mg', defaultForm: 'Injection' },

  // ── Antifungals ───────────────────────────────────────────────────────────
  { name: 'Fluconazole',      category: 'Triazole Antifungal', defaultStrength: '150mg',  defaultForm: 'Capsule' },
  { name: 'Itraconazole',     category: 'Triazole Antifungal', defaultStrength: '100mg',  defaultForm: 'Capsule' },
  { name: 'Voriconazole',     category: 'Triazole Antifungal', defaultStrength: '200mg',  defaultForm: 'Tablet' },
  { name: 'Terbinafine',      category: 'Allylamine Antifungal', defaultStrength: '250mg', defaultForm: 'Tablet' },

  // ── Antivirals ────────────────────────────────────────────────────────────
  { name: 'Aciclovir',        category: 'Antiviral (Herpes)',  defaultStrength: '400mg',  defaultForm: 'Tablet' },
  { name: 'Valaciclovir',     category: 'Antiviral (Herpes)',  defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Oseltamivir',      category: 'Antiviral (Influenza)', defaultStrength: '75mg', defaultForm: 'Capsule' },

  // ── Endocrine / Thyroid ───────────────────────────────────────────────────
  { name: 'Levothyroxine',    category: 'Thyroid Hormone',     defaultStrength: '50mcg',  defaultForm: 'Tablet' },
  { name: 'Liothyronine',     category: 'Thyroid Hormone (T3)', defaultStrength: '20mcg', defaultForm: 'Tablet' },
  { name: 'Carbimazole',      category: 'Antithyroid',         defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Propylthiouracil', category: 'Antithyroid',         defaultStrength: '50mg',   defaultForm: 'Tablet' },

  // ── Endocrine — Corticosteroids ───────────────────────────────────────────
  { name: 'Prednisolone',     category: 'Corticosteroid',      defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Prednisone',       category: 'Corticosteroid',      defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Dexamethasone',    category: 'Corticosteroid',      defaultStrength: '0.5mg',  defaultForm: 'Tablet' },
  { name: 'Hydrocortisone',   category: 'Corticosteroid',      defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Methylprednisolone', category: 'Corticosteroid',    defaultStrength: '4mg',    defaultForm: 'Tablet' },

  // ── Endocrine — Hormones ──────────────────────────────────────────────────
  { name: 'Testosterone',     category: 'Androgen',            defaultStrength: '250mg/mL', defaultForm: 'Injection' },
  { name: 'Estradiol',        category: 'Oestrogen',           defaultStrength: '2mg',    defaultForm: 'Tablet' },
  { name: 'Progesterone',     category: 'Progestogen',         defaultStrength: '100mg',  defaultForm: 'Capsule' },
  { name: 'Norethisterone',   category: 'Progestogen',         defaultStrength: '5mg',    defaultForm: 'Tablet' },

  // ── Musculoskeletal ───────────────────────────────────────────────────────
  { name: 'Allopurinol',      category: 'Xanthine Oxidase Inhibitor (Gout)', defaultStrength: '100mg', defaultForm: 'Tablet' },
  { name: 'Febuxostat',       category: 'Xanthine Oxidase Inhibitor (Gout)', defaultStrength: '80mg',  defaultForm: 'Tablet' },
  { name: 'Colchicine',       category: 'Antigout',            defaultStrength: '500mcg', defaultForm: 'Tablet' },
  { name: 'Methotrexate',     category: 'DMARD (RA)',          defaultStrength: '2.5mg',  defaultForm: 'Tablet' },
  { name: 'Leflunomide',      category: 'DMARD (RA)',          defaultStrength: '20mg',   defaultForm: 'Tablet' },
  { name: 'Hydroxychloroquine', category: 'DMARD (RA / Lupus)', defaultStrength: '200mg', defaultForm: 'Tablet' },
  { name: 'Sulfasalazine',    category: 'DMARD (RA / IBD)',    defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Alendronic Acid',  category: 'Bisphosphonate (Osteoporosis)', defaultStrength: '70mg', defaultForm: 'Tablet' },
  { name: 'Risedronate',      category: 'Bisphosphonate (Osteoporosis)', defaultStrength: '35mg', defaultForm: 'Tablet' },
  { name: 'Zoledronic Acid',  category: 'Bisphosphonate (Osteoporosis)', defaultStrength: '5mg',  defaultForm: 'Injection' },
  { name: 'Denosumab',        category: 'RANKL Inhibitor (Osteoporosis)', defaultStrength: '60mg', defaultForm: 'Injection' },
  { name: 'Baclofen',         category: 'Muscle Relaxant',     defaultStrength: '10mg',   defaultForm: 'Tablet' },
  { name: 'Tizanidine',       category: 'Muscle Relaxant',     defaultStrength: '4mg',    defaultForm: 'Tablet' },
  { name: 'Cyclobenzaprine',  category: 'Muscle Relaxant',     defaultStrength: '5mg',    defaultForm: 'Tablet' },
  { name: 'Carisoprodol',     category: 'Muscle Relaxant',     defaultStrength: '250mg',  defaultForm: 'Tablet' },

  // ── Renal ─────────────────────────────────────────────────────────────────
  { name: 'Sodium Bicarbonate', category: 'Alkalinising Agent (CKD)', defaultStrength: '500mg', defaultForm: 'Tablet' },
  { name: 'Sevelamer',        category: 'Phosphate Binder (CKD)', defaultStrength: '800mg', defaultForm: 'Tablet' },
  { name: 'Cinacalcet',       category: 'Calcimimetic (CKD)',  defaultStrength: '30mg',   defaultForm: 'Tablet' },
  { name: 'Erythropoietin',   category: 'ESA (CKD Anaemia)',   defaultStrength: '2000 IU', defaultForm: 'Injection' },
  { name: 'Folic Acid',       category: 'Vitamin B9',          defaultStrength: '5mg',    defaultForm: 'Tablet' },

  // ── Antihistamines ────────────────────────────────────────────────────────
  { name: 'Cetirizine',       category: 'Antihistamine (2nd gen)', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Loratadine',       category: 'Antihistamine (2nd gen)', defaultStrength: '10mg', defaultForm: 'Tablet' },
  { name: 'Fexofenadine',     category: 'Antihistamine (2nd gen)', defaultStrength: '120mg', defaultForm: 'Tablet' },
  { name: 'Desloratadine',    category: 'Antihistamine (2nd gen)', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Levocetirizine',   category: 'Antihistamine (2nd gen)', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Chlorphenamine',   category: 'Antihistamine (1st gen)', defaultStrength: '4mg',  defaultForm: 'Tablet' },
  { name: 'Promethazine',     category: 'Antihistamine (1st gen)', defaultStrength: '25mg', defaultForm: 'Tablet' },

  // ── Oncology (supportive / commonly seen) ────────────────────────────────
  { name: 'Tamoxifen',        category: 'SERM (Breast Cancer)', defaultStrength: '20mg',  defaultForm: 'Tablet' },
  { name: 'Letrozole',        category: 'Aromatase Inhibitor', defaultStrength: '2.5mg',  defaultForm: 'Tablet' },
  { name: 'Anastrozole',      category: 'Aromatase Inhibitor', defaultStrength: '1mg',    defaultForm: 'Tablet' },
  { name: 'Exemestane',       category: 'Aromatase Inhibitor', defaultStrength: '25mg',   defaultForm: 'Tablet' },

  // ── Vitamins / Supplements ────────────────────────────────────────────────
  { name: 'Vitamin D3',       category: 'Vitamin',             defaultStrength: '1000 IU', defaultForm: 'Tablet' },
  { name: 'Calcium Carbonate', category: 'Mineral Supplement', defaultStrength: '500mg',  defaultForm: 'Tablet' },
  { name: 'Ferrous Sulphate', category: 'Iron Supplement',     defaultStrength: '200mg',  defaultForm: 'Tablet' },
  { name: 'Ferrous Fumarate', category: 'Iron Supplement',     defaultStrength: '210mg',  defaultForm: 'Tablet' },
  { name: 'Vitamin B12',      category: 'Vitamin',             defaultStrength: '1000mcg', defaultForm: 'Tablet' },
  { name: 'Magnesium Oxide',  category: 'Mineral Supplement',  defaultStrength: '400mg',  defaultForm: 'Tablet' },
  { name: 'Zinc Sulphate',    category: 'Mineral Supplement',  defaultStrength: '45mg',   defaultForm: 'Tablet' },

  // ── Ophthalmology / ENT ───────────────────────────────────────────────────
  { name: 'Latanoprost',      category: 'Prostaglandin (Glaucoma)', defaultStrength: '0.005%', defaultForm: 'Liquid' },
  { name: 'Timolol',          category: 'Beta Blocker (Glaucoma)',  defaultStrength: '0.5%',   defaultForm: 'Liquid' },
  { name: 'Brimonidine',      category: 'Alpha Agonist (Glaucoma)', defaultStrength: '0.2%',   defaultForm: 'Liquid' },
  { name: 'Betahistine',      category: 'Histamine Analogue (Vertigo)', defaultStrength: '16mg', defaultForm: 'Tablet' },

  // ── Urology ───────────────────────────────────────────────────────────────
  { name: 'Tamsulosin',       category: 'Alpha Blocker (BPH)', defaultStrength: '400mcg', defaultForm: 'Capsule' },
  { name: 'Finasteride',      category: '5-alpha Reductase Inhibitor (BPH)', defaultStrength: '5mg', defaultForm: 'Tablet' },
  { name: 'Dutasteride',      category: '5-alpha Reductase Inhibitor (BPH)', defaultStrength: '500mcg', defaultForm: 'Capsule' },
  { name: 'Solifenacin',      category: 'Anticholinergic (OAB)', defaultStrength: '5mg',  defaultForm: 'Tablet' },
  { name: 'Tolterodine',      category: 'Anticholinergic (OAB)', defaultStrength: '2mg',  defaultForm: 'Tablet' },
  { name: 'Sildenafil',       category: 'PDE5 Inhibitor',       defaultStrength: '50mg',  defaultForm: 'Tablet' },
  { name: 'Tadalafil',        category: 'PDE5 Inhibitor',       defaultStrength: '10mg',  defaultForm: 'Tablet' },
]

/**
 * Search the drug catalogue. Matches anywhere in the name, case-insensitive.
 * Returns up to `limit` results, prioritising names that start with the query.
 */
export function searchDrugs(query: string, limit = 8): DrugEntry[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  const starts: DrugEntry[] = []
  const contains: DrugEntry[] = []

  for (const drug of DRUG_CATALOGUE) {
    const n = drug.name.toLowerCase()
    if (n.startsWith(q)) starts.push(drug)
    else if (n.includes(q)) contains.push(drug)
    if (starts.length + contains.length >= limit * 2) break
  }

  return [...starts, ...contains].slice(0, limit)
}
