/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: '番茄听书',
  author: 'EylinSir',
  '类型': '听书',
  lang: 'ds'
})
*/

var rule = {
    类型: '听书',
    author: 'EylinSir',
    title: '番茄听书',
    host: 'https://qkfqapi.vv9v.cn',
    url: '',
    searchUrl: '/api/search?key=**&tab_type=2&offset=((fypage-1)*10)',
    detailUrl: '/api/detail?book_id=fyid',
    headers: {'User-Agent': 'UC_UA'},
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    double: true,
    play_parse: true,
    limit: 12,
    
    action: async function (action, value) {
        if (action === 'only_search') {
            return '此源为纯搜索源，你直接全局搜索这个源或者使用此页面的源内搜索就好了';
        }
    },
    
    推荐: async function () {
        return [{
            vod_id: 'only_search',
            vod_name: '纯搜索源哦！',
            vod_tag: 'action',
            vod_pic: this.publicUrl + '/images/icon_cookie/搜索.jpg'
        }];
    },
    
    一级: async function () {
        return [];
    },
    
    二级: async function () {
        let detailApi = `${this.host}/api/detail?book_id=${this.orId}`;
        let detailJson = await request(detailApi);
        let detailData = JSON.parse(detailJson);
        let data = detailData.data.data;
        let chaptersApi = `${this.host}/api/book?book_id=${this.orId}`;
        let chaptersJson = await request(chaptersApi);
        let chaptersData = JSON.parse(chaptersJson);
        let bookData = chaptersData.data.data;
        let list = bookData.chapterListWithVolume?.flat() || bookData.chapterList || [];
        let urls = list.map(it => it.title + '$' + it.itemId + '@' + it.title).join('#');
        return {
            vod_id: this.orId,
            vod_name: data.book_name,
            type_name: data.category,
            vod_pic: data.thumb_url || data.expand_thumb_url,
            vod_content: data.abstract || data.book_abstract_v2,
            vod_remarks: data.sub_info,
            vod_director: data.author,
            vod_play_from: '番茄听书',
            vod_play_url: urls
        };
    },
    
    搜索: async function () {
        let {input, MY_PAGE} = this;
        let html = await request(input);
        let json = JSON.parse(html);
        let data = json.data.search_tabs[4].data;
        let d = [];
        for (let it of data.filter(i => i.book_data)) {
            let book = it.book_data[0];
            d.push({
                title: book.book_name,
                url: book.book_id,
                desc: book.author,
                content: book.book_abstract || book.abstract,
                pic_url: book.thumb_url
            });
        }
        return setResult(d);
    },
    
    lazy: async function () {
        let {input} = this;
        let parts = input.split('@');
        let itemId = parts[0];
        let toneId = '1';
        let content_url = `${this.host}/api/content?item_id=${itemId}&tab=听书&tone_id=${toneId}`;
        let jsonStr = await request(content_url);
        let data = JSON.parse(jsonStr);
        return {parse: 0, url: data.data.content};
    }
}