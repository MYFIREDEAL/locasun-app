// Lightweight Google Identity + Calendar API helpers for client-side testing

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

let tokenClient;

export async function getAccessToken({ clientId, scopes }) {
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scopes.join(' '),
          callback: (resp) => {
            if (resp && resp.access_token) return resolve(resp.access_token);
            reject(new Error('No access token'));
          },
        });
      }
      tokenClient.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
}

export async function fetchEvents({ accessToken, timeMin, timeMax, maxResults = 50 }) {
  // Fetch primary calendar events for a date range
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    maxResults: String(maxResults),
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar API error ${res.status}`);
  const data = await res.json();
  return (data.items || []).filter((e) => e.status !== 'cancelled');
}

export function isoRangeForWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7; // 0 for Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 5);
  friday.setHours(23, 59, 59, 999);
  return { timeMin: monday, timeMax: friday };
}
