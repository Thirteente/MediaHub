# v0.1 网页播放方案

MediaHub 的第一版服务同一家庭网络内的手机和 PC。用一部电影和一个多集系列验证找片、详情、选集、播放和换集。投屏是后续交付，沿用网页播放器的状态和媒体地址。[开发计划](plan.md) · [手机投屏方案](casting.md)

## 页面与导航

使用 Vite、React 和 TypeScript。页面由 React Router 的 HashRouter 管理，使用站点根路径部署。静态服务器收到的页面请求始终指向根目录，直接打开或刷新详情与播放页面也能工作。

| 地址 | 行为 |
| --- | --- |
| `/#/` | 首页显示推荐影片、最近一次未完成播放、分类筛选和搜索框。`type=movie` 或 `type=series` 可与搜索一起使用。搜索显示名、原标题和别名，去除首尾空白并统一 Unicode 形式与大小写后做包含匹配。空查询显示全部，无匹配显示提示和清除入口。 |
| `/#/?q=钢铁之泪` | 片名搜索状态写入地址。打开详情后返回片库时恢复搜索和分类，支持刷新和分享同网段地址。 |
| `/#/title/:workId` | 电影显示影片信息和播放入口。系列按季展示实际收录的集，集卡链接到对应播放页。未知影片 ID 显示影片找不到并提供返回入口。 |
| `/#/watch/:contentId` | 电影或剧集共用播放器。剧集显示所属季、集号、剧集列表及实际存在的下一集。未知播放 ID 显示该内容找不到并提供返回入口。 |

首版页面使用同一套组件与数据。手机竖屏时搜索框、片卡、季与集列表和播放器能在视口内操作。PC 上播放器和详情随内容区伸展，搜索、播放和选集都能用键盘访问。

## 本地片库数据

