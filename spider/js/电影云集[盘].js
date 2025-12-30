/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 1,
  title: '电影云集',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
    类型: '影视',
    title: '电影云集',
    host: 'https://dyyjpro.com',
    url: '/',
    homeUrl: '/',
    searchUrl: '/?cat=&s=**',
    timeout: 10000,
    searchable: 1,
    quickSearch: 1,
    class_name: '电影&剧集&动漫&综艺&短剧&学习&读物&音频',
    class_url: 'dianying&%e5%89%a7%e9%9b%86&dongman&zongyi&%e7%9f%ad%e5%89%a7&xuexi&%e8%af%bb%e7%89%a7&%e9%9f%b3%e9%a2%91',
    sniffer: false,
    play_parse: true,
    limit: 20,
    double: false,
    图片: 'https://picsum.photos/300/400',
    headers: {
        'User-Agent': 'Mozilla/5.0'
    },
    
    一级: async function(tid, pg) {
        try {
            let url = `${this.host}/category/${tid}`;
            if (pg > 1) url += `/page/${pg}`;
            let html = await request(url);
            let list = pdfa(html, ".post-item") || [];
            let videos = list.map(item => {
                let href = pdfh(item, "a&&href");
                let title = pdfh(item, "a&&title");
                let pic = pdfh(item, ".media-img&&data-bg") || pdfh(item, "img&&src");
                
                if (!href.startsWith('http')) {
                    href = href.startsWith('/') ? `${this.host}${href}` : `${this.host}/${href}`;
                }
                if (pic && !pic.startsWith('http')) {
                    pic = pic.startsWith('/') ? `${this.host}${pic}` : `${this.host}/${pic}`;
                }
                
                return {
                    vod_id: href,
                    vod_name: title || '未知标题',
                    vod_pic: pic || this.图片,
                    vod_remarks: '',
                    vod_content: title || '未知内容'
                };
            }).filter(video => video.vod_id && video.vod_name);
            
            return videos.slice(0, this.limit);
        } catch (e) {
            console.log("一级分类解析错误:", e.message);
            return [];
        }
    },
    
    二级: async function(ids) {
        try {
            let id = Array.isArray(ids) ? ids[0] : ids;
            let detailUrl = id.startsWith('http') ? id : `${this.host}${id.startsWith('/') ? '' : '/'}${id}`;
            let html = await request(detailUrl);
            
            let title = (pdfh(html, 'h1&&Text') || '未知标题').replace(/<[^>]+>/g, '').trim();
            let content = pdfh(html, '.post-content p:eq(0)&&Text') || title;
            let allLinks = new Set();
            
            // 提取所有a标签中的百度和夸克网盘链接
            (pdfa(html, 'a') || []).forEach(btn => {
                let link = pdfh(btn, 'a&&href');
                if (link && (link.includes('pan.baidu.com') || link.includes('pan.quark.cn'))) {
                    allLinks.add(link);
                }
            });
            
            let allLines = [];
            let baiduLinksFromSet = Array.from(allLinks).filter(l => l.includes('pan.baidu.com'));
            let quarkLinksFromSet = Array.from(allLinks).filter(l => l.includes('pan.quark.cn'));
            
            // 处理百度网盘链接
            if (baiduLinksFromSet.length > 0) {
                try {
                    let allBaiduVideos = [];
                    for (let link of baiduLinksFromSet) {
                        let baiduData = await Baidu2.getShareData(link);
                        if (baiduData && typeof baiduData === 'object') {
                            for (let key in baiduData) {
                                let videos = baiduData[key];
                                if (Array.isArray(videos) && videos.length > 0) {
                                    allBaiduVideos.push(...videos.map(v => `${v.name}$${[v.path, v.uk, v.shareid, v.fsid].join('*')}`));
                                }
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    if (allBaiduVideos.length > 0) {
                        allLines.push({name: '百度', url: allBaiduVideos.join('#')});
                    }
                } catch (e) {
                    console.log("百度网盘解析失败:", e.message);
                    allLines.push({name: '百度', url: '解析失败$#'});
                }
            }
            
            // 处理夸克网盘链接
            if (quarkLinksFromSet.length > 0) {
                try {
                    let allQuarkVideos = [];
                    for (let link of quarkLinksFromSet) {
                        let shareData = await Quark.getShareData(link);
                        if (shareData) {
                            let videos = await Quark.getFilesByShareUrl(shareData);
                            if (Array.isArray(videos) && videos.length > 0) {
                                allQuarkVideos.push(...videos.map(v => `${v.file_name}$${[shareData.shareId, v.stoken, v.fid, v.share_fid_token].join('*')}`));
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    if (allQuarkVideos.length > 0) {
                        allLines.push({name: '夸克', url: allQuarkVideos.join('#')});
                    }
                } catch (e) {
                    console.log("夸克网盘解析失败:", e.message);
                    allLines.push({name: '夸克', url: '解析失败$#'});
                }
            }
            
            let [playFrom, playUrl] = allLines.length > 0 ? 
                [allLines.map(l => l.name).join('$$$'), allLines.map(l => l.url).join('$$$')] : 
                ['无资源', '暂无资源$#'];
            
            let vod_pic = this.图片;
            let picMatch = /<meta[^>]*property="og:image"[^>]*content="([^"]*)"|<img[^>]*class="[^\"]*wp-post-image[^\"]*"[^>]*src="([^"]+)"/i.exec(html);
            if (picMatch) {
                let img_url = picMatch[1] || picMatch[2];
                if (img_url && !img_url.startsWith('data:')) {
                    if (!img_url.startsWith('http')) {
                        img_url = img_url.startsWith('/') ? `${this.host}${img_url}` : `${this.host}/${img_url}`;
                    }
                    vod_pic = img_url;
                }
            }
            
            return {
                vod_name: title,
                vod_pic: vod_pic,
                vod_content: content,
                vod_remarks: `${allLines.length > 0 ? `共${allLines.length}个网盘源` : '暂无网盘资源'}`,
                vod_play_from: playFrom,
                vod_play_url: playUrl
            };
        } catch (e) {
            console.log("二级分类解析错误:", e.message);
            return {
                vod_name: '未知标题',
                vod_pic: this.图片,
                vod_content: `加载详情页失败：${e.message}`,
                vod_remarks: '',
                vod_play_from: '无资源',
                vod_play_url: '暂无资源$#'
            };
        }
    },
    
    搜索: async function(wd, quick, pg) {
        try {
            let encoded_key = encodeURIComponent(wd);
            let search_url = `${this.host}/?cat=&s=${encoded_key}`;
            if (pg > 1) {
                search_url = `${this.host}/page/${pg}?cat=&s=${encoded_key}`;
            }
            let html = await request(search_url);
            let list = pdfa(html, ".post-item") || [];
            let videos = list.map(item => {
                let href = pdfh(item, "a&&href");
                let title = pdfh(item, "a&&title");
                let pic = pdfh(item, ".media-img&&data-bg") || pdfh(item, "img&&src");
                
                if (!href.startsWith('http')) {
                    href = href.startsWith('/') ? `${this.host}${href}` : `${this.host}/${href}`;
                }
                if (pic && !pic.startsWith('http')) {
                    pic = pic.startsWith('/') ? `${this.host}${pic}` : `${this.host}/${pic}`;
                }
                
                return {
                    vod_id: href,
                    vod_name: title || '未知标题',
                    vod_pic: pic || this.图片,
                    vod_remarks: '',
                    vod_content: title || '未知内容'
                };
            }).filter(video => video.vod_id && video.vod_name);
            
            return videos;
        } catch (e) {
            console.log("搜索解析错误:", e.message);
            return [];
        }
    },
    
    lazy: async function(flag, id) {
        try {
            if (flag.includes('百度')) {
                let ids = id.split('*');
                if (ids.length < 4) return {parse: 1, url: id, header: this.headers};
                
                let url = await Baidu2.getAppShareUrl(ids[0], ids[1], ids[2], ids[3]);
                let urls = [
                    "原画", `${url}#isVideo=true##fastPlayMode##threads=10#`,
                    "原代本", `http://127.0.0.1:7777/?thread=${ENV.get('thread') || 6}&form=urlcode&randUa=1&url=${encodeURIComponent(url)}`
                ];
                return {
                    parse: 0,
                    url: urls,
                    header: {"User-Agent": 'netdisk;P2SP;2.2.91.136;android-android;'}
                };
            }
            
            if (flag.includes('夸克')) {
                let ids = id.split('*');
                let down = await Quark.getDownload(ids[0], ids[1], ids[2], ids[3], true);
                let headers = {
                    'Cookie': ENV.get('quark_cookie')
                };
                
                let urls = [];
                down.forEach((t) => {
                    if(t.url!==undefined){
                        urls.push(t.name, t.url+ "#isVideo=true##fastPlayMode##threads=20#")
                        urls.push("猫"+t.name, `http://127.0.0.1:5575/proxy?thread=${ENV.get('thread') || 6}&chunkSize=1024&url=` + encodeURIComponent(t.url));
                    }
                });
                
                try {
                    let transcoding = (await Quark.getLiveTranscoding(ids[0], ids[1], ids[2], ids[3])).filter(t => t.accessable);
                    transcoding.sort((a, b) => {
                        const resMap = {'4K': 3840, '2160P': 3840, 'UHD': 3840, '2K': 2560, '1440P': 2560, 'QHD': 2560, '1080P': 1920, 'FHD': 1920, '720P': 1280, 'HD': 1280, '540P': 960, 'SD': 960, '480P': 854, '360P': 640};
                        return (resMap[b.resolution?.toUpperCase() || ''] || 0) - (resMap[a.resolution?.toUpperCase() || ''] || 0);
                    });
                    
                    transcoding.forEach(t => {
                        let qualityName = t.resolution === 'low' ? "流畅" : t.resolution === 'high' ? "高清" : t.resolution === 'super' ? "超清" : t.resolution;
                        urls.push(qualityName, t.video_info.url+ "#isVideo=true##fastPlayMode##threads=20#");
                    });
                } catch (e) {}
                
                return {parse: 0, url: urls, header: headers};
            }
            
            return {parse: 0, url: id, header: this.headers};
        } catch (error) {
            console.log("播放解析错误:", error.message);
            return {parse: 1, url: id, header: this.headers};
        }
    }
};