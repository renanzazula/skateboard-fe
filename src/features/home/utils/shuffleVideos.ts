// README_HOME_DASHBOARD.md §4/§23/§24: pure, non-mutating shuffle, isolated
// so it can later be swapped for real recommendation logic without touching
// the screen. Randomization is frontend-only and in-memory — it never
// changes the API's canonical order.
export const shuffleVideos = <T,>(items: T[]): T[] => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};
