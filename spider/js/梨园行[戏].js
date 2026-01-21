/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: '梨园行戏曲',
  author: 'EylinSir',
  '类型': '影视',
  logo: 'https://img.znds.com//uploads/new/221222/9-2212221050561N.png',
  lang: 'ds'
})
*/

var rule = {
    类型: '影视',
    author: 'EylinSir',
    title: '梨园行戏曲',
    desc: '梨园行戏曲源',
    host: 'https://fly.daoran.tv',
    homeUrl: 'https://fly.daoran.tv',
    url: '/API_ROP/search/album/screen',
    searchUrl: '/API_ROP/search/album/list?keyword=**',
    logo: 'https://img.znds.com//uploads/new/221222/9-2212221050561N.png',
    searchable: 1,
    quickSearch: 0,
    filterable: 1,
    timeout: 10000,
    play_parse: true,
    headers: {
        'md5': 'SkvyrWqK9QHTdCT12Rhxunjx+WwMTe9y4KwgeASFDhbYabRSPskR0Q==',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.12.10',
        'Host': 'fly.daoran.tv',
        'Connection': 'Keep-Alive'
    },
    
    request: async function (url, obj) {
        obj = obj || {};
        let response = await _fetch(url, {
            method: obj.method || 'POST',
            headers: obj.headers || this.headers,
            body: obj.data ? JSON.stringify(obj.data) : undefined
        });
        return response.text();
    },

    _format_img: function (img) {
        if (!img) {
            return '';
        }
        if (!img.startsWith('http')) {
            return `https://ottphoto.daoran.tv/HD/${img}`;
        }
        return img;
    },
    
    预处理: async function () {},
    
    class_parse: async function () {
        let cate_list = [
            {"n": "全部", "v": ""},
            {"n": "黄梅戏", "v": "hmx"}, {"n": "京剧", "v": "jingju"}, {"n": "曲剧", "v": "quju"},
            {"n": "秦腔", "v": "qinq"}, {"n": "潮剧", "v": "chaoju"}, {"n": "沪剧", "v": "huju"},
            {"n": "昆曲", "v": "kunqu"}, {"n": "淮剧", "v": "huaiju"}, {"n": "婺剧", "v": "wuju"},
            {"n": "河南大鼓书", "v": "hndgs"}, {"n": "滇剧", "v": "dianju"}, {"n": "老年大学", "v": "WK"},
            {"n": "绍剧", "v": "shaojv"}, {"n": "曲艺晚会", "v": "else"}, {"n": "皮影戏", "v": "pyx"},
            {"n": "四平调", "v": "spd"}, {"n": "吕剧", "v": "lvjv"}, {"n": "柳琴戏", "v": "liuqx"},
            {"n": "莆仙戏", "v": "pxx"}, {"n": "宛梆", "v": "wb"}, {"n": "锡剧", "v": "xiju"},
            {"n": "大平调", "v": "dpd"}, {"n": "话剧", "v": "huaju"}, {"n": "西秦戏", "v": "xqx"},
            {"n": "川剧", "v": "chuanju"}, {"n": "赣剧", "v": "tagId"}, {"n": "太康道情", "v": "tkdq"},
            {"n": "闽剧", "v": "minju"}, {"n": "梅花大鼓", "v": "mhdg"}, {"n": "吉剧", "v": "jiju"},
            {"n": "白字戏", "v": "bzx"}, {"n": "豫剧", "v": "yuju"}, {"n": "越剧", "v": "yueju"},
            {"n": "评剧", "v": "pingju"}, {"n": "坠子", "v": "hnzz"}, {"n": "河北梆子", "v": "hbbz"},
            {"n": "粤剧", "v": "gddx"}, {"n": "二夹弦", "v": "ejx"}, {"n": "河南琴书", "v": "hnqs"},
            {"n": "戏曲", "v": "xq"}, {"n": "二人台", "v": "ERT"}, {"n": "越调", "v": "yued"},
            {"n": "乐腔", "v": "lq"}, {"n": "扬剧", "v": "yangju"}, {"n": "京韵大鼓", "v": "jydg"},
            {"n": "彩调", "v": "caidiao"}, {"n": "琼剧", "v": "qiongju"}, {"n": "蒲剧", "v": "pujv"},
            {"n": "西河大鼓", "v": "xhdg"}, {"n": "湘剧", "v": "xj"}, {"n": "麦田乡韾", "v": "mtxy"},
            {"n": "评书", "v": "pingshu"}, {"n": "庐剧", "v": "luju"}, {"n": "单弦", "v": "danxian"},
            {"n": "花鼓戏", "v": "huagx"}, {"n": "相声", "v": "xiang"}, {"n": "四股弦", "v": "sgx"},
            {"n": "保定老调", "v": "bdld"}, {"n": "晋剧", "v": "jinju"}, {"n": "其他", "v": "other"},
            {"n": "正字戏", "v": "zzx"}, {"n": "楚剧", "v": "chuju"}
        ];
        
        return {
            class: [{ 'type_name': '戏曲片库', 'type_id': 'all' }],
            filters: {
                "all": [
                    {"key": "sect", "name": "曲种", "value": cate_list},
                    {"key": "area", "name": "资费", "value": [{"n": "全部", "v": "0"}, {"n": "免费", "v": "1"}, {"n": "VIP", "v": "2"}]},
                    {"key": "sort", "name": "排序", "value": [{"n": "最热", "v": "hot"}, {"n": "最新", "v": "online"}]}
                ]
            }
        };
    },
    
    推荐: async function () {
        return await this.一级('all', 1, {}, {});
    },
    
    一级: async function (tid, pg, filter, extend) {
        let url = `${this.host}/API_ROP/search/album/screen`;
        let sect = extend?.sect || '';
        if (tid === 'all' && !sect) {
            sect = '';
        }
        
        let payload = {
            "cur": parseInt(pg),
            "pageSize": 30,
            "resType": 1,
            "sect": sect,
            "orderby": extend?.sort || 'hot',
            "tagId": 0,
            "userId": "92315ec6e58a45ba7f47fd143b3d7956",
            "channel": "vivo",
            "item": "y9",
            "nodeCode": "001000",
            "project": "lyhxcx"
        };
        
        let area = extend?.area || '0';
        if (area === '1' || area === '2') {
            payload['free'] = parseInt(area);
        }
        
        try {
            let resp = await this.request(url, { data: payload });
            let json = JSON.parse(resp);
            let data = json.pb || json.data || {};
            let vod_list = [];
            for (let item of data.dataList || []) {
                vod_list.push({
                    title: item.name,
                    url: `${this.host}/API_ROP/album/res/list?albumCode=${item.code}`,
                    desc: (item.publishTime || '').split(' ')[0],
                    pic_url: this._format_img(item.imgsec),
                    vod_year: (item.publishTime || '').substring(0, 4)
                });
            }
            
            return setResult(vod_list);
        } catch (e) {
            console.error(e);
            return setResult([]);
        }
    },
    
    二级: async function () {
        let albumCode = this.input.match(/albumCode=(.*?)(?:&|$)/)[1];
        let url = `${this.host}/API_ROP/album/res/list`;
        
        let payload = {
            "albumCode": albumCode,
            "cur": 1,
            "pageSize": 500,
            "userId": "92315ec6e58a45ba7f47fd143b3d7956",
            "channel": "vivo",
            "item": "y9",
            "nodeCode": "001000",
            "project": "lyhxcx"
        };
        
        try {
            let resp = await this.request(url, { data: payload });
            let json = JSON.parse(resp);
            let album = json.album || {};
            let tracks = json.pb?.dataList || [];
            tracks.sort((a, b) => parseInt(a.sort || 0) - parseInt(b.sort || 0));
            let play_urls = [];
            for (let t of tracks) {
                if (t.code) {
                    play_urls.push(`${t.name.replace(/\$/g, '_')}$${t.code}`);
                }
            }
            
            let VOD = {
                vod_id: albumCode,
                vod_name: album.name || '未知',
                vod_pic: this._format_img(album.imgsec),
                type_name: "戏曲",
                vod_year: album.publishTime || '',
                vod_area: "中国",
                vod_content: album.des || '暂无简介',
                vod_play_from: "梨园行",
                vod_play_url: play_urls.join('#')
            };
            
            return VOD;
        } catch (e) {
            console.error(e);
            return {};
        }
    },
    
    搜索: async function () {
        let url = `${this.host}/API_ROP/search/album/list`;
        let payload = {
            "cur": parseInt(this.MY_PAGE),
            "pageSize": 20,
            "keyword": this.KEY,
            "item": "y9",
            "nodeCode": "001000",
            "orderby": "hot",
            "px": 2,
            "sect": [],
            "userId": "92315ec6e58a45ba7f47fd143b3d7956",
            "project": "lyhxcx"
        };
        
        try {
            let resp = await this.request(url, { data: payload });
            let json = JSON.parse(resp);
            let data = json.pb || json.data || {};
            let vod_list = [];
            for (let item of data.dataList || []) {
                vod_list.push({
                    title: item.name,
                    url: `${this.host}/API_ROP/album/res/list?albumCode=${item.code}`,
                    desc: (item.publishTime || ''),
                    pic_url: this._format_img(item.imgsec)
                });
            }
            return setResult(vod_list);
        } catch (e) {
            console.error(e);
            return setResult([]);
        }
    },
    
    lazy: async function () {
        let resCode = this.input;
        let url = `${this.host}/API_ROP/play/get/playurl`;
        let payload = {
            "resCode": resCode,
            "item": "y9",
            "mask": 0,
            "nodeCode": "001000",
            "project": "lyhxcx",
            "px": 2,
            "userId": "92315ec6e58a45ba7f47fd143b3d7956"
        };
        
        try {
            let resp = await this.request(url, { data: payload });
            let json = JSON.parse(resp);
            let play_url = json.playres?.playurl || '';
            return {
                parse: 0,
                url: play_url,
                header: { 'User-Agent': this.headers['User-Agent'] }
            };
        } catch (e) {
            console.error(e);
            return {
                parse: 0,
                url: ''
            };
        }
    }
};