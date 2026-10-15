let tripData = null;

export async function loadTrip() {
  if (tripData) return tripData;
  const resp = await fetch('./data/trip.json');
  tripData = await resp.json();
  return tripData;
}

export function getTrip() { return tripData; }
export function getPlaces() { return tripData?.places || []; }
export function getPlace(id) { return getPlaces().find(p => p.id === id); }
export function getSteps() { return tripData?.steps || []; }
export function getStep(id) { return getSteps().find(s => s.id === id); }
export function getDays() { return tripData?.days || []; }
export function getStepsForDay(date) { return getSteps().filter(s => s.day === date); }
export function getWalletItems() { return tripData?.walletItems || []; }
export function getPhrases() { return tripData?.phrases || []; }
export function getEmergency() { return tripData?.emergency || {}; }
