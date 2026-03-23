/**
 * app-react/index.js — 模拟 React 子应用
 *
 * 同样是纯 JS 模拟，目的是展示微前端对框架无关性：
 * 无论子应用内部用什么框架，只要遵守生命周期协议，框架就能调度它。
 */

(function () {
  let appInstance = null
  let intervalId = null // 用于演示"副作用清理"的重要性

  async function bootstrap() {
    console.log('[app-react] bootstrap: 初始化 React 应用（只执行一次）')
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('[app-react] bootstrap 完成')
  }

  async function mount({ container }) {
    console.log('[app-react] mount: 渲染 React 应用到容器')

    appInstance = document.createElement('div')
    appInstance.className = 'app-react-root'

    // 模拟一个实时更新的时钟组件，演示副作用（setInterval）需要在 unmount 时清理
    const timeEl = document.createElement('code')
    timeEl.textContent = new Date().toLocaleTimeString()

    appInstance.innerHTML = `
      <div style="padding: 20px; background: #fff4f4; border-radius: 8px; border-left: 4px solid #61dafb;">
        <h2 style="color: #61dafb; margin: 0 0 10px 0;">⚛️ React 子应用</h2>
        <p style="margin: 0; color: #555;">这里是 React 子应用的内容区域。</p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">
          实时时钟（演示副作用清理）：<span id="react-clock"></span>
        </p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">
          ⚠️ 切换到 Vue 子应用时，这个 setInterval 会被正确清理
        </p>
      </div>
    `

    container.appendChild(appInstance)

    // 启动定时器（这是一个副作用，必须在 unmount 时清理！）
    const clockEl = appInstance.querySelector('#react-clock')
    intervalId = setInterval(() => {
      clockEl.textContent = new Date().toLocaleTimeString()
    }, 1000)
    clockEl.textContent = new Date().toLocaleTimeString()

    console.log('[app-react] mount 完成，定时器已启动')
  }

  async function unmount({ container }) {
    console.log('[app-react] unmount: 清理 React 应用')

    // 关键：清理副作用（如果忘记清理，即使切走后定时器仍在后台运行）
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
      console.log('[app-react] 定时器已清理')
    }

    if (appInstance) {
      container.removeChild(appInstance)
      appInstance = null
    }

    console.log('[app-react] unmount 完成')
  }

  window['app-react'] = { bootstrap, mount, unmount }
})()
