import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConfigSummary from './ConfigSummary';
import ConfigurationPanel from './ConfigurationPanel';

const config = {
    weeks: 4,
    hoursPerWeek: 6,
    selectedDifficulties: ['Medium'],
    selectedCompanies: [],
    selectedTopics: [],
    experienceLevel: 'Intermediate'
};

const expectSessionLink = () => {
    const link = screen.getByRole('link', { name: /schedule a 1:1 session with me/i });
    expect(link).toHaveAttribute('href', 'https://topmate.io/nikoo28/1398815');
    expect(link).toHaveAttribute('target', '_blank');
};

describe('1:1 session link', () => {

    it('is shown in the simple view sidebar', () => {
        render(<ConfigSummary config={config} onStartOver={() => { }} />);
        expectSessionLink();
    });

    it('is shown in the advanced view sidebar', () => {
        render(<ConfigurationPanel config={config} setConfig={() => { }} allProblems={[]} filteredStats={null} />);
        expectSessionLink();
    });
});
