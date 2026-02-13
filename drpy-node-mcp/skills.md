# drpy-node MCP Skills & Prompts

This document contains specialized prompts and workflows designed to leverage the `drpy-node-mcp` tools effectively. It also serves as a knowledge base for "DS Source" development.

## Skill 1: Create a New DS Source (Spider)

**Description:** Analyze a target website and create a compatible `drpy` JavaScript source file.

**Prompt Template:**
```markdown
I need you to create a new drpy JS spider for the website: [Target URL]

Please follow these steps:
1.  **Analyze the Target:**
    - Use `fetch_spider_url` to inspect the website's HTML structure and response headers. Check for anti-crawling measures (e.g., specific User-Agent requirements).
    - Identify the list page selectors, detail page selectors, and search logic.
2.  **Prepare the Template:**
    - Use `get_spider_template` to get the standard JS structure.
    - Refer to the **Knowledge Base** below for selector syntax (`pdfa`, `pdfh`) and `rule` object structure.
3.  **Develop the Source:**
    - Write the JS code including `rule` object with `title`, `host`, `url`, `searchUrl`.
    - Implement parsing logic for `一级` (List), `二级` (Detail), and `搜索` (Search).
    - **Selector Format**: `selector;attribute` (e.g., `.list li;a&&title;a&&href;img&&src;.desc&&Text`).
    - Use `class_name` and `class_url` for static categories, or implement `class_parse` for dynamic ones.
4.  **Validation:**
    - Save the file to `spider/js/[Name].js` using `write_file`.
    - Use `check_syntax` to ensure the JavaScript is valid.
    - Use `validate_spider` to confirm the drpy structure is correct.
    - Use `debug_spider_rule` to test specific rules (e.g., `pdfa` for lists) against fetched HTML.
```

## Skill 2: Debug and Verify an Existing Source

**Description:** troubleshoot a malfunctioning source or verify a newly added one.

**Prompt Template:**
```markdown
Please debug and verify the spider source file: [File Path, e.g., spider/js/example.js]

Please follow these steps:
1.  **Read and Decode:**
    - Use `read_file` to load the source code. Note that `read_file` automatically decrypts DS sources.
2.  **Static Analysis:**
    - Use `check_syntax` to catch any syntax errors.
    - Use `validate_spider` to ensure the `rule` object and required fields are present.
3.  **Dynamic Testing:**
    - Use `fetch_spider_url` to request the source's `host` or a specific category URL.
    - **Header Check**: If the source uses custom `headers` (e.g., `User-Agent`, `Cookie`), ensure they are used in the fetch.
    - Use `debug_spider_rule` to test the parsing rules (e.g., `rule.一级` or `rule.searchUrl`) against the real response content.
4.  **Fix and Update:**
    - If errors are found (e.g., selector mismatch), propose a fix.
    - Use `write_file` to apply the corrected code.
```

## Skill 3: System Health Check & Configuration

**Description:** Monitor the drpy-node service status, logs, and update configurations.

**Prompt Template:**
```markdown
Perform a health check on the drpy-node service and update configuration if needed.

Steps:
1.  **Check Logs:**
    - Use `read_logs` to inspect the latest application logs for errors.
2.  **Verify Routes:**
    - Use `get_routes_info` to confirm API routes are registered.
3.  **Check Database:**
    - Use `sql_query` to check the status of the database (e.g., `SELECT count(*) FROM iptv_sources`).
4.  **Configuration Management:**
    - Use `manage_config` with `action: 'get'` to review current settings.
    - Use `manage_config` with `action: 'set'` to update settings (e.g., `api.timeout`).
    - If config is changed, use `restart_service` to apply changes.
```

## Skill 4: Advanced Source Logic (Encryption/Decryption)

**Description:** Handle sources with complex encryption, dynamic logic, or `lazy` loading.

**Prompt Template:**
```markdown
I need help with a source that requires custom decryption or dynamic logic: [File Path or URL]

Guidance:
1.  **Analyze Logic:**
    - Read the source code. Look for `proxyRule`, `unzip`, or custom `eval` usage.
    - **Global Libs**: Recall that `CryptoJS` is available globally.
2.  **Test Advanced Functions:**
    - **Lazy Loading**: If the source uses `lazy` (dynamic video URL), inspect the function. Use `fetch_spider_url` to simulate the internal requests.
    - **Proxy**: If `proxyRule` is used, ensure the proxy logic is valid.
3.  **Refine Code:**
    - Optimize `eval` usage.
    - Ensure `hostJs` or `预处理` (preprocessing) functions are correctly implemented for dynamic headers/tokens.
```

## Knowledge Base & Reference

### 1. Source Structure (`rule` Object)
A valid DS source must define a `rule` object.
```javascript
var rule = {
    title: 'Site Name',
    host: 'https://example.com',
    url: '/category/fyclass/page/fypage', // fyclass=category_id, fypage=page_num
    searchUrl: '/search?k=**&p=fypage',   // **=keyword
    searchable: 2, // 1: search, 2: search+list
    quickSearch: 0,
    headers: { 'User-Agent': 'MOBILE_UA' },
    class_name: 'Movie&TV', // Static Categories
    class_url: 'movie&tv',
    // Parsing Rules
    play_parse: true,
    lazy: async function() { ... }, // Async video resolution
    一级: '.list li;a&&title;img&&src;.desc&&Text;a&&href', // List Parser
    二级: '*', // Detail Parser (can be '*' or specific rules)
    搜索: '*', // Search Parser
}
```

