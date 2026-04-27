// Mock de AdMob para que la compilación Web no falle.
// Google Mobile Ads es exclusivo de Android/iOS.
export const mobileAds = () => ({
  initialize: () => Promise.resolve()
});

export const BannerAd = () => null;
export const BannerAdSize = { BANNER: 'BANNER' };
export const TestIds = { BANNER: 'BANNER' };