将样本元数据放在 `src/data/catalog.json`。由内容 ID 建索引，搜索只匹配影片和系列条目。页面从同一数据读取显示名称和播放地址。封面作为可选的本地资源，未配置时显示统一的占位样式。首批封面取自 Blender Studio 正片，提取单帧并缩放为 JPEG。电影封面来自《Tears of Steel》约 5:20，系列封面来自《Llamigos》约 0:24，两张均沿用正片的 CC BY 4.0 许可和 Blender Studio 署名。[电影素材](https://studio.blender.org/projects/api/assets/42/?site_context=featured_artwork) · [系列素材](https://studio.blender.org/projects/api/assets/2417/?site_context=featured_artwork)

| 层级 | 字段 |
| --- | --- |
| 影片或系列 | `id`、`type`（`movie` 或 `series`）、`title`、`originalTitle`、`aliases`、`summary`、可选的 `year`、`genre`、`durationMinutes`、`poster`、`backdrop` 和 `artworkCredit` |
| 电影 | 公共字段和 `media`。电影的作品 ID 同时是播放 ID。 |
| 系列 | 公共字段和 `seasons`。每季有数字 `number` 和 `episodes`。 |
| 单集 | `id`、数字 `number`、`title`、`media` 和可选的 `thumbnail`。集号沿用官方编号。 |
| 媒体 | `url`、`mimeType` 和署名所需的 `credit`、`sourceUrl`、`licenseUrl`，转码或剪辑时可填 `changes`。首批统一为 `video/mp4`，使用同源 `/media/` 路径。 |

| 条目 | 作品 ID | 播放 ID | 服务路径 |
| --- | --- | --- | --- |
| 《Tears of Steel》 | `tears-of-steel` | `tears-of-steel` | `/media/tears-of-steel.mp4` |
| 《Caminandes》第一季第 2 集 | `caminandes` | `caminandes-02` | `/media/caminandes-02.mp4` |
| 《Caminandes》第一季第 3 集 | `caminandes` | `caminandes-03` | `/media/caminandes-03.mp4` |

站内将《Caminandes》样本归入第 1 季，保留官方集号。所有影片和单集的播放 ID 在片库内唯一，同季内集号唯一。查找下一集时按季号和集号排序，从实际收录的剧集取下一项。当前样本从第 2 集切到第 3 集，最后一集仍可通过列表选集或返回详情。首批授权和署名按片源方案维护。播放页从当前媒体数据渲染署名、原始来源和授权链接。[片源方案](media-sources.md)

## 播放器行为

- 使用原生 `<video controls playsInline preload="metadata">`，由用户触发开播。播放、暂停、拖动进度和全屏沿用浏览器控件。
- 当前播放快照提供 `contentId`、绝对 `mediaUrl`、以秒计的 `currentTime` 和播放状态。状态覆盖加载中、可播放、播放中、暂停、结束和错误，进度使用媒体元素的实际值。
- 由媒体事件更新状态。换集时用新播放 ID 和新媒体地址重建播放器，从新片的零进度开始，可通过原生控件开播。旧视频的进度与错误状态随播放器卸载。
- 媒体文件缺失、连接错误或浏览器无法解码时提示「视频暂时无法播放」，提供重试入口和返回详情入口。重试重新加载当前媒体。
- 播放器维护当前播放快照，供投屏复用。同一浏览器通过本地存储记录最近一次未看完的内容。由首页「继续观看」进入时定位到保存的时间，普通播放链接和换集从零开始。播放到结尾时清除该条记录，浏览器禁用存储时仍可正常观看。账号和跨设备同步留作后续需求。

## 家庭网络运行

1. 初始化 Vite 的 React + TypeScript 工程，保留 `dev`、`build` 和 `preview` 脚本并提交 npm 锁文件。在 `.gitignore` 登记 `public/media/`，再按片源方案准备样本。后续在新环境用 `npm ci` 安装锁定依赖。
2. 用 `npm run dev -- --host 0.0.0.0` 启动开发服务。开发电脑打开终端给出的 Local 地址，手机和其他 PC 在同一家庭网络用 Network 地址打开。Windows 开发电脑对家庭专用网络开放实际使用的端口。
3. 用 `npm run build` 产出 `dist/`，用 `npm run preview -- --host 0.0.0.0` 检查构建产物。Vite 默认会把 `public/media/` 复制到构建目录。家庭日常试用由一台可常开的家庭电脑或 NAS 静态托管 `dist/`，网页和视频使用同一个地址与端口。
4. 从手机或另一台同网 PC 请求三条 `/media/` 路径。媒体响应应是 `video/mp4`，带 `Range` 的请求应收到 `206 Partial Content`，浏览器能拖到已缓冲区之外。局域网验收先用 HTTP，投屏阶段根据所选协议确认 HTTPS 和接收端的访问要求。

## 开发与验收顺序

| 步骤 | 实现与验收 |
| --- | --- |
| 1. 准备样本 | 样本文件名与 URL 对齐，手机和 PC 均能开播三个文件并跳转至中间位置。保留来源记录。 |
| 2. 搭建片库 | 能搜到影片和系列。测试一条英文搜索、一条中文或别名搜索、一条无结果搜索，以及打开详情再返回时还原搜索。 |
| 3. 接播放器 | 电影能直接进入播放页。剧集能从详情打开第 2 集并切到第 3 集，内容和地址均正确。试验暂停、拖动和全屏，并通过临时缺失媒体检验错误反馈和重试。 |
| 4. 双端验收 | 用至少一台实际手机和一台 PC 重跑步骤 2、3，手机竖屏可完整操作。刷新详情页及播放页后仍对应原条目。记录系统、浏览器版本、测试日期、结果及未覆盖设备。 |

建议优先覆盖实际家庭设备。手机优先测 iOS Safari 或 Android Chrome，PC 优先测 Chrome 或 Edge。用实际设备和浏览器的组合验收全屏行为。

## 验收记录

2026 年 11 月 25 日，Windows Chrome 157 通过桌面 1366 px、模拟手机 390 px 和 320 px 三种视口的端到端检查。桌面使用生产构建预览，手机尺寸通过开发机的 Wi-Fi 网卡地址访问。

| 验收项 | 结果 |
| --- | --- |
| 搜索与导航 | 中英文、全角字符、别名、空结果和清除搜索通过。详情刷新、返回恢复搜索、浏览器后退和播放直达链接通过。 |
| 电影与剧集 | 三个样片均能从零开始播放、暂停、跳到中段并继续。第 2 集切到第 3 集后使用正确的媒体文件和零进度。桌面全屏通过。 |
| 异常与恢复 | 无效影片和播放链接显示返回入口。中断媒体请求后显示错误，恢复网络并重试可播放。 |
| 手机真机 | 待在实际手机浏览器验证家庭 Wi-Fi 访问、播放、拖动、全屏和换集。 |

2026 年 11 月 26 日，根据首次试用反馈更新了推荐首页、分类、详情和播放页布局。剧照继续使用官方正片截图，新增《Tears of Steel》约 6:58 和《Llamigos》约 1:53 的背景图，以及《Gran Dillama》约 0:27 的单集缩略图。图片提取并缩放为 JPEG，署名 Blender Studio，沿用 CC BY 4.0。[电影素材](https://studio.blender.org/projects/api/assets/42/?site_context=featured_artwork) · [第 2 集素材](https://studio.blender.org/projects/api/assets/2363/?site_context=featured_artwork) · [第 3 集素材](https://studio.blender.org/projects/api/assets/2417/?site_context=featured_artwork)

Windows Chrome 157 在 1440、390 和 320 px 下复测了推荐入口、分类和搜索组合、返回状态恢复、播放后刷新续播、普通播放从零开始、换集与当前集高亮。桌面全屏及媒体错误后重试通过。用户反馈此前试播播放正常，设备信息尚未记录。
