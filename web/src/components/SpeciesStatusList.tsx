import IUCNBadge from '@/components/IUCNBadge';
import { IUCN_CATEGORIES } from '@/lib/iucn';

export default function SpeciesStatusList({ species, categories, label }: {
    species: string[];
    categories: Record<string, string>;
    label: string;
}) {
    if (!species.length) return <p className="site-empty">None.</p>;
    return <ul className="result-species-list" aria-label={label}>
        {[...species].sort((a, b) => a.localeCompare(b)).map(name => {
            const code = (categories[name] || 'NE').trim().toUpperCase();
            const definition = IUCN_CATEGORIES.find(category => category.code === code);
            return <li key={name}>
                <i>{name}</i>
                <div><IUCNBadge category={code} /><span>{definition?.name || 'Unknown category'}</span></div>
            </li>;
        })}
    </ul>;
}
