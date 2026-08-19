import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  FIRST_STEP_IDS,
  normalizeFirstSteps,
  loadFirstSteps,
  markFirstStepDone,
  dismissFirstSteps,
  isFirstStepsComplete,
} from '../../services/firstSteps';

describe('firstSteps — getting-started checklist state', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.FIRST_STEPS);
  });

  it('normalizes corrupt input to a safe empty state', () => {
    expect(normalizeFirstSteps(null)).toEqual({ done: [], dismissed: false });
    expect(normalizeFirstSteps('garbage')).toEqual({ done: [], dismissed: false });
    expect(normalizeFirstSteps({ done: ['timetable', 'bogus', 'timetable'], dismissed: 'yes' })).toEqual({
      done: ['timetable'],
      dismissed: false,
    });
  });

  it('marks steps done exactly once and persists them', async () => {
    await markFirstStepDone('mensa');
    await markFirstStepDone('mensa');
    await markFirstStepDone('nonsense');
    const state = await loadFirstSteps();
    expect(state.done).toEqual(['mensa']);
    expect(state.dismissed).toBe(false);
  });

  it('is complete when every step is done OR when dismissed', async () => {
    expect(isFirstStepsComplete({ done: [], dismissed: true })).toBe(true);
    for (const id of FIRST_STEP_IDS) await markFirstStepDone(id);
    expect(isFirstStepsComplete(await loadFirstSteps())).toBe(true);
  });

  it('dismiss persists across loads', async () => {
    await dismissFirstSteps();
    expect((await loadFirstSteps()).dismissed).toBe(true);
  });
});
