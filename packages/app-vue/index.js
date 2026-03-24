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
  let appInstance = null;

  /**
   * bootstrap — 全局初始化（只执行一次）
   * 适合做：初始化全局状态、注册全局组件、建立 WebSocket 连接等
   */
  async function bootstrap() {
    console.log('[app-vue] bootstrap: 初始化 Vue 应用（只执行一次）');
    // 模拟异步初始化（如请求用户配置、加载语言包等）
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('[app-vue] bootstrap 完成');
  }

  /**
   * mount — 挂载到 DOM（每次激活时执行）
   * @param {Object} props
   * @param {Element} props.container - 主应用提供的容器 DOM 节点
   */
  async function mount({ container }) {
    // 写入全局变量——沙箱生效时，这个值只存在于 app-vue 的 fakeWindow 中，
    // 不会污染真实 window，也不会被 app-react 覆盖
    window.xxxxfdafads = 123;
    window.__APP_NAME__ = 'app-vue';
    console.log('[app-vue] mount: 渲染 Vue 应用到容器');

    // ─── CSS 隔离演示 ────────────────────────────────────────────────────────
    // 注入 <style> 到 container（Shadow DOM 模式下即 shadowRoot）。
    // 这里故意设置 h2 为绿色，与主应用的"h2 { color: red }"形成冲突。
    // Shadow DOM 隔离生效时：
    //   - 主应用的红色规则无法穿透进 shadow root，子应用 h2 显示绿色 ✓
    //   - 子应用的绿色规则不会泄漏到 shadow root 外，主应用 h2 仍为红色 ✓
    const style = document.createElement('style');
    style.textContent = `
      h2 {
        color: #42b883;   /* 绿色，Vue 品牌色 */
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 20px;
      }
      .app-vue-root {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
    `;
    container.appendChild(style);
    // ────────────────────────────────────────────────────────────────────────

    // 模拟 Vue 渲染：创建 DOM 结构并插入容器
    appInstance = document.createElement('div');
    appInstance.className = 'app-vue-root';
    appInstance.innerHTML = `
      <div style="padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #42b883;">
        <h2 style="margin: 0 0 10px 0;">🟢 Vue 子应用</h2>
        <p style="margin: 0; color: #555;">这里是 Vue 子应用的内容区域。</p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">当前路由：<code>${window.location.hash}</code></p>
        <p style="margin: 8px 0 0 0; font-size: 14px; background: #e6f7ef; padding: 6px 10px; border-radius: 4px;">
          🔒 JS 沙箱验证：<code>window.__APP_NAME__ = "${window.__APP_NAME__}"</code>
          <br><small style="color:#888;">沙箱生效时此值为 "app-vue"，真实 window 上不存在该变量</small>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; background: #dff0d8; padding: 6px 10px; border-radius: 4px;">
          🎨 CSS 隔离验证：此 h2 颜色由子应用内部的 &lt;style&gt; 控制（绿色 #42b883）
          <br><small style="color:#888;">主应用设置了 h2 { color: red }，若隔离生效则此处不受影响</small>
        </p>
        <div style="margin-top: 16px;">
          <button id="vue-counter-btn" style="padding: 8px 16px; background: #42b883; color: white; border: none; border-radius: 4px; cursor: pointer;">
            点击计数: 0
          </button>
        </div>
      </div>
    `;

    // 绑定事件（unmount 时需要随容器一起清理）
    let count = 0;
    const btn = appInstance.querySelector('#vue-counter-btn');
    btn.addEventListener('click', () => {
      count++;
      btn.textContent = `点击计数: ${count}`;
    });

    container.appendChild(appInstance);
    console.log('[app-vue] mount 完成');
  }

  /**
   * unmount — 卸载，清理所有 DOM 和副作用（每次切走时执行）
   * @param {Object} props
   * @param {Element} props.container - 挂载时使用的容器
   */
  async function unmount({ container }) {
    console.log('[app-vue] unmount: 清理 Vue 应用');

    // 清理 DOM（Vue 的 app.unmount() 做的就是这件事）
    if (appInstance) {
      container.removeChild(appInstance);
      appInstance = null;
    }

    console.log('[app-vue] unmount 完成');
  }

  // 将生命周期函数挂载到 window，遵守微前端框架约定
  // 框架加载脚本后，会从 window['app-vue'] 上读取这些函数
  window['app-vue'] = { bootstrap, mount, unmount };
})();
