// @ts-check
// Live barcode scanning: the camera stays open and frames are read until a barcode is seen.
// Uses the browser's own barcode reader where there is one (Chrome on Android), otherwise the
// ZXing library on frames drawn to a canvas (Safari on iPhone, desktop browsers).

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** A function that reads a barcode number from the current video frame, or returns null. */
async function frameReader() {
  if ('BarcodeDetector' in window) {
    try {
      const Detector = /** @type {any} */ (window)['BarcodeDetector'];
      const det = new Detector({ formats: FORMATS });
      return async video => {
        const found = await det.detect(video);
        return found[0] ? String(found[0].rawValue) : null;
      };
    } catch (e) {}
  }
  const Z = await import('@zxing/library');
  const hints = new Map();
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    Z.BarcodeFormat.EAN_13,
    Z.BarcodeFormat.EAN_8,
    Z.BarcodeFormat.UPC_A,
    Z.BarcodeFormat.UPC_E,
  ]);
  const reader = new Z.MultiFormatReader();
  const canvas = document.createElement('canvas');
  return async video => {
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decode(bitmap, hints).getText();
    } catch (e) {
      return null; // no barcode in this frame
    }
  };
}

/**
 * Open the back camera in `video` and call onCode(number) once, when a barcode is read.
 * Resolves to a stop() function; call it to close the camera early. Rejects with
 * { code: 'denied' } when the person or browser refuses the camera, or { code: 'unavailable' }
 * when there is no camera to use.
 * @param {HTMLVideoElement} video
 * @param {(code: string) => void} onCode
 */
export async function startScanner(video, onCode) {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) throw { code: 'unavailable' };
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    throw { code: e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'unavailable' };
  }
  let live = true;
  const stop = () => {
    if (!live) return;
    live = false;
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  };
  try {
    video.muted = true;
    video.setAttribute('playsinline', ''); // without this an iPhone opens the video full screen
    video.srcObject = stream;
    await video.play().catch(() => {});
    const read = await frameReader();
    (async () => {
      while (live) {
        if (video.readyState >= 2 && video.videoWidth) {
          const code = await read(video).catch(() => null);
          if (!live) return;
          if (code && /^\d{8,14}$/.test(code)) {
            stop();
            onCode(code);
            return;
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }
    })();
  } catch (e) {
    stop();
    throw { code: 'unavailable' };
  }
  return stop;
}
