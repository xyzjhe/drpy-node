/**
 * 夸克网盘处理工具
 * 
 * 提供夸克网盘分享链接解析、文件下载、流媒体播放等功能。
 * 支持分享链接解析、文件保存、直播转码、下载链接获取等核心功能。
 * 
 * 主要功能：
 * - 分享链接解析和文件列表获取
 * - 文件保存到个人网盘
 * - 直播转码和流媒体播放
 * - 文件下载链接获取
 * - 缓存管理和性能优化
 * - Cookie管理和自动刷新
 * 
 * @module QuarkPanHandler
 * @author drpy-node
 * @since 1.0.0
 */

import req from '../req.js';
import {ENV} from '../env.js';
import COOKIE from '../cookieManager.js';
import CryptoJS from "crypto-js";
import {join} from 'path';
import fs from 'fs';
import {PassThrough} from 'stream';

/**
 * 夸克网盘处理类
 * 
 * 负责处理夸克网盘的各种操作，包括分享链接解析、文件管理、
 * 流媒体播放、下载管理等功能。提供完整的夸克网盘API封装。
 */
class QuarkHandler {
    /**
     * 构造函数 - 初始化夸克网盘处理器
     * 
     * 设置基础配置参数，包括正则表达式、请求头、API地址、
     * 缓存配置等，为后续操作做准备。
     */
    constructor() {
        // 夸克分享链接正则表达式 - 用于匹配和解析分享链接
        this.regex = /https:\/\/pan\.quark\.cn\/s\/([^\\|#/]+)/;
        // 请求参数 - 标识客户端类型和来源
        this.pr = 'pr=ucpro&fr=pc';
        // 基础请求头 - 模拟官方客户端请求
        this.baseHeader = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
            Referer: 'https://pan.quark.cn',
        };
        // API基础URL - 夸克网盘API服务地址
        this.apiUrl = 'https://drive.quark.cn/1/clouddrive/';
        // 分享令牌缓存 - 缓存分享链接的访问令牌
        this.shareTokenCache = {};
        // 保存目录名称 - 在个人网盘中创建的保存目录名
        this.saveDirName = 'drpy';
        // 保存目录ID - 保存目录的唯一标识符
        this.saveDirId = null;
        // 保存文件ID缓存 - 缓存已保存文件的ID映射
        this.saveFileIdCaches = {};
        // 当前URL键 - 用于标识当前处理的URL
        this.currentUrlKey = '';
        // 缓存根目录 - 本地缓存文件的存储路径
        this.cacheRoot = (process.env['NODE_PATH'] || '.') + '/quark_cache';
        // 最大缓存大小 - 限制缓存文件的最大大小（100MB）
        this.maxCache = 1024 * 1024 * 100;
        // URL头部缓存 - 缓存HTTP头部信息以提高性能
        this.urlHeadCache = {};
        // 字幕文件扩展名 - 支持的字幕文件格式列表
        this.subtitleExts = ['.srt', '.ass', '.scc', '.stl', '.ttml'];
    }

    /**
     * 获取Cookie - 使用 getter 定义动态属性
     * 
     * 从环境变量中获取夸克网盘的Cookie信息，用于API认证。
     * 
     * @returns {string} 夸克网盘Cookie字符串
     */
    get cookie() {
        // console.log('env.cookie.quark:',ENV.get('quark_cookie'));
        return ENV.get('quark_cookie');
    }

    /**
     * 解析分享链接数据
     * 
     * 从夸克网盘分享链接中提取分享ID和文件夹ID等关键信息。
     * 支持带参数的链接解析，自动过滤查询参数。
     * 
     * @param {string} url - 夸克网盘分享链接
     * @returns {Object|null} 分享数据对象
     * @returns {string} returns.shareId - 分享链接的唯一标识符
     * @returns {string} returns.folderId - 文件夹ID（默认为根目录'0'）
     * 
     * @example
     * const shareData = getShareData('https://pan.quark.cn/s/abc123def456');
     * // 返回: { shareId: 'abc123def456', folderId: '0' }
     */
    getShareData(url) {
        let matches = this.regex.exec(url);
        // 处理带查询参数的链接，移除参数部分
        if (matches.indexOf("?") > 0) {
            matches = matches.split('?')[0];
        }
        if (matches) {
            return {
                shareId: matches[1],    // 提取分享ID
                folderId: '0',          // 默认为根目录
            };
        }
        return null;
    }

    /**
     * 初始化夸克网盘
     * 
     * 初始化夸克网盘处理器，检查Cookie有效性并进行必要的配置。
     * 
     * @param {Object} db - 数据库对象（用于存储配置和缓存）
     * @param {Object} cfg - 配置对象（包含各种设置参数）
     * @returns {Promise<void>}
     */
    async initQuark(db, cfg) {
        if (this.cookie) {
            console.log("cookie 获取成功");
        } else {
            console.log("cookie 获取失败")
        }
    }

    /**
     * 最长公共子序列算法（LCS）
     * 
     * 计算两个字符串之间的最长公共子序列，用于文件名匹配和相似度计算。
     * 采用动态规划算法实现，时间复杂度为O(m*n)。
     * 
     * @param {string} str1 - 第一个字符串
     * @param {string} str2 - 第二个字符串
     * @returns {Object} LCS结果对象
     * @returns {number} returns.length - 最长公共子序列的长度
     * @returns {string} returns.sequence - 最长公共子序列的内容
     * @returns {number} returns.offset - 子序列在第一个字符串中的起始位置
     * 
     * @example
     * const result = lcs('hello world', 'hello earth');
     * // 返回: { length: 7, sequence: 'hello ', offset: 0 }
     */
    lcs(str1, str2) {
        // 参数验证：检查输入字符串的有效性
        if (!str1 || !str2) {
            return {
                length: 0,
                sequence: '',
                offset: 0,
            };
        }
        
        var sequence = '';              // 存储最长公共子序列
        var str1Length = str1.length;   // 第一个字符串长度
        var str2Length = str2.length;   // 第二个字符串长度
        var num = new Array(str1Length); // 动态规划数组
        var maxlen = 0;                 // 最大长度
        var lastSubsBegin = 0;          // 上一个子序列开始位置
        
        // 初始化二维数组 - 用于存储LCS计算结果
        for (var i = 0; i < str1Length; i++) {
            var subArray = new Array(str2Length);
            for (var j = 0; j < str2Length; j++) {
                subArray[j] = 0;
            }
            num[i] = subArray;
        }
        
        var thisSubsBegin = null;       // 当前子序列开始位置
        
        // 动态规划计算LCS
        for (i = 0; i < str1Length; i++) {
            for (j = 0; j < str2Length; j++) {
                if (str1[i] !== str2[j]) {
                    // 字符不匹配，LCS长度为0
                    num[i][j] = 0;
                } else {
                    // 字符匹配，计算LCS长度
                    if (i === 0 || j === 0) {
                        num[i][j] = 1;
                    } else {
                        num[i][j] = 1 + num[i - 1][j - 1];
                    }

                    // 更新最长公共子序列
                    if (num[i][j] > maxlen) {
                        maxlen = num[i][j];
                        thisSubsBegin = i - num[i][j] + 1;
                        if (lastSubsBegin === thisSubsBegin) {
                            sequence += str1[i];
                        } else {
                            lastSubsBegin = thisSubsBegin;
                            sequence = ''; // 清空序列
                            sequence += str1.substr(lastSubsBegin, i + 1 - lastSubsBegin);
                        }
                    }
                }
            }
        }
        
        return {
            length: maxlen,
            sequence: sequence,
            offset: thisSubsBegin,
        };
    }

    /**
     * 查找最佳LCS匹配
     * 
     * 在目标项目数组中查找与主要项目最相似的项目，
     * 基于最长公共子序列算法计算相似度。
     * 
     * @param {Object} mainItem - 主要项目对象
     * @param {string} mainItem.name - 主要项目的名称
     * @param {Array} targetItems - 目标项目数组
     * @param {string} targetItems[].name - 目标项目的名称
     * @returns {Object} 最佳匹配结果
     * @returns {Array} returns.allLCS - 所有LCS计算结果
     * @returns {Object} returns.bestMatch - 最佳匹配项目
     * @returns {number} returns.bestMatchIndex - 最佳匹配项目的索引
     * 
     * @example
     * const mainItem = { name: 'movie.mp4' };
     * const targetItems = [
     *   { name: 'movie_hd.mp4' },
     *   { name: 'film.avi' },
     *   { name: 'movie.mkv' }
     * ];
     * const result = findBestLCS(mainItem, targetItems);
     */
    findBestLCS(mainItem, targetItems) {
        const results = [];             // 存储所有LCS计算结果
        let bestMatchIndex = 0;         // 最佳匹配索引

        // 计算主要项目与所有目标项目的LCS
        for (let i = 0; i < targetItems.length; i++) {
            const currentLCS = this.lcs(mainItem.name, targetItems[i].name);
            results.push({target: targetItems[i], lcs: currentLCS});

            // 更新最佳匹配索引
            if (currentLCS.length > results[bestMatchIndex].lcs.length) {
                bestMatchIndex = i;
            }
        }

        const bestMatch = results[bestMatchIndex];

        return {
            allLCS: results, 
            bestMatch: bestMatch, 
            bestMatchIndex: bestMatchIndex
        };
    }

    /**
     * 延时函数
     * 
     * 创建一个Promise，在指定毫秒数后resolve，用于控制请求频率。
     * 
     * @param {number} ms - 延时毫秒数
     * @returns {Promise<void>} 延时Promise
     * 
     * @example
     * await delay(1000); // 延时1秒
     */
    delay(ms) {

        return new Promise((resolve) => setTimeout(resolve, ms));

    }

    /**
     * API请求方法
     * 
     * 统一的API请求处理方法，支持GET和POST请求，自动处理Cookie更新、
     * 错误重试、429限流等情况。提供完整的请求封装和错误处理机制。
     * 
     * @param {string} url - API端点URL（相对于apiUrl）
     * @param {Object} data - 请求数据（POST请求的body）
     * @param {Object} headers - 自定义请求头
     * @param {string} method - 请求方法（'get'或'post'，默认'post'）
     * @param {number} retry - 重试次数（默认3次）
     * @returns {Promise<Object>} API响应数据
     * 
     * @example
     * const result = await api('file/sort', {}, {}, 'get', 3);
     */
    async api(url, data, headers, method, retry) {
        let cookie = this.cookie || '';
        headers = headers || {};
        // 合并请求头 - 将基础请求头与自定义请求头合并
        Object.assign(headers, this.baseHeader);
        Object.assign(headers, {
            Cookie: cookie
        });
        method = method || 'post';
        // 发送请求 - 根据方法类型选择GET或POST请求
        const resp =
            method === 'get' ? await req.get(`${this.apiUrl}/${url}`, {
                headers: headers,
            }).catch((err) => {
                console.error(err.message);
                return err.response || {status: 500, data: {}};
            }) : await req.post(`${this.apiUrl}/${url}`, data, {
                headers: headers,
            }).catch((err) => {
                console.error(err.message);
                return err.response || {status: 500, data: {}};
            });
        const leftRetry = retry || 3;
        // 更新Cookie - 自动处理服务器返回的新Cookie
        if (resp.headers['set-cookie']) {
            const puus = resp.headers['set-cookie'].join(';;;').match(/__puus=([^;]+)/);
            if (puus) {
                if (cookie.match(/__puus=([^;]+)/)[1] !== puus[1]) {
                    cookie = cookie.replace(/__puus=[^;]+/, `__puus=${puus[1]}`);
                    console.log('[quark] api:更新cookie:', cookie);
                    ENV.set('quark_cookie', cookie);
                }
            }
        }
        // 处理429错误重试 - 遇到限流时自动重试
        if (resp.status === 429 && leftRetry > 0) {
            await this.delay(1000);
            return await this.api(url, data, headers, method, leftRetry - 1);
        }
        return resp.data || {};
    }

    /**
     * 清空保存目录
     * 
     * 删除保存目录中的所有文件，用于清理临时文件或重新开始保存操作。
     * 会获取目录下所有文件列表并批量删除。
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * await clearSaveDir(); // 清空drpy保存目录
     */
    async clearSaveDir() {
        // 获取保存目录下的文件列表
        const listData = await this.api(`file/sort?${this.pr}&pdir_fid=${this.saveDirId}&_page=1&_size=200&_sort=file_type:asc,updated_at:desc`, {}, {}, 'get');
        if (listData.data && listData.data.list && listData.data.list.length > 0) {
            // 批量删除文件
            const del = await this.api(`file/delete?${this.pr}`, {
                action_type: 2,
                filelist: listData.data.list.map((v) => v.fid),
                exclude_fids: [],
            });
            // console.log(del);
        }
    }

    /**
     * 创建保存目录
     * 
     * 在用户网盘根目录下创建或获取保存目录（默认名称为'drpy'），
     * 用于存储从分享链接保存的文件。如果目录已存在则直接使用。
     * 
     * @param {boolean} clean - 是否清空现有目录内容
     * @returns {Promise<void>}
     * 
     * @example
     * await createSaveDir(true); // 创建并清空保存目录
     */
    async createSaveDir(clean) {
        if (this.saveDirId) {
            // 如果保存目录ID已存在，根据需要清空目录
            if (clean) await this.clearSaveDir();
            return;
        }
        
        // 获取根目录下的文件列表，查找保存目录
        const listData = await this.api(`file/sort?${this.pr}&pdir_fid=0&_page=1&_size=200&_sort=file_type:asc,updated_at:desc`, {}, {}, 'get');
        if (listData.data && listData.data.list)
            for (const item of listData.data.list) {
                if (item.file_name === this.saveDirName) {
                    this.saveDirId = item.fid;
                    await this.clearSaveDir();
                    break;
                }
            }

        // 如果保存目录不存在，则创建新目录
        if (!this.saveDirId) {
            const create = await this.api(`file?${this.pr}`, {
                pdir_fid: '0',
                file_name: this.saveDirName,
                dir_path: '',
                dir_init_lock: false,
            });
            console.log(create);
            if (create.data && create.data.fid) {
                this.saveDirId = create.data.fid;
            }
        }
    }

    /**
     * 获取分享令牌
     * 
     * 获取访问分享链接所需的令牌（stoken），用于后续的文件操作。
     * 令牌会被缓存以避免重复请求，提高性能。
     * 
     * @param {Object} shareData - 分享数据对象
     * @param {string} shareData.shareId - 分享链接ID
     * @param {string} [shareData.sharePwd] - 分享密码（可选）
     * @returns {Promise<void>}
     * 
     * @example
     * await getShareToken({ shareId: 'abc123', sharePwd: '1234' });
     */
    async getShareToken(shareData) {
        if (!this.shareTokenCache[shareData.shareId]) {
            delete this.shareTokenCache[shareData.shareId];
            // 请求分享令牌
            const shareToken = await this.api(`share/sharepage/token?${this.pr}`, {
                pwd_id: shareData.shareId,
                passcode: shareData.sharePwd || '',
            });
            if (shareToken.data && shareToken.data.stoken) {
                // 缓存令牌信息
                this.shareTokenCache[shareData.shareId] = shareToken.data;
            }
        }
    }

    /**
     * 通过分享链接获取文件列表
     * 
     * 解析分享链接并获取其中的视频文件和字幕文件列表。
     * 支持递归遍历子目录，自动匹配视频文件对应的字幕文件。
     * 
     * @param {string|Object} shareInfo - 分享链接URL或分享数据对象
     * @returns {Promise<Array>} 视频文件列表，包含匹配的字幕信息
     * 
     * @example
     * const files = await getFilesByShareUrl('https://pan.quark.cn/s/abc123');
     * // 返回: [{ name: 'movie.mp4', subtitle: { name: 'movie.srt' }, ... }]
     */
    async getFilesByShareUrl(shareInfo) {
        const shareData = typeof shareInfo === 'string' ? this.getShareData(shareInfo) : shareInfo;
        if (!shareData) return [];
        await this.getShareToken(shareData);
        if (!this.shareTokenCache[shareData.shareId]) return [];
        
        const videos = [];      // 视频文件列表
        const subtitles = [];   // 字幕文件列表
        
        /**
         * 递归获取文件列表
         * 
         * @param {string} shareId - 分享ID
         * @param {string} folderId - 文件夹ID
         * @param {number} page - 页码
         * @returns {Promise<Array>} 文件列表
         */
        const listFile = async (shareId, folderId, page) => {
            const prePage = 200;
            page = page || 1;
            // 获取指定目录下的文件列表
            const listData = await this.api(`share/sharepage/detail?${this.pr}&pwd_id=${shareId}&stoken=${encodeURIComponent(this.shareTokenCache[shareId].stoken)}&pdir_fid=${folderId}&force=0&_page=${page}&_size=${prePage}&_sort=file_type:asc,file_name:asc`, {}, {}, 'get');
            if (!listData.data) return [];
            const items = listData.data.list;
            if (!items) return [];
            const subDir = [];
            
            // 遍历文件列表，分类处理
            for (const item of items) {
                if (item.dir === true) {
                    // 收集子目录
                    subDir.push(item);
                } else if (item.file === true && item.obj_category === 'video') {
                    // 过滤小于5MB的视频文件
                    if (item.size < 1024 * 1024 * 5) continue;
                    item.stoken = this.shareTokenCache[shareData.shareId].stoken;
                    videos.push(item);
                } else if (item.type === 'file' && this.subtitleExts.some((x) => item.file_name.endsWith(x))) {
                    // 收集字幕文件
                    subtitles.push(item);
                }
            }
            
            // 处理分页
            if (page < Math.ceil(listData.metadata._total / prePage)) {
                const nextItems = await listFile(shareId, folderId, page + 1);
                for (const item of nextItems) {
                    items.push(item);
                }
            }
            
            // 递归处理子目录
            for (const dir of subDir) {
                const subItems = await listFile(shareId, dir.fid);
                for (const item of subItems) {
                    items.push(item);
                }
            }
            return items;
        };
        
        await listFile(shareData.shareId, shareData.folderId);
        
        // 为视频文件匹配对应的字幕文件
        if (subtitles.length > 0) {
            videos.forEach((item) => {
                var matchSubtitle = this.findBestLCS(item, subtitles);
                if (matchSubtitle.bestMatch) {
                    item.subtitle = matchSubtitle.bestMatch.target;
                }
            });
        }
        return videos;
    }

    /**
     * 保存文件到个人网盘
     * 
     * 将分享链接中的文件保存到个人网盘的指定目录中。
     * 支持批量保存和任务状态跟踪，确保文件成功保存。
     * 
     * @param {string} shareId - 分享链接ID
     * @param {string} stoken - 分享令牌
     * @param {string} fileId - 文件ID
     * @param {string} fileToken - 文件令牌
     * @param {boolean} clean - 是否清空保存目录
     * @returns {Promise<string|boolean|null>} 保存后的文件ID或保存状态
     * 
     * @example
     * const savedFileId = await save('shareId', 'stoken', 'fileId', 'fileToken', false);
     */
    async save(shareId, stoken, fileId, fileToken, clean) {
        await this.createSaveDir(clean);
        if (clean) {
            // 清空文件ID缓存
            const saves = Object.keys(this.saveFileIdCaches);
            for (const save of saves) {
                delete this.saveFileIdCaches[save];
            }
        }
        if (!this.saveDirId) return null;
        
        // 如果没有提供stoken，尝试获取
        if (!stoken) {
            await this.getShareToken({
                shareId: shareId,
            });
            if (!this.shareTokenCache[shareId]) return null;
        }

        // 发起保存请求
        const saveResult = await this.api(`share/sharepage/save?${this.pr}`, {
            fid_list: [fileId],
            fid_token_list: [fileToken],
            to_pdir_fid: this.saveDirId,
            pwd_id: shareId,
            stoken: stoken || this.shareTokenCache[shareId].stoken,
            pdir_fid: '0',
            scene: 'link',
        });
        
        // 轮询任务状态直到完成
        if (saveResult.data && saveResult.data.task_id) {
            let retry = 0;
            while (true) {
                const taskResult = await this.api(`task?${this.pr}&task_id=${saveResult.data.task_id}&retry_index=${retry}`, {}, {}, 'get');
                if (taskResult.data && taskResult.data.save_as && taskResult.data.save_as.save_as_top_fids && taskResult.data.save_as.save_as_top_fids.length > 0) {
                    return taskResult.data.save_as.save_as_top_fids[0];
                }
                retry++;
                if (retry > 5) break;
                await this.delay(1000);
            }
        }
        return true;
    }

    /**
     * 刷新夸克Cookie
     * 
     * 自动刷新夸克网盘的Cookie以保持登录状态有效性。
     * 通过发送测试请求获取新的Cookie信息并更新到环境变量中。
     * 
     * @param {string} from - 调用来源标识（用于日志记录）
     * @returns {Promise<void>}
     * 
     * @example
     * await refreshQuarkCookie('定时任务');
     */
    async refreshQuarkCookie(from = '') {
        const nowCookie = this.cookie;
        // 发送测试请求获取新Cookie
        const cookieSelfRes = await axios({
            url: "https://drive-pc.quark.cn/1/clouddrive/file/sort?pr=ucpro&fr=pc&uc_param_str=&pdir_fid=0&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc",
            method: "GET",
            headers: {
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
                Origin: 'https://pan.quark.cn',
                Referer: 'https://pan.quark.cn/',
                Cookie: nowCookie
            }
        });
        const cookieResDataSelf = cookieSelfRes.headers;
        const resCookie = cookieResDataSelf['set-cookie'];
        if (!resCookie) {
            console.log(`${from}自动更新夸克 cookie: 没返回新的cookie`);

            return
        }
        const cookieObject = COOKIE.parse(resCookie);
        // console.log(cookieObject);
        if (cookieObject.__puus) {
            const oldCookie = COOKIE.parse(nowCookie);
            const newCookie = COOKIE.stringify({
                __pus: oldCookie.__pus,
                __puus: cookieObject.__puus,
            });
            console.log(`${from}自动更新夸克 cookie: ${newCookie}`);
            ENV.set('quark_cookie', newCookie);
        }
    }

    async getLiveTranscoding(shareId, stoken, fileId, fileToken) {
        if (!this.saveFileIdCaches[fileId]) {
            const saveFileId = await this.save(shareId, stoken, fileId, fileToken, true);
            if (!saveFileId) return null;

            this.saveFileIdCaches[fileId] = saveFileId;
        }
        const transcoding = await this.api(`file/v2/play?${this.pr}`, {
            fid: this.saveFileIdCaches[fileId],
            resolutions: 'normal,low,high,super,2k,4k',
            supports: 'fmp4',

        });
        if (transcoding.data && transcoding.data.video_list) {
            const low_url = transcoding.data.video_list.slice(-1)[0].video_info.url;
            const low_cookie = this.cookie;
            const low_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'origin': 'https://pan.quark.cn',
                'referer': 'https://pan.quark.cn/',
                'Cookie': low_cookie
            };
            // console.log('low_url:', low_url);
            // console.log('low_cookie:', low_cookie);
            const test_result = await this.testSupport(low_url, low_headers);
            // console.log(test_result);
            if (!test_result[0]) {
                try {
                    await this.refreshQuarkCookie('getLiveTranscoding');
                } catch (e) {
                    console.log(`getLiveTranscoding:自动刷新夸克cookie失败:${e.message}`);
                    console.error(e);
                }
            }
            return transcoding.data.video_list;
        }
        return null;

    }


