<?php
require_once __DIR__ . '/lib/spider.php';

class Spider extends BaseSpider {
    private $HOST = 'http://read.api.duodutek.com';
    private $UA = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36';
    
    // 固定�?API 参数
    private $COMMON_PARAMS = [
        "productId" => "2a8c14d1-72e7-498b-af23-381028eb47c0",
        "vestId" => "2be070e0-c824-4d0e-a67a-8f688890cadb",
        "channel" => "oppo19",
        "osType" => "android",
        "version" => "20",
        "token" => "202509271001001446030204698626"
    ];

    protected function getHeaders() {
        return [
            'User-Agent: ' . $this->UA
        ];
    }

    public function homeContent($filter) {
        // 定义分类
        $classes = [
            ["type_id" => "1287", "type_name" => "甜宠"],
            ["type_id" => "1288", "type_name" => "逆袭"],
            ["type_id" => "1289", "type_name" => "热血"],
            ["type_id" => "1290", "type_name" => "现代"],
            ["type_id" => "1291", "type_name" => "古代"]
        ];

        // 首页推荐：取第一个分类的前几个视�?        $list = $this->categoryContent('1287', 1)['list'];
        $list = array_slice($list, 0, 12);

        return [
            'class' => $classes,
            'list' => $list
        ];
    }

    public function categoryContent($tid, $pg = 1, $filter = [], $extend = []) {
        $apiUrl = $this->HOST . '/novel-api/app/pageModel/getResourceById';
        
        $params = array_merge($this->COMMON_PARAMS, [
            "resourceId" => $tid,
            "pageNum" => (string)$pg,
            "pageSize" => "10"
        ]);

        $url = $apiUrl . '?' . http_build_query($params);
        $jsonStr = $this->fetch($url, [], $this->getHeaders());
        $jsonObj = json_decode($jsonStr, true);
        
        $list = [];
        if ($jsonObj && isset($jsonObj['data']['datalist'])) {
            foreach ($jsonObj['data']['datalist'] as $vod) {
                $list[] = [
                    // 仿照�?Python：id@@name@@introduction 存储
                    'vod_id' => $vod['id'] . '@@' . $vod['name'] . '@@' . ($vod['introduction'] ?? ''),
                    'vod_name' => $vod['name'],
                    'vod_pic' => $vod['icon'],
                    'vod_remarks' => $vod['heat'] . '万播�?
                ];
            }
        }

        return $this->pageResult($list, $pg, 999, 10);
    }

    public function detailContent($ids) {
        $did = is_array($ids) ? $ids[0] : $ids;
        $parts = explode('@@', $did);
        if (count($parts) >= 2) {
            $bookId = $parts[0];
            $bookName = $parts[1];
            $intro = $parts[2] ?? '';
        } else {
            // 兼容旧格�?id@intro
            $parts = explode('@', $did);
            $bookId = $parts[0];
            $bookName = '';
            $intro = $parts[1] ?? '';
        }

        $apiUrl = $this->HOST . '/novel-api/basedata/book/getChapterList';
        $params = array_merge($this->COMMON_PARAMS, [
            "bookId" => $bookId
        ]);

        $url = $apiUrl . '?' . http_build_query($params);
        $jsonStr = $this->fetch($url, [], $this->getHeaders());
        $jsonObj = json_decode($jsonStr, true);

        $playUrls = [];
        if ($jsonObj && isset($jsonObj['data'])) {
            $chapters = $jsonObj['data'];
            foreach ($chapters as $index => $chapter) {
                // 提取短剧播放地址
                if (isset($chapter['shortPlayList'][0]['chapterShortPlayVoList'][0]['shortPlayUrl'])) {
                    $vUrl = $chapter['shortPlayList'][0]['chapterShortPlayVoList'][0]['shortPlayUrl'];
                    $epName = "�? . ($index + 1) . "�?;
                    $playUrls[] = $epName . '$' . $vUrl;
                }
            }
        }

        $vod = [
            'vod_id' => $did,
            'vod_name' => $bookName, // 由列表页带入
            'vod_content' => $intro,
            'vod_play_from' => '短剧专线',
            'vod_play_url' => implode('#', $playUrls)
        ];

        return ['list' => [$vod]];
    }

    public function searchContent($key, $quick = false, $pg = 1) {
        // �?Python 代码�?searchContentPage �?pass，故此处留空返回
        return $this->pageResult([], $pg);
    }

    public function playerContent($flag, $id, $vipFlags = []) {
        return [
            'parse' => 0, // 直接播放
            'url' => $id,
            'header' => [
                'User-Agent' => $this->UA
            ]
        ];
    }
}

// 运行爬虫
(new Spider())->run();
