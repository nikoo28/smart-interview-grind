
// The loaded problem data is the source of truth: saved selections of companies or
// topics that no longer exist (renamed or removed in a data update) are dropped.
export function pruneConfig(config, problems) {
    const companies = new Set();
    const topics = new Set();
    problems.forEach(p => {
        p.companies.forEach(c => companies.add(c));
        (p.relatedTopics || []).forEach(t => topics.add(t.name || t));
    });

    const savedTopics = config.selectedTopics || [];
    const selectedCompanies = config.selectedCompanies.filter(c => companies.has(c));
    const selectedTopics = savedTopics.filter(t => topics.has(t));

    // Keep the same object when nothing changed to avoid needless re-renders
    if (selectedCompanies.length === config.selectedCompanies.length && selectedTopics.length === savedTopics.length) {
        return config;
    }
    return { ...config, selectedCompanies, selectedTopics };
}
