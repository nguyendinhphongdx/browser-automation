import type { VideoNodeDefinition } from '../../shared/types'

const PROVIDER_OPTIONS = [
  { label: 'Kling', value: 'kling' },
  { label: 'Runway', value: 'runway' },
  { label: 'ComfyUI (local)', value: 'comfyui' }
]

const TTS_PROVIDER_OPTIONS = [
  { label: 'ElevenLabs', value: 'elevenlabs' },
  { label: 'OpenAI', value: 'openai-tts' },
  { label: 'Google', value: 'google-tts' }
]

const ASPECT_RATIO_OPTIONS = [
  { label: '16:9 (ngang)', value: '16:9' },
  { label: '9:16 (dọc)', value: '9:16' },
  { label: '1:1 (vuông)', value: '1:1' }
]

// Stitch/Audio Mix không hỗ trợ số lượng input động — dùng 1 số socket cố
// định (đủ cho phần lớn pipeline v1) thay vì mô hình mảng, giữ cho mỗi
// socket vẫn đúng 1-nối-1 như mọi node khác, không cần type/UI riêng cho
// "nhiều kết nối trên cùng 1 handle".
const MAX_STITCH_CLIPS = 6
const MAX_MIX_TRACKS = 4

export const VIDEO_NODE_DEFINITIONS: VideoNodeDefinition[] = [
  {
    type: 'character-reference',
    label: 'Nhân vật/Phụ kiện',
    category: 'input',
    icon: 'UserSquare',
    description: 'Ảnh tham chiếu nhân vật/phụ kiện — dùng lại ở nhiều cảnh để giữ nhất quán.',
    inputs: [],
    outputs: [{ name: 'image', type: 'IMAGE', required: true }],
    configSchema: [
      { key: 'refImage', label: 'Ảnh tham chiếu', type: 'resource-select', resourceKind: 'image', required: true },
      { key: 'description', label: 'Mô tả', type: 'text', placeholder: 'Vd: mèo cam, mắt xanh, đeo khăn đỏ' }
    ]
  },
  {
    type: 'scene-prompt',
    label: 'Prompt cảnh',
    category: 'input',
    icon: 'FileText',
    description: 'Mô tả 1 cảnh — prompt, lời thoại (nếu có), thời lượng.',
    inputs: [],
    outputs: [{ name: 'text', type: 'TEXT', required: true }],
    configSchema: [
      { key: 'prompt', label: 'Prompt cảnh', type: 'text', required: true },
      { key: 'dialogueLine', label: 'Lời thoại (nếu có)', type: 'text' },
      { key: 'durationSec', label: 'Thời lượng (giây)', type: 'number', defaultValue: 5 }
    ]
  },
  {
    type: 'generate-image',
    label: 'Tạo ảnh',
    category: 'generate',
    icon: 'ImagePlus',
    description: 'Tạo ảnh từ prompt, có thể kèm ảnh tham chiếu nhân vật.',
    inputs: [
      { name: 'prompt', type: 'TEXT', required: true },
      { name: 'referenceImage', type: 'IMAGE', required: false }
    ],
    outputs: [{ name: 'image', type: 'IMAGE', required: true }],
    configSchema: [
      { key: 'provider', label: 'Provider', type: 'select', options: PROVIDER_OPTIONS, defaultValue: 'kling', required: true },
      { key: 'aspectRatio', label: 'Tỉ lệ khung hình', type: 'select', options: ASPECT_RATIO_OPTIONS, defaultValue: '16:9' },
      { key: 'negativePrompt', label: 'Negative prompt', type: 'text' }
    ]
  },
  {
    type: 'generate-video',
    label: 'Tạo video',
    category: 'generate',
    icon: 'Film',
    description: 'Tạo video từ prompt/ảnh — nối continuityFrame từ cảnh trước để khớp chuyển động.',
    inputs: [
      { name: 'prompt', type: 'TEXT', required: false },
      { name: 'image', type: 'IMAGE', required: false },
      { name: 'continuityFrame', type: 'IMAGE', required: false }
    ],
    outputs: [{ name: 'video', type: 'VIDEO', required: true }],
    configSchema: [
      { key: 'provider', label: 'Provider', type: 'select', options: PROVIDER_OPTIONS, defaultValue: 'kling', required: true },
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        options: [
          { label: 'Text → Video', value: 'text-to-video' },
          { label: 'Ảnh → Video', value: 'image-to-video' }
        ],
        defaultValue: 'text-to-video'
      },
      { key: 'durationSec', label: 'Thời lượng (giây)', type: 'number', defaultValue: 5 },
      { key: 'aspectRatio', label: 'Tỉ lệ khung hình', type: 'select', options: ASPECT_RATIO_OPTIONS, defaultValue: '16:9' }
    ]
  },
  {
    type: 'extract-last-frame',
    label: 'Lấy khung hình cuối',
    category: 'post',
    icon: 'Crop',
    description: 'Lấy khung hình cuối của 1 video — nối sang continuityFrame của cảnh kế để khớp chuyển động.',
    inputs: [{ name: 'video', type: 'VIDEO', required: true }],
    outputs: [{ name: 'image', type: 'IMAGE', required: true }],
    configSchema: []
  },
  {
    type: 'tts-dialogue',
    label: 'TTS lời thoại',
    category: 'generate',
    icon: 'MessageSquare',
    description: 'Giọng nói lời thoại nhân vật — chọn provider hoặc nhập file âm thanh có sẵn.',
    inputs: [{ name: 'text', type: 'TEXT', required: true }],
    outputs: [{ name: 'audio', type: 'AUDIO', required: true }],
    configSchema: [
      {
        key: 'mode',
        label: 'Nguồn',
        type: 'select',
        options: [
          { label: 'Gọi provider TTS', value: 'provider' },
          { label: 'Dùng file có sẵn', value: 'import' }
        ],
        defaultValue: 'provider'
      },
      { key: 'provider', label: 'Provider TTS', type: 'select', options: TTS_PROVIDER_OPTIONS, defaultValue: 'elevenlabs' },
      { key: 'voiceId', label: 'Voice ID', type: 'text' },
      { key: 'importedAudio', label: 'File âm thanh có sẵn', type: 'resource-select', resourceKind: 'audio' }
    ]
  },
  {
    type: 'tts-narration',
    label: 'TTS giọng kể',
    category: 'generate',
    icon: 'Mic',
    description: 'Giọng kể ngoại cảnh/narrator — chọn provider hoặc nhập file âm thanh có sẵn.',
    inputs: [{ name: 'text', type: 'TEXT', required: true }],
    outputs: [{ name: 'audio', type: 'AUDIO', required: true }],
    configSchema: [
      {
        key: 'mode',
        label: 'Nguồn',
        type: 'select',
        options: [
          { label: 'Gọi provider TTS', value: 'provider' },
          { label: 'Dùng file có sẵn', value: 'import' }
        ],
        defaultValue: 'provider'
      },
      { key: 'provider', label: 'Provider TTS', type: 'select', options: TTS_PROVIDER_OPTIONS, defaultValue: 'elevenlabs' },
      { key: 'voiceId', label: 'Voice ID', type: 'text' },
      { key: 'importedAudio', label: 'File âm thanh có sẵn', type: 'resource-select', resourceKind: 'audio' }
    ]
  },
  {
    type: 'subtitle',
    label: 'Phụ đề',
    category: 'post',
    icon: 'Captions',
    description: 'Sinh track phụ đề từ kịch bản/lời thoại theo thời gian.',
    inputs: [{ name: 'text', type: 'TEXT', required: true }],
    outputs: [{ name: 'subtitleTrack', type: 'TEXT', required: true }],
    configSchema: [
      {
        key: 'style',
        label: 'Kiểu hiển thị',
        type: 'select',
        options: [
          { label: 'Mặc định (trắng, viền đen)', value: 'default' },
          { label: 'Lớn, nổi bật', value: 'bold' }
        ],
        defaultValue: 'default'
      }
    ]
  },
  {
    type: 'stitch',
    label: 'Nối clip',
    category: 'post',
    icon: 'Link',
    description: `Nối tối đa ${MAX_STITCH_CLIPS} clip video theo thứ tự thành 1 video.`,
    inputs: Array.from({ length: MAX_STITCH_CLIPS }, (_, i) => ({
      name: `video${i + 1}`,
      type: 'VIDEO' as const,
      required: i === 0
    })),
    outputs: [{ name: 'video', type: 'VIDEO', required: true }],
    configSchema: []
  },
  {
    type: 'audio-mix',
    label: 'Mix âm thanh',
    category: 'post',
    icon: 'AudioLines',
    description: `Mix tối đa ${MAX_MIX_TRACKS} track âm thanh (lời thoại, giọng kể, audio gốc...) thành 1 track.`,
    inputs: Array.from({ length: MAX_MIX_TRACKS }, (_, i) => ({
      name: `track${i + 1}`,
      type: 'AUDIO' as const,
      required: i === 0
    })),
    outputs: [{ name: 'audio', type: 'AUDIO', required: true }],
    configSchema: []
  },
  {
    type: 'compose',
    label: 'Ghép hoàn chỉnh',
    category: 'post',
    icon: 'Clapperboard',
    description: 'Ghép video + audio + phụ đề thành video cuối cùng.',
    inputs: [
      { name: 'video', type: 'VIDEO', required: true },
      { name: 'audio', type: 'AUDIO', required: false },
      { name: 'subtitleTrack', type: 'TEXT', required: false }
    ],
    outputs: [{ name: 'video', type: 'VIDEO', required: true }],
    configSchema: [
      {
        key: 'renderEngine',
        label: 'Engine ghép',
        type: 'select',
        options: [
          { label: 'Tự động', value: 'auto' },
          { label: 'FFmpeg', value: 'ffmpeg' },
          { label: 'Remotion (sub đẹp hơn)', value: 'remotion' }
        ],
        defaultValue: 'auto'
      }
    ]
  },
  {
    type: 'save-to-library',
    label: 'Lưu vào Thư viện',
    category: 'output',
    icon: 'Save',
    description: 'Lưu video hoàn chỉnh vào Thư viện tài nguyên.',
    inputs: [{ name: 'media', type: 'VIDEO', required: true }],
    outputs: [],
    configSchema: [
      { key: 'name', label: 'Tên', type: 'text', required: true },
      { key: 'folderId', label: 'Thư mục lưu', type: 'resource-select', resourceKind: 'folder' },
      { key: 'tags', label: 'Tags (phân cách bằng dấu phẩy)', type: 'text' }
    ]
  }
]

export function getVideoNodeDefinition(type: string): VideoNodeDefinition | undefined {
  return VIDEO_NODE_DEFINITIONS.find((d) => d.type === type)
}
