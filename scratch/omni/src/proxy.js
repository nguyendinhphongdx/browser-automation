import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'

/**
 * fetch của Node 22 bỏ qua HTTP(S)_PROXY. Máy chạy sau proxy (công ty, sandbox)
 * thì mọi request Gemini fail với ENOTFOUND — bật proxy theo biến môi trường.
 */
if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) {
  // EnvHttpProxyAgent in cảnh báo "experimental" ra stderr mỗi lần chạy — tắt riêng cảnh báo đó.
  const emit = process.emitWarning
  process.emitWarning = (w, ...rest) => (String(w).includes('EnvHttpProxyAgent') ? undefined : emit.call(process, w, ...rest))
  setGlobalDispatcher(new EnvHttpProxyAgent())
  process.emitWarning = emit
}
