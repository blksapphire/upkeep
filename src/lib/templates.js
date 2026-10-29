export const CATEGORIES = [
  { id: 'documents', label: 'Documents' },
  { id: 'money', label: 'Money & cover' },
  { id: 'home', label: 'Home' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'other', label: 'Other' }
];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

/* Lead times are starting points, not rules: everything stays editable. No provider URLs. */
export const TEMPLATES = [
  { id: 'passport', title: 'Passport', category: 'documents', leadDays: 180, intervalMonths: 120 },
  { id: 'visa', title: 'Visa', category: 'documents', leadDays: 90, intervalMonths: null },
  { id: 'licence', title: "Driver's licence", category: 'documents', leadDays: 60, intervalMonths: 120 },
  { id: 'insurance', title: 'Insurance', category: 'money', leadDays: 30, intervalMonths: 12 },
  { id: 'warranty', title: 'Warranty', category: 'home', leadDays: 60, intervalMonths: 12 },
  { id: 'boiler', title: 'Boiler service', category: 'home', leadDays: 60, intervalMonths: 12 },
  { id: 'vehicle-check', title: 'Vehicle inspection', category: 'vehicle', leadDays: 30, intervalMonths: 12 },
  { id: 'domain', title: 'Domain name', category: 'money', leadDays: 30, intervalMonths: 12 },
  { id: 'membership', title: 'Membership', category: 'money', leadDays: 14, intervalMonths: 12 }
];

export function categoryLabel(id) {
  const category = CATEGORIES.find((entry) => entry.id === id);
  return category ? category.label : 'Other';
}

export function templateById(id) {
  return TEMPLATES.find((template) => template.id === id) || null;
}
