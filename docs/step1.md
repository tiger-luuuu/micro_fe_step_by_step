# 阶段一：微前端最小核心实现

## 模块结构

```
packages/
├── core/src/
│   ├── index.js      对外 API 入口
│   ├── registry.js   子应用注册表
│   ├── router.js     路由监听与调度
│   ├── lifecycle.js  生命周期管理
│   └── loader.js     脚本加载器
├── main-app/
│   ├── index.html    主应用页面
│   └── main.js       主应用入口
├── app-vue/
│   └── index.js      子应用 A
└── app-react/
    └── index.js      子应用 B
```

---

## 一、启动流程

主应用调用 `registerMicroApp` + `start()` 完成初始化。

```mermaid
flowchart TD
    A([主应用 main.js]) --> B["registerMicroApp(config) × N"]
    B --> C["registry.js\napps.push({ ...config, status: 'NOT_LOADED' })"]
    A --> D["start()"]
    D --> E["startRouter()"]
    E --> F["addEventListener('hashchange', reroute)"]
    E --> G["addEventListener('popstate', reroute)"]
    E --> H["patchHistoryMethods()\n劫持 pushState / replaceState"]
    E --> I["reroute()\n立即执行一次，处理初始路由"]
```

---

## 二、路由变化调度流程

每次 URL 发生变化，`reroute()` 被调用，决定挂载/卸载哪些子应用。

```mermaid
flowchart TD
    T([URL 变化触发]) --> T1{"变化来源"}
    T1 -->|"#hash 变化"| T2["hashchange 事件"]
    T1 -->|"前进/后退"| T3["popstate 事件"]
    T1 -->|"pushState / replaceState"| T4["猴子补丁拦截"]
    T2 & T3 & T4 --> R

    R["reroute()"] --> R1["getApps() 获取注册表"]
    R1 --> R2["遍历所有 app\n调用 isActive(app.activeRule)"]

    R2 --> R3["appsToActivate\n匹配当前路由的应用"]
    R2 --> R4["appsToUnmount\n不匹配且状态为 MOUNTED 的应用"]

    R4 --> U["Promise.all → unmountApp() × N\n并行卸载"]
    U --> V["app.status = 'NOT_MOUNTED'"]

    R3 --> W["for...of → activateApp()\n串行激活"]
```

---

## 三、子应用激活流程（activateApp）

首次激活需经历完整的加载→初始化→挂载链路；后续切回只需重新挂载。

```mermaid
flowchart TD
    A["activateApp(app)"] --> B{"app.status\n=== 'NOT_LOADED'?"}

    B -->|是：首次激活| C["app.status = 'LOADING'"]
    C --> D["loadApp(app)\n动态插入 script 标签\n请求 app.entry"]
    D --> D1{"脚本加载\n成功?"}
    D1 -->|否| ERR1(["抛出错误"])
    D1 -->|是| D2["从 window[app.name]\n读取生命周期对象\n存入 app.lifecycle"]
    D2 --> E["bootstrapApp(app)"]
    E --> E1["app.status = 'BOOTSTRAPPING'"]
    E1 --> E2["await app.lifecycle.bootstrap()"]
    E2 --> E3["app.status = 'NOT_MOUNTED'"]

    B -->|否：已加载过| F

    E3 --> F{"app.status\n=== 'NOT_MOUNTED'?"}
    F -->|是| G["mountApp(app)"]
    F -->|否| END2(["跳过，无需操作"])

    G --> G1["app.status = 'MOUNTING'"]
    G1 --> G2["document.querySelector(app.container)\n获取容器 DOM"]
    G2 --> G3{"容器存在?"}
    G3 -->|否| ERR2(["抛出错误"])
    G3 -->|是| G4["await app.lifecycle.mount\n({ container, name })"]
    G4 --> G5["app.status = 'MOUNTED'"]
    G5 --> END(["激活完成"])
```

---

## 四、子应用卸载流程（unmountApp）

```mermaid
flowchart TD
    A["unmountApp(app)"] --> B["app.status = 'UNMOUNTING'"]
    B --> C["document.querySelector(app.container)\n获取容器 DOM"]
    C --> D["await app.lifecycle.unmount\n({ container, name })"]
    D --> E["app.status = 'NOT_MOUNTED'"]
    E --> F(["卸载完成\n子应用清理自身 DOM 和副作用"])
```

---

## 五、子应用状态机

```mermaid
stateDiagram-v2
    [*] --> NOT_LOADED : registerMicroApp()

    NOT_LOADED --> LOADING : activateApp() 首次
    LOADING --> BOOTSTRAPPING : loadApp() 完成
    BOOTSTRAPPING --> NOT_MOUNTED : bootstrap() 完成

    NOT_MOUNTED --> MOUNTING : mountApp()
    MOUNTING --> MOUNTED : mount() 完成

    MOUNTED --> UNMOUNTING : unmountApp()
    UNMOUNTING --> NOT_MOUNTED : unmount() 完成

    LOADING --> [*] : 加载失败
    BOOTSTRAPPING --> [*] : bootstrap 失败
    MOUNTING --> [*] : mount 失败
    UNMOUNTING --> [*] : unmount 失败
```

---

## 六、模块依赖关系

```mermaid
flowchart LR
    main["main-app/main.js"]
    index["core/index.js"]
    registry["core/registry.js"]
    router["core/router.js"]
    lifecycle["core/lifecycle.js"]
    loader["core/loader.js"]
    appVue["app-vue/index.js"]
    appReact["app-react/index.js"]

    main -->|"import registerMicroApp, start"| index
    index -->|"import registerMicroApp"| registry
    index -->|"import startRouter"| router
    router -->|"import getApps"| registry
    router -->|"import activateApp, unmountApp"| lifecycle
    lifecycle -->|"import loadApp"| loader
    loader -.->|"动态 script 加载\n写入 window[name]"| appVue
    loader -.->|"动态 script 加载\n写入 window[name]"| appReact
```

> 实线 = 静态 import，虚线 = 运行时动态加载
