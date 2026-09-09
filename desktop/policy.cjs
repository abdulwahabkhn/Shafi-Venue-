const ORIGIN = 'https://shafi-venue.vercel.app';
const PORTAL = `${ORIGIN}/management`;
function trusted(raw) {
  try { const u=new URL(raw); return u.origin===ORIGIN && !u.username && !u.password; } catch { return false; }
}
module.exports = {ORIGIN, PORTAL, trusted};