### 2. Selector Syntax (Cheerio-based)
- **Format**: `selector;attribute` or `selector;attr1;attr2...`
- **Functions**:
    - `pdfa(html, rule)`: Parse List (Returns Array).
    - `pdfh(html, rule)`: Parse Node (Returns String).
    - `pd(html, rule)`: Parse URL (Returns String, auto-resolves relative URLs).
- **Special Attributes**:
    - `Text`: Element text.
    - `Html`: Element inner HTML.
    - `href` / `src`: Auto-resolves relative URLs to absolute.
    - `style`, `data-*`: Get attribute value.
- **Special Syntax**:
    - `&&`: Separator for nested selectors (e.g., `.list&&li` -> find `.list` then `li`).
    - `||`: Backup selector (e.g., `img&&data-src||img&&src`).
    - `:eq(n)`: Select n-th element.
    - `*`: Select all or use default logic.

### 3. Advanced JS Mode (Async Functions)
Keys like `一级`, `二级`, `搜索`, `推荐` can be `async` functions instead of strings.
```javascript
一级: async function() {
    let { input, pdfa, pdfh, pd } = this;
    // input is the HTML or Response
    let list = pdfa(input, '.list li');
    let d = [];
    list.forEach(it => {
        d.push({
            title: pdfh(it, 'a&&title'),
            desc: pdfh(it, '.desc&&Text'),
            pic: pd(it, 'img&&src'),
            url: pd(it, 'a&&href')
        });
    });
    return d; // Return array of objects
}
```

### 4. Global Helper Functions
- `request(url, options)`: Async HTTP request.
- `post(url, options)`: Async HTTP POST.
- `log(msg)`: Print logs to console (visible in `read_logs`).
- `setItem(key, value)` / `getItem(key)`: Persistent storage.
- `urljoin(base, path)`: Join URLs.

### 5. Common Patterns
- **Lazy Loading (`lazy`)**: Used when the video URL needs to be fetched dynamically (e.g., from an iframe or API).
    ```javascript
    lazy: async function() {
        let { input } = this; // input is the video page URL
        let html = await request(input);
        let videoUrl = pdfh(html, 'video&&src');
        return videoUrl; // Return the real video URL
    }
    ```
- **Dynamic Categories (`class_parse`)**:
    ```javascript
    class_parse: '.menu li;a&&Text;a&&href;.*/(.*?)/' // Selector;Title;Url;RegexForID
    ```

### 6. Advanced Features & Best Practices

- **Batch Requests (`batchFetch`)**: Execute multiple HTTP requests in parallel (if supported).
    ```javascript
    if (typeof(batchFetch) === 'function') {
        let urls = [
            { url: 'http://site1.com/api', options: { headers: {} } },
            { url: 'http://site2.com/api', options: {} }
        ];
        let responses = await batchFetch(urls); // Returns array of response strings
    }
    ```

- **Pre-processing (`预处理`)**: Run logic before the main parsing starts. Useful for dynamic configuration or fetching initial tokens.
    ```javascript
    预处理: async function() {
        // Modify rule object dynamically
        let config = JSON.parse(await request('http://config.url'));
        rule.classes = config.classes; // Set categories dynamically
    }
    ```

- **Lazy Parsing Options (`lazy`)**: Return an object for more control.
    ```javascript
    lazy: async function() {
        return {
            parse: 1, // 1=Sniffing/Parsing enabled (0=Direct URL)
            jx: 1,    // 1=Use app's built-in VIP parser (if available)
            url: 'http://video.url',
            header: { 'User-Agent': '...' }
        }
    }
    ```

- **State Management (`setItem`, `getItem`)**: Persist data across function calls (e.g., sessions, tokens).
    ```javascript
    let token = getItem('my_token', '');
    if (!token) {
        token = await fetchToken();
        setItem('my_token', token);
    }
    ```

### 7. Content Type Specifics

- **Novels (`类型: '小说'`)**:
    - `lazy` should return `novel://` followed by a JSON string of `{ title, content }`.
    ```javascript
    lazy: async function() {
        let content = '...'; // Decrypted text
        let ret = JSON.stringify({ title: 'Chapter 1', content: content });
        return { parse: 0, url: 'novel://' + ret };
    }
    ```

## Tool Reference

| Tool Name | Description | Key Usage |
| :--- | :--- | :--- |
| `fetch_spider_url` | Fetch URL with custom options | Test connectivity, get HTML for debugging |
| `debug_spider_rule` | Test parsing rules | Verify CSS/Regex selectors against HTML |
| `validate_spider` | Validate spider structure | Check for `rule` object and required fields |
| `check_syntax` | Check JS syntax | Catch syntax errors before running |
| `read_file` | Read file content | **Automatically decodes DS sources** |
| `get_spider_template` | Get source template | Start new sources with best practices |
| `get_drpy_libs_info` | Get available libs | Check available global functions (pdfa, req, etc.) |
| `manage_config` | Read/Write config | Adjust system settings safely |
