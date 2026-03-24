/**
 * app-react/index.js — 模拟 React 子应用
 *
 * 同样是纯 JS 模拟，目的是展示微前端对框架无关性：
 * 无论子应用内部用什么框架，只要遵守生命周期协议，框架就能调度它。
 */

(function () {
  let appInstance = null;
  let intervalId = null; // 用于演示"副作用清理"的重要性

  async function bootstrap() {
    console.log('[app-react] bootstrap: 初始化 React 应用（只执行一次）');
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('[app-react] bootstrap 完成');
  }

  async function mount({ container }) {
    // 写入同名全局变量——沙箱生效时，这个值只存在于 app-react 的 fakeWindow 中，
    // 与 app-vue 写的 window.__APP_NAME__ 互不干扰
    window.__APP_NAME__ = 'app-react';
    console.log('[app-react] mount: 渲染 React 应用到容器', window.__APP_NAME__);

    // ─── CSS 隔离演示 ────────────────────────────────────────────────────────
    // 故意设置 h2 为蓝色，与主应用的"h2 { color: red }"形成冲突。
    // Shadow DOM 隔离生效时，React 子应用的蓝色不会泄漏，Vue 子应用的绿色也不会影响这里。
    const style = document.createElement('style');
    style.textContent = `
      h2 {
        color: #61dafb;   /* 蓝色，React 品牌色 */
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 20px;
      }
      .app-react-root {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
    `;
    container.appendChild(style);
    // ────────────────────────────────────────────────────────────────────────

    appInstance = document.createElement('div');
    appInstance.className = 'app-react-root';

    appInstance.innerHTML = `
      <div style="padding: 20px; background: #fff4f4; border-radius: 8px; border-left: 4px solid #61dafb;">
        <h2 style="margin: 0 0 10px 0;">⚛️ React 子应用</h2>
        <p style="margin: 0; color: #555;">这里是 React 子应用的内容区域。</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; background: #fce8e8; padding: 6px 10px; border-radius: 4px;">
          🔒 JS 沙箱验证：<code>window.__APP_NAME__ = "${window.__APP_NAME__}"</code>
          <br><small style="color:#888;">沙箱生效时此值为 "app-react"，与 Vue 子应用互不干扰</small>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; background: #d4edff; padding: 6px 10px; border-radius: 4px;">
          🎨 CSS 隔离验证：此 h2 颜色由子应用内部的 &lt;style&gt; 控制（蓝色 #61dafb）
          <br><small style="color:#888;">主应用设置了 h2 { color: red }，若隔离生效则此处不受影响</small>
        </p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">
          实时时钟（演示副作用清理）：<span id="react-clock"></span>
        </p>
        <p style="margin: 8px 0 0 0; color: #888; font-size: 14px;">
          ⚠️ 切换到 Vue 子应用时，这个 setInterval 会被正确清理
        </p>
      </div>
    `;

    container.appendChild(appInstance);

    // 启动定时器（这是一个副作用，必须在 unmount 时清理！）
    const clockEl = appInstance.querySelector('#react-clock');
    intervalId = setInterval(() => {
      clockEl.textContent = new Date().toLocaleTimeString();
    }, 1000);
    clockEl.textContent = new Date().toLocaleTimeString();

    console.log('[app-react] mount 完成，定时器已启动');
  }

  async function unmount({ container }) {
    console.log('[app-react] unmount: 清理 React 应用');

    // 关键：清理副作用（如果忘记清理，即使切走后定时器仍在后台运行）
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('[app-react] 定时器已清理');
    }

    if (appInstance) {
      container.removeChild(appInstance);
      appInstance = null;
    }

    console.log('[app-react] unmount 完成');
  }

  window['app-react'] = { bootstrap, mount, unmount };
})();
