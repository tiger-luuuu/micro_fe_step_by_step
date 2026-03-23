/**
 * app-vue/index.js — 模拟 Vue 子应用
 *
 * 这是一个用纯 JS 模拟的"Vue 应用"，不引入真实 Vue 框架。
 * 目的是让你专注于理解微前端生命周期协议，而不是 Vue 本身。
 *
 * 子应用必须遵守的约定：
 * 1. 脚本加载后，将生命周期对象挂载到 window[appName]
 * 2. 生命周期对象包含三个异步函数：bootstrap、mount、unmount
 */

(function () {
  // 模拟 Vue 应用内部状态
  let appInstance = null

  /**
   * bootstrap — 全局初始化（只执行一次）
   * 适合做：初始化全局状态、注册全局组件、建立 WebSocket 连接等
   */
  async function bootstrap() {
    console.log('[app-vue] bootstrap: 初始化 Vue 应用（只执行一次）')
    // 模拟异步初始化（如请求用户配置、加载语言包等）
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('[app-vue] bootstrap 完成')
  }

  /**
   * mount — 挂载到 DOM（每次激活时执行）
   * @param {Object} props
   * @param {Element} props.container - 主应用提供的容器 DOM 节点
   */
  async function mount({ container }) {
    console.log('[app-vue] mount: 渲染 Vue 应用到容器')

    // 模拟 Vue 渲染：创建 DOM 结构并插入容器
    appInstance = document.createElement('div')
    appInstance.className = 'app-vue-root'
    appInstance.innerHTML = `
      <div style="padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #42b883;">
        <h2 style="color: #42b883; margin: 0 0 10px 0;">🟢 Vue 子应用</h2>
        <p style="margin: 0; color: #555;">这里是 Vue 子应用的内容区域。</p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">当前路由：<code>${window.location.hash}</code></p>
        <div style="margin-top: 16px;">
          <button id="vue-counter-btn" style="padding: 8px 16px; background: #42b883; color: white; border: none; border-radius: 4px; cursor: pointer;">
            点击计数: 0
          </button>
        </div>
      </div>
    `

    // 绑定事件（unmount 时需要随容器一起清理）
    let count = 0
    const btn = appInstance.querySelector('#vue-counter-btn')
    btn.addEventListener('click', () => {
      count++
      btn.textContent = `点击计数: ${count}`
    })

    container.appendChild(appInstance)
    console.log('[app-vue] mount 完成')
  }

  /**
   * unmount — 卸载，清理所有 DOM 和副作用（每次切走时执行）
   * @param {Object} props
   * @param {Element} props.container - 挂载时使用的容器
   */
  async function unmount({ container }) {
    console.log('[app-vue] unmount: 清理 Vue 应用')

    // 清理 DOM（Vue 的 app.unmount() 做的就是这件事）
    if (appInstance) {
      container.removeChild(appInstance)
      appInstance = null
    }

    console.log('[app-vue] unmount 完成')
  }

  // 将生命周期函数挂载到 window，遵守微前端框架约定
  // 框架加载脚本后，会从 window['app-vue'] 上读取这些函数
  window['app-vue'] = { bootstrap, mount, unmount }
})()
