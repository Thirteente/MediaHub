# 片源收集与验收

第一版为家庭局域网准备一部独立短片和两集同系列动画。用三份真实媒体先验证手机和 PC 播放、选集及下一集，网页验收后再用于电视投屏。[项目总计划](plan.md) · [Web 第一版设计](web-mvp.md)

## 首批片源

- **《Tears of Steel》**，Blender Studio 真人科幻短片。将官方 800p MP4 存为 `public/media/tears-of-steel.mp4`，站内路径为 `/media/tears-of-steel.mp4`。[作品页](https://studio.blender.org/projects/tears-of-steel/) · [正片与许可](https://studio.blender.org/projects/api/assets/42/?site_context=featured_artwork) · [官方下载](https://studio.blender.org/download-source/files/0d/0d4beb382f57cec10fa3e54c13c5c02e24e53f02/0d4beb382f57cec10fa3e54c13c5c02e24e53f02.mp4)
- **《Caminandes》第 2 集《Gran Dillama》**。将官方 1080p MP4 存为 `public/media/caminandes-02.mp4`，站内路径为 `/media/caminandes-02.mp4`。[作品页](https://studio.blender.org/projects/caminandes-2/) · [正片与许可](https://studio.blender.org/projects/api/assets/2363/?site_context=featured_artwork) · [官方下载](https://studio.blender.org/download-source/files/ff/ff0cd0946c500c32da78c8f3101b02eb670df72c/ff0cd0946c500c32da78c8f3101b02eb670df72c.mp4)
- **《Caminandes》第 3 集《Llamigos》**。将官方 1080p MP4 存为 `public/media/caminandes-03.mp4`，站内路径为 `/media/caminandes-03.mp4`。[作品页](https://studio.blender.org/projects/caminandes-3/) · [正片与许可](https://studio.blender.org/projects/api/assets/2417/?site_context=featured_artwork) · [官方下载](https://studio.blender.org/download-source/files/26/263f328078fbebd508a0d3262f4fb4da5f16439f/263f328078fbebd508a0d3262f4fb4da5f16439f-1080p.mp4)

2026 年 11 月 24 日，已核对上述三份正片的官方素材页均标注 **CC BY 4.0**，官方下载路径均对字节范围请求返回 HTTP `206` 和 `video/mp4`。本地下载、编码检查和设备验收状态见下方记录。站内保留第 2、3 集的原始编号。[CC BY 4.0 许可](https://creativecommons.org/licenses/by/4.0/)

Blender Studio 播放器使用的媒体地址带有时效签名。收集时从上述官方下载入口取文件，站内播放和投屏使用 MediaHub 的稳定地址。播放页列出当前正片的片名、Blender Studio 署名、对应原始素材页和 CC BY 4.0 许可链接。保留随片版权和署名信息，如有转码或裁剪则标注改动。

## 下载和本地验证

1. 在仓库根目录执行 `git check-ignore public/media/tears-of-steel.mp4`，确认忽略规则已生效，再创建媒体目录。把每个官方文件先下载到临时路径，确认完整后再按上面的文件名移入。若官方下载地址变更，从对应正片与许可页面重新获取当前入口。
2. 用 `ffprobe` 检查每个文件的时长、视频和音频编码。优先使用 MP4 封装的 H.264 视频和 AAC 音频。保留能在目标设备播放的原始文件，按实机兼容情况转码。
3. 启动 Web 服务，在手机和 PC 上打开三个局域网媒体地址。确认媒体响应为 `video/mp4`，Range 请求返回 `206` 及有效的 `Content-Range`。
4. 在手机和 PC 上逐个开播样本并拖到未缓冲的位置。播放页接通后，用同一批媒体复验从第 2 集切到第 3 集。记录浏览器、设备型号与结果。v0.2 再验证电视能取流，并按投屏方案实测起播、暂停、跳转和换集。[手机投屏方案](casting.md)

下面用 PowerShell 下载并检查《Tears of Steel》。确认本机已有 FFmpeg 的 `ffprobe`，再用同样方式处理另外两份素材。

```powershell
New-Item -ItemType Directory -Path 'public/media' -Force | Out-Null
$mediaHubDownload = Join-Path $env:TEMP 'mediahub-tears-of-steel.mp4'
$mediaHubSource = 'https://studio.blender.org/download-source/files/0d/0d4beb382f57cec10fa3e54c13c5c02e24e53f02/0d4beb382f57cec10fa3e54c13c5c02e24e53f02.mp4'
curl.exe --fail --location --retry 2 --output $mediaHubDownload $mediaHubSource
if ($LASTEXITCODE -ne 0) { throw '下载失败，请检查官方下载入口。' }
ffprobe -v error -show_entries 'format=duration:stream=codec_type,codec_name' $mediaHubDownload
if ($LASTEXITCODE -ne 0) { throw '媒体检查失败，请重新下载或检查文件。' }
Move-Item -LiteralPath $mediaHubDownload -Destination 'public/media/tears-of-steel.mp4'
```

服务启动后，将下例中的地址替换为实际的局域网 Web 服务地址。

```powershell
curl.exe --fail --range 0-63 --dump-header - --output NUL 'http://192.168.1.10:5173/media/tears-of-steel.mp4'
```

## 扩充片源

- **《大雄兔》（Big Buck Bunny，2008）**，Blender Foundation 的动画短片。当前使用官方 1080p 版，保留 H.264 画面，将第一个音轨从 MP3 转为 AAC，并将 MP4 索引移到文件开头。成品时长约 10:35，保存为 `public/media/big-buck-bunny.mp4`。页面标注音轨改动，授权为 CC BY 3.0，署名 Blender Foundation。封面和背景取自官方 320 × 180 版的约 6:07 与 1:38，提取单帧并保存为 JPEG。[官方项目与许可](https://peach.blender.org/about/) · [官方 1080p 下载](https://download.blender.org/demo/movies/BBB/bbb_sunflower_1080p_30fps_normal.mp4.zip) · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

解压官方 1080p 归档，在有 FFmpeg 的环境执行以下命令。

```powershell
ffmpeg -i bbb_sunflower_1080p_30fps_normal.mp4 -map 0:v:0 -map 0:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart public/media/big-buck-bunny.mp4
```

也可直接使用官方 320 × 180 H.264/AAC 原版进行试播。使用该版本时，按实际时长调整目录信息并移除播放页的音轨改动说明。[官方 320 × 180 下载](https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4.zip)

`/media/big-buck-bunny.mp4` 由本地同源服务器提供。下载的归档及 MP4 保存在本地，Git 跟踪片库信息和有授权的剧照。

- **《辛特尔》（Sintel，2010）**，Blender Studio 的奇幻动画短片，也可以搜索「寻龙记」。将官方 544p 原版 MP4 保存为 `public/media/sintel.mp4`，站内路径为 `/media/sintel.mp4`。画面为 1280 × 544，H.264 视频、AAC 音频，时长约 14:48。封面和背景分别取自约 3:10 与 5:40，提取单帧保存为 JPEG。正片和剧照署名 Blender Studio，按素材页的 CC BY 4.0 使用。[授权与素材](https://studio.blender.org/projects/api/assets/1191/?site_context=featured_artwork) · [官方下载](https://studio.blender.org/download-source/files/47/47a954682dbd4f064da7e78ad6c2d32f044a3e85/47a954682dbd4f064da7e78ad6c2d32f044a3e85.mp4)

## 检查已准备的媒体

在仓库根目录运行 `npm run media:check`。脚本按片库逐部、逐集检查本地媒体路径，列出缺失和空文件。所有文件就绪时退出码为 `0`，有缺项时退出码为 `1`。复查文件编码、时长和跳转见[下载和本地验证](#下载和本地验证)。

## 在线片源与后续收集

接入在线来源时，逐部逐集记录可在站内播放的媒体地址或播放接口、出处和授权范围，同时验证站内开播、拖动和移动端兼容性。元数据和官方观看入口用于查找与导流。只有实际可在站内播放的条目才显示站内播放入口。[接入在线片源 Issue #12](https://github.com/Thirteente/MediaHub/issues/12)

- **经典内容**优先从版权方、开放电影项目或档案馆选片。逐部、逐集记录作品和集数、来源页、原始媒体地址、许可与署名、可使用范围和最后校验日期。海报、字幕也按各自的来源和许可核对。
- **新片和新剧**先收集有明确许可的独立发行内容或官方开放片源。商业平台的影片在取得可用于站内播放的片源后接入。能确认官方观看入口的作品可提供外部链接。
- **元数据**第一版为这几部作品维护本地条目。目录扩大后可用 TMDB 补充海报、简介与分季分集信息，并按其条款署名。站内可播状态由 MediaHub 实际管理的片源决定。[TMDB API FAQ](https://developer.themoviedb.org/docs/faq)

## 网页阶段验收清单

- [x] 三份 MP4 均已完整下载、通过编码检查并按约定文件名放置。
- [x] 素材目录被 Git 忽略，目录条目留有来源、署名和许可记录。
- [x] 开发机用 Wi-Fi 网卡地址请求三个 `/media/` 文件，均收到了支持进度跳转的 Range 响应。
- [x] Windows Chrome 可播放、暂停、拖动并继续播放三个样本。
- [ ] 实际手机能通过家庭 Wi-Fi 播放和跳转三个样本。
- [x] 试播页显示当前样片的出处和授权，能从第 2 集切换到第 3 集。
- [x] 从正式详情和选集页验证三个样片能播放，并能从第 2 集切到第 3 集。设备范围见[网页验收记录](web-mvp.md#验收记录)。

## 验收记录

2026 年 11 月 25 日在 Windows 开发机上下载了三个官方原始 MP4。实际字节数均与官方下载服务器声明的大小一致。使用 `ffprobe` 检查确认三份均为 H.264 视频、AAC 音频。

| 文件 | 大小（字节） | 分辨率 | 时长 |
| --- | ---: | --- | --- |
| `tears-of-steel.mp4` | 505533124 | 1920 × 800 | 12:14 |
| `caminandes-02.mp4` | 116672105 | 1920 × 1080 | 2:26 |
| `caminandes-03.mp4` | 138945811 | 1920 × 1080 | 2:30 |

开发机通过 Wi-Fi 网卡的局域网地址请求三个文件，均收到 `206 Partial Content`、`Content-Type: video/mp4` 和与实际字节数一致的 `Content-Range`。本机生产构建和预览通过，三个文件的非零起点范围请求同样收到 `206`。Windows Chrome 157 在桌面和 390 px 模拟手机视口都能播放、暂停、跳到中段并继续播放三个样片。生产预览中模拟媒体请求中断，错误提示和重试恢复通过。手机实机仍需在家庭 Wi-Fi 下检查页面访问、开播和拖动。

2026 年 11 月 26 日新增《大雄兔》。1080p 本地文件为 253839659 字节，非零起点的媒体范围请求返回 HTTP `206`。Windows Chrome 157 在 1440、390、320 px 下均完成分类、别名搜索、剧照加载、开播、跳转到中段，以及查看许可和音轨改动。[扩库 Issue](https://github.com/Thirteente/MediaHub/issues/5)

2026 年 11 月 26 日加入《辛特尔》。本地 MP4 为 224702298 字节，与官方下载大小一致，FFmpeg 全片音视频解码通过。局域网媒体地址的非零起点范围请求返回 `206`。Windows Chrome 157 的桌面和 390 px 模拟手机视口通过分类、别名搜索、剧照、播放、跳转到中段和授权链接检查。`npm run media:check` 报告 5/5 就绪，另外用临时片库验证了缺失和空文件的非零退出码。[扩库 Issue #9](https://github.com/Thirteente/MediaHub/issues/9)
