import IUCNBadge from '@/components/IUCNBadge';
import { IUCN_CATEGORIES } from '@/lib/iucn';

export default function IUCNLegend() {
    return (
        <section className="glass-card iucn-index" aria-labelledby="iucn-index-title">
            <div className="iucn-index-heading">
                <div>
                    <h2 id="iucn-index-title">IUCN label index</h2>
                    <p>A guide to the conservation status labels used in this dashboard.</p>
                </div>
                <a href="https://www.iucnredlist.org/resources/categories-and-criteria" target="_blank" rel="noopener noreferrer">
                    IUCN Red List guide ↗
                </a>
            </div>
            <dl className="iucn-index-grid">
                {IUCN_CATEGORIES.map(category => (
                    <div key={category.code} className="iucn-index-item">
                        <dt><IUCNBadge category={category.code} /><span>{category.name}</span></dt>
                        <dd>{category.description}</dd>
                    </div>
                ))}
            </dl>
            <p className="iucn-index-note">
                <strong>Threatened: CR, EN and VU.</strong> DD and NE do not mean low risk.
                {' '}Labels shown for species come from the saved dataset; an unavailable lookup is also displayed as NE.
            </p>
        </section>
    );
}
