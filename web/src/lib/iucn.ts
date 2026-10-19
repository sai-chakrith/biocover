export const IUCN_CATEGORIES = [
    { code: 'EX', name: 'Extinct', description: 'No reasonable doubt that the last individual has died.' },
    { code: 'EW', name: 'Extinct in the Wild', description: 'Survives only in captivity, cultivation or outside its past range.' },
    { code: 'CR', name: 'Critically Endangered', description: 'Extremely high risk of extinction in the wild.' },
    { code: 'EN', name: 'Endangered', description: 'Very high risk of extinction in the wild.' },
    { code: 'VU', name: 'Vulnerable', description: 'High risk of extinction in the wild.' },
    { code: 'NT', name: 'Near Threatened', description: 'Close to qualifying for a threatened category.' },
    { code: 'LC', name: 'Least Concern', description: 'Does not currently qualify as threatened or Near Threatened.' },
    { code: 'DD', name: 'Data Deficient', description: 'Too little information to assess extinction risk.' },
    { code: 'NE', name: 'Not Evaluated', description: 'Has not yet been assessed against the Red List criteria.' },
] as const;
