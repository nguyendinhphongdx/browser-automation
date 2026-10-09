import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { getResourceById, resourceFilePath } from '../services/library-service'

export const LIBRARY_PROTOCOL = 'app-resource'

/**
 * Must run at module scope, before app.whenReady() — Electron only honors
 * registerSchemesAsPrivileged() calls made before the app is ready.
 */
export function registerLibrarySchemeAsPrivileged() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LIBRARY_PROTOCOL,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/**
 * Serves `app-resource://<id>` as the resource's actual file bytes, so the
 * renderer can use plain `<img src="app-resource://<id>">` instead of
 * round-tripping base64 over IPC for every thumbnail in the library grid.
 *
 * SECURITY: the path is resolved ONLY via getResourceById(id) ->
 * resourceFilePath() — id is matched against the DB, extension comes from
 * the matched row, never from the request URL itself. Trusting a raw path
 * segment here would turn this into an arbitrary local-file-read primitive.
 */
export function registerLibraryProtocol() {
  protocol.handle(LIBRARY_PROTOCOL, async (request) => {
    const id = new URL(request.url).hostname || new URL(request.url).pathname.replace(/^\/+/, '')
    const resource = getResourceById(id)
    if (!resource || resource.kind === 'folder') {
      return new Response('Not found', { status: 404 })
    }
    try {
      return await net.fetch(pathToFileURL(resourceFilePath(resource.id, resource.extension)).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
