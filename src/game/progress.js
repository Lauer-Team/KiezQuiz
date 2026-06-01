/* KiezQuiz city progress helpers (hub + game) */
function getCityRankTotals(game, cityId) {
  const city = window.cityRegistry?.getCity(cityId);
  if (!city || city.status !== 'playable') {
    return { unlockedDistricts: 0, totalDistricts: 0, trophies: 0, totalTrophies: 0 };
  }
  const progression = window.cityRegistry.getBezirkeProgression(cityId);
  const totalDistricts = progression.length;
  const branch = game._save?.cities?.[cityId];
  const unlockedDistricts = cityId === game.activeCityId && game.view === 'city'
    ? game.unlockedBezirkIndex + 1
    : (parseInt(branch?.unlockedRegionIndex, 10) || 0) + 1;
  const totalTrophies = typeof getTrophyCatalog === 'function'
    ? getTrophyCatalog(cityId).length
    : (city.totalTrophies || 0);
  const trophies = cityId === game.activeCityId && game.view === 'city'
    ? (game.trophies?.size || 0)
    : (Array.isArray(branch?.trophies) ? branch.trophies.length : 0);
  return { unlockedDistricts, totalDistricts, trophies, totalTrophies };
}

function calculateCityLevel(game, cityId) {
  const totals = getCityRankTotals(game, cityId);
  if (totals.totalDistricts === 0 && totals.totalTrophies === 0) return 1;
  let currentLvl = 1;
  for (const rank of CITY_RANK_THRESHOLDS) {
    const minDistricts = rank.level === CITY_RANK_THRESHOLDS.length
      ? totals.totalDistricts
      : Math.min(rank.minDistricts, totals.totalDistricts);
    const minTrophies = rank.level === CITY_RANK_THRESHOLDS.length
      ? totals.totalTrophies
      : Math.min(rank.minTrophies, totals.totalTrophies);
    if (totals.unlockedDistricts >= minDistricts && totals.trophies >= minTrophies) {
      currentLvl = rank.level;
    }
  }
  return currentLvl;
}

function getBranchState(game, cityId) {
  if (cityId === game.activeCityId && game.view === 'city') {
    return {
      unlockedBezirkIndex: game.unlockedBezirkIndex,
      bezirkProgress: game.bezirkProgress,
      trophies: game.trophies
    };
  }
  const branch = game._save?.cities?.[cityId];
  const progression = window.cityRegistry.getBezirkeProgression(cityId);
  const bezirkProgress = {};
  progression.forEach((bz) => {
    bezirkProgress[bz.name] = {
      solved: new Set(branch?.regionProgress?.[bz.name] || [])
    };
  });
  return {
    unlockedBezirkIndex: parseInt(branch?.unlockedRegionIndex, 10) || 0,
    bezirkProgress,
    trophies: new Set(branch?.trophies || [])
  };
}

window.kiezProgress = { getCityRankTotals, calculateCityLevel, getBranchState };

