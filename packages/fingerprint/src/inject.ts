import type { Fingerprint } from '@browser-automation/shared-types'

/** Tạo script inject fingerprint vào browser page */
export function buildFingerprintScript(fp: Fingerprint): string {
  return `
    // Ghi đè navigator properties
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.hardwareConcurrency} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });
    Object.defineProperty(navigator, 'platform', { get: () => '${fp.platform}' });
    Object.defineProperty(navigator, 'language', { get: () => '${fp.language}' });
    Object.defineProperty(navigator, 'languages', { get: () => ['${fp.language}', '${fp.language.split('-')[0]}'] });
    Object.defineProperty(navigator, 'doNotTrack', { get: () => ${fp.doNotTrack ? '"1"' : 'null'} });

    // Ghi đè screen properties
    Object.defineProperty(screen, 'width', { get: () => ${fp.screenResolution.width} });
    Object.defineProperty(screen, 'height', { get: () => ${fp.screenResolution.height} });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.colorDepth} });

    // Canvas fingerprint noise
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] + (${fp.canvas.noise} * (Math.random() - 0.5) * 2) | 0;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return origToDataURL.apply(this, arguments);
    };

    // WebGL fingerprint
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      const UNMASKED_VENDOR = 0x9245;
      const UNMASKED_RENDERER = 0x9246;
      if (param === UNMASKED_VENDOR) return '${fp.webgl.vendor}';
      if (param === UNMASKED_RENDERER) return '${fp.webgl.renderer}';
      return origGetParameter.apply(this, arguments);
    };

    // AudioContext fingerprint noise
    const origCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const osc = origCreateOscillator.apply(this, arguments);
      const origConnect = osc.connect.bind(osc);
      osc.connect = function(dest) {
        return origConnect(dest);
      };
      return osc;
    };

    // Ẩn dấu vết automation
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  `
}

/** Tạo danh sách args cho Chromium-based browsers */
export function buildFingerprintArgs(fp: Fingerprint): string[] {
  const args: string[] = [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-infobars'
  ]

  if (!fp.webrtc.enabled) {
    args.push('--disable-webrtc')
  }

  return args
}
