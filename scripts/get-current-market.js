// Generate current BTC 5m market URL based on UTC time
// Polymarket BTC 5m markets use slot timestamps (every 5 minutes)

function getCurrentSlotTimestamp() {
  const now = Math.floor(Date.now() / 1000); // seconds
  const slotSeconds = 5 * 60; // 300 seconds
  return Math.floor(now / slotSeconds) * slotSeconds;
}

function getNextSlotTimestamp() {
  const currentSlot = getCurrentSlotTimestamp();
  return currentSlot + 300;
}

const currentSlot = getCurrentSlotTimestamp();
const nextSlot = getNextSlotTimestamp();

console.log(JSON.stringify({
  currentSlot,
  nextSlot,
  currentUrl: `https://polymarket.com/event/btc-updown-5m-${currentSlot}`,
  nextUrl: `https://polymarket.com/event/btc-updown-5m-${nextSlot}`,
  currentTime: new Date().toISOString(),
  currentSlotTime: new Date(currentSlot * 1000).toISOString()
}, null, 2));
