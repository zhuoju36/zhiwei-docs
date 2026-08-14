import { defineConfig } from 'vitepress'

export default defineConfig({
  // 经 shm-gateway 网关以 /docs/ 子路径挂载（nginx 剥离前缀后按根路径服务）
  base: '/docs/',
  title: '止危',
  description: '止危——开源的结构健康监测（SHM）平台用户文档',
  lang: 'zh-CN',

  lastUpdated: true,
  cleanUrls: true,
  metaChunk: true,

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/what-is-zhiwei' },
      { text: '用户手册', link: '/user/project/' },
      { text: '开发者', link: '/developer/environment' },
      { text: '部署', link: '/deploy/docker' },
      { text: '案例', link: '/examples/bridge' },
      { text: '社区', link: '/community/team' },
      { text: '关于', link: '/about/license' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '什么是止危', link: '/guide/what-is-zhiwei' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '系统架构', link: '/guide/architecture' },
            { text: '术语表', link: '/guide/glossary' },
            { text: '常见问题', link: '/guide/faq' }
          ]
        }
      ],
      '/user/': [
        {
          text: '用户手册',
          items: [
            { text: '项目管理', link: '/user/project/' },
            { text: '传感器与通道', link: '/user/sensor/' },
            { text: '数据采集与查看', link: '/user/data/' },
            { text: '告警规则', link: '/user/alarm/' },
            { text: '报表与导出', link: '/user/report/' },
            { text: '可视化看板', link: '/user/dashboard/' }
          ]
        }
      ],
      '/developer/': [
        {
          text: '开发者',
          items: [
            { text: '开发环境', link: '/developer/environment' },
            { text: '前端模块', link: '/developer/frontend/' },
            { text: '后端模块', link: '/developer/backend/' },
            { text: '接口文档', link: '/developer/api/' },
            { text: '数据模型', link: '/developer/database/' },
            { text: '接入协议', link: '/developer/protocol/' },
            { text: '插件开发', link: '/developer/plugin/' },
            { text: '贡献指南', link: '/developer/contribute' }
          ]
        }
      ],
      '/deploy/': [
        {
          text: '部署运维',
          items: [
            { text: 'Docker 部署', link: '/deploy/docker' },
            { text: 'Kubernetes 部署', link: '/deploy/k8s' },
            { text: '配置项说明', link: '/deploy/config' },
            { text: '备份与恢复', link: '/deploy/backup' },
            { text: '版本升级', link: '/deploy/upgrade' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '实践案例',
          items: [
            { text: '桥梁监测', link: '/examples/bridge' },
            { text: '建筑监测', link: '/examples/building' },
            { text: '风机监测', link: '/examples/wind-turbine' },
            { text: '铁路/轨道监测', link: '/examples/railway' }
          ]
        }
      ],
      '/community/': [
        {
          text: '社区',
          items: [
            { text: '核心团队', link: '/community/team' },
            { text: '产品路线图', link: '/community/roadmap' },
            { text: '更新日志', link: '/community/changelog' },
            { text: '联系我们', link: '/community/contact' }
          ]
        }
      ],
      '/about/': [
        {
          text: '关于',
          items: [
            { text: '开源协议', link: '/about/license' },
            { text: '致谢', link: '/about/acknowledgements' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zhiwei-shm' }
    ],

    footer: {
      message: '基于 MIT 协议开源',
      copyright: 'Copyright © 2026 止危——开源的结构健康监测平台'
    },

    editLink: {
      pattern: 'https://github.com/zhiwei-shm/zhiwei-docs/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    search: {
      provider: 'local'
    }
  }
})
