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
            {
              text: '前端',
              collapsed: false,
              items: [
                { text: '前端模块', link: '/developer/frontend/' },
                { text: '前端开发规范', link: '/developer/frontend-coding' }
              ]
            },
            {
              text: '后端',
              collapsed: false,
              items: [
                { text: '后端模块', link: '/developer/backend/' },
                { text: '后端架构', link: '/developer/architecture-backend' },
                { text: '代码规范', link: '/developer/coding-standards' },
                { text: '测试', link: '/developer/testing' },
                { text: '模拟与冒烟', link: '/developer/simulation' }
              ]
            },
            { text: '数据采集器', link: '/developer/collector/' },
            {
              text: '接口文档',
              collapsed: false,
              items: [
                { text: '概览', link: '/developer/api/' },
                { text: '认证', link: '/developer/api/auth' },
                { text: '用户管理', link: '/developer/api/users' },
                { text: '首次部署', link: '/developer/api/setup' },
                { text: '平台元数据', link: '/developer/api/platform' },
                { text: '项目', link: '/developer/api/projects' },
                { text: '设备', link: '/developer/api/devices' },
                { text: '传感器', link: '/developer/api/sensors' },
                { text: '通道', link: '/developer/api/channels' },
                { text: '协议', link: '/developer/api/protocols' },
                { text: '时序数据', link: '/developer/api/data' },
                { text: '告警', link: '/developer/api/alerts' },
                { text: '分析', link: '/developer/api/analysis' },
                { text: '3D 模型', link: '/developer/api/models' },
                { text: '大屏', link: '/developer/api/dashboard' },
                { text: '通知', link: '/developer/api/notifications' }
              ]
            },
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
      { icon: 'github', link: 'https://github.com/zhiwei-shm' },
      {
        icon: {
          // 引用 docs/.vitepress/public/gitee.svg（静态资源，非 inline）
          svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 90 90" style="width: 20px; height: 20px"><image href="./gitee.svg" xlink:href="./gitee.svg"/></svg>'
        },
        link: 'https://gitee.com/zhuoju36/zhiwei-shm',
        ariaLabel: 'gitee'
      }
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