    async getDownload(shareId, stoken, fileId, fileToken, clean) {

        if (!this.saveFileIdCaches[fileId]) {

            const saveFileId = await this.save(shareId, stoken, fileId, fileToken, clean);

            if (!saveFileId) return null;

            this.saveFileIdCaches[fileId] = saveFileId;

        }

        const down = await this.api(`file/download?${this.pr}`, {

            fids: [this.saveFileIdCaches[fileId]],

        });

        if (down.data) {
            const low_url = down.data[0].download_url;
            const low_cookie = this.cookie;
            const low_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'origin': 'https://pan.quark.cn',
                'referer': 'https://pan.quark.cn/',
                'Cookie': low_cookie
            };
            // console.log('low_url:', low_url);
            // console.log('low_cookie:', low_cookie);
            const test_result = await this.testSupport(low_url, low_headers);
            // console.log('test_result:', test_result);
            if (!test_result[0]) {
                try {
                    await this.refreshQuarkCookie('getDownload');
                } catch (e) {
                    console.log(`getDownload:自动刷新Quark cookie失败:${e.message}`)
                }
            }
            return down.data[0];

        }

        return null;

    }


    async testSupport(url, headers) {

        const resp = await req

            .get(url, {

                responseType: 'stream',

                headers: Object.assign(
                    {

                        Range: 'bytes=0-0',

                    },

                    headers,
                ),

            })

            .catch((err) => {

                // console.error(err);
                console.error('[testSupport] error:', err.message);

                return err.response || {status: 500, data: {}};

            });

        if (resp && (resp.status === 206 || resp.status === 200)) {

            const isAccept = resp.headers['accept-ranges'] === 'bytes';

            const contentRange = resp.headers['content-range'];

            const contentLength = parseInt(resp.headers['content-length']);

            const isSupport = isAccept || !!contentRange || contentLength === 1 || resp.status === 200;

            const length = contentRange ? parseInt(contentRange.split('/')[1]) : contentLength;

            delete resp.headers['content-range'];

            delete resp.headers['content-length'];

            if (length) resp.headers['content-length'] = length.toString();

            return [isSupport, resp.headers];

        } else {
            console.log('[testSupport] resp.status:', resp.status);
            return [false, null];
        }

    }


    delAllCache(keepKey) {

        try {

            fs.readdir(this.cacheRoot, (_, files) => {

                if (files)

                    for (const file of files) {

                        if (file === keepKey) continue;

                        const dir = join(this.cacheRoot, file);

                        fs.stat(dir, (_, stats) => {

                            if (stats && stats.isDirectory()) {

                                fs.readdir(dir, (_, subFiles) => {

                                    if (subFiles)

                                        for (const subFile of subFiles) {

                                            if (!subFile.endsWith('.p')) {

                                                fs.rm(join(dir, subFile), {recursive: true}, () => {
                                                });

                                            }

                                        }

                                });

                            }

                        });

                    }

            });

        } catch (error) {

            console.error(error);

        }

    }


    async chunkStream(inReq, outResp, url, urlKey, headers, option) {

        urlKey = urlKey || CryptoJS.enc.Hex.stringify(CryptoJS.MD5(url)).toString();

        if (this.currentUrlKey !== urlKey) {

            this.delAllCache(urlKey);

            this.currentUrlKey = urlKey;

        }

        if (!this.urlHeadCache[urlKey]) {

            const [isSupport, urlHeader] = await this.testSupport(url, headers);

            if (!isSupport || !urlHeader['content-length']) {

                outResp.redirect(url);

                return;

            }

            this.urlHeadCache[urlKey] = urlHeader;

        }

        let exist = true;

        await fs.promises.access(join(this.cacheRoot, urlKey)).catch((_) => (exist = false));

        if (!exist) {

            await fs.promises.mkdir(join(this.cacheRoot, urlKey), {recursive: true});

        }

        const contentLength = parseInt(this.urlHeadCache[urlKey]['content-length']);

        let byteStart = 0;

        let byteEnd = contentLength - 1;

        const streamHeader = {};

        if (inReq.headers.range) {

            const ranges = inReq.headers.range.trim().split(/=|-/);

            if (ranges.length > 2 && ranges[2]) {

                byteEnd = parseInt(ranges[2]);

            }

            byteStart = parseInt(ranges[1]);

            Object.assign(streamHeader, this.urlHeadCache[urlKey]);

            streamHeader['content-length'] = (byteEnd - byteStart + 1).toString();

            streamHeader['content-range'] = `bytes ${byteStart}-${byteEnd}/${contentLength}`;

            outResp.code(206);

        } else {

            Object.assign(streamHeader, this.urlHeadCache[urlKey]);

            outResp.code(200);

        }

        option = option || {chunkSize: 1024 * 256, poolSize: 5, timeout: 1000 * 10};

        const chunkSize = option.chunkSize;

        const poolSize = option.poolSize;

        const timeout = option.timeout;

        let chunkCount = Math.ceil(contentLength / chunkSize);

        let chunkDownIdx = Math.floor(byteStart / chunkSize);

        let chunkReadIdx = chunkDownIdx;

        let stop = false;

        const dlFiles = {};

        for (let i = 0; i < poolSize && i < chunkCount; i++) {

            new Promise((resolve) => {

                (async function doDLTask(spChunkIdx) {

                    if (stop || chunkDownIdx >= chunkCount) {

                        resolve();

                        return;

                    }

                    if (spChunkIdx === undefined && (chunkDownIdx - chunkReadIdx) * chunkSize >= this.maxCache) {

                        setTimeout(doDLTask, 5);

                        return;

                    }

                    const chunkIdx = spChunkIdx || chunkDownIdx++;

                    const taskId = `${inReq.id}-${chunkIdx}`;

                    try {

                        const dlFile = join(this.cacheRoot, urlKey, `${inReq.id}-${chunkIdx}.p`);

                        let exist = true;

                        await fs.promises.access(dlFile).catch((_) => (exist = false));

                        if (!exist) {

                            const start = chunkIdx * chunkSize;

                            const end = Math.min(contentLength - 1, (chunkIdx + 1) * chunkSize - 1);

                            console.log(inReq.id, chunkIdx);

                            const dlResp = await req.get(url, {

                                responseType: 'stream',

                                timeout: timeout,

                                headers: Object.assign(
                                    {

                                        Range: `bytes=${start}-${end}`,

                                    },

                                    headers,
                                ),

                            });

                            const dlCache = join(this.cacheRoot, urlKey, `${inReq.id}-${chunkIdx}.dl`);

                            const writer = fs.createWriteStream(dlCache);

                            const readTimeout = setTimeout(() => {

                                writer.destroy(new Error(`${taskId} read timeout`));

                            }, timeout);

                            const downloaded = new Promise((resolve) => {

                                writer.on('finish', async () => {

                                    if (stop) {

                                        await fs.promises.rm(dlCache).catch((e) => console.error(e));

                                    } else {

                                        await fs.promises.rename(dlCache, dlFile).catch((e) => console.error(e));

                                        dlFiles[taskId] = dlFile;

                                    }

                                    resolve(true);

                                });

                                writer.on('error', async (e) => {

                                    console.error(e);

                                    await fs.promises.rm(dlCache).catch((e1) => console.error(e1));

                                    resolve(false);

                                });

                            });

                            dlResp.data.pipe(writer);

                            const result = await downloaded;

                            clearTimeout(readTimeout);

                            if (!result) {

                                setTimeout(() => {

                                    doDLTask(chunkIdx);

                                }, 15);

                                return;

                            }

                        }

                        setTimeout(doDLTask, 5);

                    } catch (error) {

                        console.error(error);

                        setTimeout(() => {

                            doDLTask(chunkIdx);

                        }, 15);

                    }

                })();

            });

        }


        outResp.headers(streamHeader);

        const stream = new PassThrough();

        new Promise((resolve) => {

            let writeMore = true;

            (async function waitReadFile() {

                try {

                    if (chunkReadIdx >= chunkCount || stop) {

                        stream.end();

                        resolve();

                        return;

                    }

                    if (!writeMore) {

                        setTimeout(waitReadFile, 5);

                        return;

                    }

                    const taskId = `${inReq.id}-${chunkReadIdx}`;

                    if (!dlFiles[taskId]) {

                        setTimeout(waitReadFile, 5);

                        return;

                    }

                    const chunkByteStart = chunkReadIdx * chunkSize;

                    const chunkByteEnd = Math.min(contentLength - 1, (chunkReadIdx + 1) * chunkSize - 1);

                    const readFileStart = Math.max(byteStart, chunkByteStart) - chunkByteStart;

                    const dlFile = dlFiles[taskId];

                    delete dlFiles[taskId];

                    const fd = await fs.promises.open(dlFile, 'r');

                    const buffer = Buffer.alloc(chunkByteEnd - chunkByteStart - readFileStart + 1);

                    await fd.read(buffer, 0, chunkByteEnd - chunkByteStart - readFileStart + 1, readFileStart);

                    await fd.close().catch((e) => console.error(e));

                    await fs.promises.rm(dlFile).catch((e) => console.error(e));
                    writeMore = stream.write(buffer);
                    if (!writeMore) {
                        stream.once('drain', () => {
                            writeMore = true;
                        });
                    }
                    chunkReadIdx++;
                    setTimeout(waitReadFile, 5);
                } catch (error) {
                    setTimeout(waitReadFile, 5);
                }
            })();
        });
        stream.on('close', async () => {
            Object.keys(dlFiles).forEach((reqKey) => {
                if (reqKey.startsWith(inReq.id)) {
                    fs.rm(dlFiles[reqKey], {recursive: true}, () => {
                    });
                    delete dlFiles[reqKey];
                }
            });
            stop = true;
        });
        return stream;

    }
}

export const Quark = new QuarkHandler();
