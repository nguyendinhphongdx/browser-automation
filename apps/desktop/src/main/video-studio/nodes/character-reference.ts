import { BaseVideoNode, type VideoSocketValue } from './base-node'
import { getResourceById, resourceFilePath } from '../../services/library-service'

export class CharacterReferenceNode extends BaseVideoNode {
  async execute(): Promise<Record<string, VideoSocketValue>> {
    const resourceId = this.resolveConfigString('refImage')
    if (!resourceId) throw new Error('Chưa chọn ảnh tham chiếu')
    const resource = getResourceById(resourceId)
    if (!resource) throw new Error(`Không tìm thấy resource ảnh: ${resourceId}`)
    return { image: resourceFilePath(resource.id, resource.extension) }
  }
}
