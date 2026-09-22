import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import MasterData from './MasterData.tsx';

const updateSettings = vi.fn();

vi.mock('sweetalert2', () => {
  const fire = vi.fn().mockResolvedValue({ isConfirmed: false });
  return {
    default: {
      fire,
      mixin: vi.fn(() => ({ fire })),
      stopTimer: vi.fn(),
      resumeTimer: vi.fn(),
    },
  };
});

vi.mock('../context/AppContext.jsx', () => ({
  useApp: () => ({
    updateSettings,
    masterData: {
      projects: [],
      occupations: [],
      communities: [],
      relations: [],
      propertyTypes: [],
      flatConfigs: [],
      villaConfigs: [],
      callOutcomes: [],
      documentTemplates: {},
    },
  }),
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ can: () => true }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('MasterData — Projects', () => {
  beforeEach(() => {
    updateSettings.mockReset();
  });

  it('blocks save and shows an inline error when the project name is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MasterData />);

    await user.click(screen.getByRole('button', { name: /add project/i }));
    await user.click(screen.getByRole('button', { name: /save project/i }));

    expect(await screen.findByText('Enter a project name.')).toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('saves a new project and closes the drawer', async () => {
    updateSettings.mockResolvedValue({ projects: [{ name: 'Garden City', entity: 'Neoteric Properties' }] });
    const user = userEvent.setup();
    renderWithProviders(<MasterData />);

    await user.click(screen.getByRole('button', { name: /add project/i }));
    await user.type(screen.getByPlaceholderText('e.g. Garden City'), 'Garden City');
    await user.type(screen.getByPlaceholderText('e.g. Neoteric Properties'), 'Neoteric Properties');
    await user.click(screen.getByRole('button', { name: /save project/i }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    expect(updateSettings.mock.calls[0]![0].projects).toEqual([
      expect.objectContaining({ name: 'Garden City', entity: 'Neoteric Properties' }),
    ]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /save project/i })).not.toBeInTheDocument());
  });
});
