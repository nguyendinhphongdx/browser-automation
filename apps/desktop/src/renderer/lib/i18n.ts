import { create } from 'zustand'

export type Locale = 'vi' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // Sidebar
    'nav.profiles': 'Hồ sơ',
    'nav.automation': 'Tự động hoá',
    'nav.resources': 'Tài nguyên',
    'nav.marketplace': 'Chợ kịch bản',
    'nav.settings': 'Cài đặt',

    // Profiles
    'profiles.title': 'Profiles',
    'profiles.manage': 'Quản lý {count} browser profile',
    'profiles.create': 'Tạo Profile',
    'profiles.search': 'Tìm kiếm profile...',
    'profiles.empty': 'Chưa có profile nào',
    'profiles.emptyHint': 'Tạo profile đầu tiên để bắt đầu',
    'profiles.name': 'Tên',
    'profiles.browser': 'Trình duyệt',
    'profiles.platform': 'Platform',
    'profiles.proxy': 'Proxy',
    'profiles.tags': 'Tags',
    'profiles.lastUsed': 'Lần dùng cuối',
    'profiles.actions': 'Thao tác',
    'profiles.launch': 'Khởi chạy',
    'profiles.stop': 'Dừng',
    'profiles.edit': 'Chỉnh sửa',
    'profiles.duplicate': 'Nhân đôi',
    'profiles.delete': 'Xoá',
    'profiles.running': 'Đang chạy',
    'profiles.neverUsed': 'Chưa dùng',
    'profiles.noProxy': 'Không có',
    'profiles.confirmDelete': 'Bạn có chắc muốn xoá profile này?',

    // Resources
    'resources.title': 'Tài nguyên',
    'resources.subtitle': 'Quản lý proxy, email, cookie',
    'resources.proxy': 'Proxy',
    'resources.email': 'Email / Account',
    'resources.cookie': 'Cookie',

    // Automation
    'automation.title': 'Automation Builder',
    'automation.selectOrCreate': 'Chọn workflow từ danh sách hoặc tạo mới',
    'automation.createWorkflow': 'Tạo Workflow',
    'automation.save': 'Lưu',
    'automation.run': 'Chạy',
    'automation.stop': 'Dừng',
    'automation.logs': 'Logs',
    'automation.selectProfile': 'Chọn profile...',

    // Settings
    'settings.title': 'Cài đặt',
    'settings.subtitle': 'Tuỳ chỉnh ứng dụng',
    'settings.theme': 'Giao diện',
    'settings.themeLight': 'Sáng',
    'settings.themeDark': 'Tối',
    'settings.themeSystem': 'Hệ thống',
    'settings.language': 'Ngôn ngữ',
    'settings.shortcuts': 'Phím tắt',
    'settings.data': 'Dữ liệu',
    'settings.about': 'Thông tin',
    'settings.version': 'Phiên bản',

    // Common
    'common.cancel': 'Huỷ',
    'common.save': 'Lưu',
    'common.create': 'Tạo',
    'common.loading': 'Đang tải...',
    'common.import': 'Import',
    'common.export': 'Export',
    'common.search': 'Tìm kiếm...',
    'common.comingSoon': 'Sắp ra mắt',
  },
  en: {
    // Sidebar
    'nav.profiles': 'Profiles',
    'nav.automation': 'Automation',
    'nav.resources': 'Resources',
    'nav.marketplace': 'Marketplace',
    'nav.settings': 'Settings',

    // Profiles
    'profiles.title': 'Profiles',
    'profiles.manage': 'Managing {count} browser profiles',
    'profiles.create': 'Create Profile',
    'profiles.search': 'Search profiles...',
    'profiles.empty': 'No profiles yet',
    'profiles.emptyHint': 'Create your first profile to get started',
    'profiles.name': 'Name',
    'profiles.browser': 'Browser',
    'profiles.platform': 'Platform',
    'profiles.proxy': 'Proxy',
    'profiles.tags': 'Tags',
    'profiles.lastUsed': 'Last Used',
    'profiles.actions': 'Actions',
    'profiles.launch': 'Launch',
    'profiles.stop': 'Stop',
    'profiles.edit': 'Edit',
    'profiles.duplicate': 'Duplicate',
    'profiles.delete': 'Delete',
    'profiles.running': 'Running',
    'profiles.neverUsed': 'Never',
    'profiles.noProxy': 'None',
    'profiles.confirmDelete': 'Are you sure you want to delete this profile?',

    // Resources
    'resources.title': 'Resources',
    'resources.subtitle': 'Manage proxies, emails, cookies',
    'resources.proxy': 'Proxy',
    'resources.email': 'Email / Account',
    'resources.cookie': 'Cookie',

    // Automation
    'automation.title': 'Automation Builder',
    'automation.selectOrCreate': 'Select a workflow or create a new one',
    'automation.createWorkflow': 'Create Workflow',
    'automation.save': 'Save',
    'automation.run': 'Run',
    'automation.stop': 'Stop',
    'automation.logs': 'Logs',
    'automation.selectProfile': 'Select profile...',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize the application',
    'settings.theme': 'Appearance',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeSystem': 'System',
    'settings.language': 'Language',
    'settings.shortcuts': 'Keyboard Shortcuts',
    'settings.data': 'Data',
    'settings.about': 'About',
    'settings.version': 'Version',

    // Common
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.loading': 'Loading...',
    'common.import': 'Import',
    'common.export': 'Export',
    'common.search': 'Search...',
    'common.comingSoon': 'Coming soon',
  }
}

interface I18nStore {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const useI18n = create<I18nStore>((set, get) => ({
  locale: (localStorage.getItem('locale') as Locale) || 'vi',

  setLocale: (locale) => {
    localStorage.setItem('locale', locale)
    set({ locale })
  },

  t: (key, params) => {
    const { locale } = get()
    let text = translations[locale]?.[key] || translations['vi']?.[key] || key

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }

    return text
  }
}))
