import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const server = new Server(
  {
    name: "drpy-node-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function resolvePath(p) {
  return path.resolve(PROJECT_ROOT, p);
}

function isSafePath(p) {
  const resolved = resolvePath(p);
  return resolved.startsWith(PROJECT_ROOT);
}

import { exec } from "child_process";
import util from "util";
import { jsoup } from "../libs_drpy/htmlParser.js";
import req from "../utils/req.js";

const execPromise = util.promisify(exec);

// ... (existing imports)

// ... (existing server setup)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... (existing tools)
      {
        name: "list_directory",
        description: "List files and directories in the project",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Directory path relative to project root (default: '.')",
            },
          },
        },
      },
      {
        name: "read_file",
        description: "Read the content of a file",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path relative to project root",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file (creates directories if needed)",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path relative to project root",
            },
            content: {
              type: "string",
              description: "Content to write",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "delete_file",
        description: "Delete a file or directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path relative to project root",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_sources",
        description: "List all spider sources (js and catvod)",
        inputSchema: {
            type: "object",
            properties: {}
        },
      },
      {
        name: "get_routes_info",
        description: "Get information about registered routes/controllers",
        inputSchema: {
            type: "object",
            properties: {}
        },
      },
      {
        name: "fetch_spider_url",
        description: "Fetch a URL using drpy-node's request library to debug connectivity and anti-crawling measures (UA/headers).",
        inputSchema: zodToJsonSchema(
          z.object({
            url: z.string().describe("URL to fetch"),
            options: z.object({
              method: z.string().optional().describe("HTTP method (GET, POST, etc.)"),
              headers: z.record(z.string()).optional().describe("HTTP headers (User-Agent, Cookie, Referer, etc.)"),
              data: z.any().optional().describe("Request body for POST/PUT"),
            }).optional().describe("Request options"),
          })
        ),
      },
      {
        name: "debug_spider_rule",
        description: "Debug drpy spider rules by parsing HTML or fetching URL",
        inputSchema: zodToJsonSchema(
          z.object({
            html: z.string().optional().describe("HTML content to parse"),
            url: z.string().optional().describe("URL to fetch and parse"),
            rule: z.string().describe("The drpy rule to apply (e.g. '.list li', 'a&&href')"),
            mode: z.enum(["pdfa", "pdfh", "pd"]).describe("Parsing mode: pdfa (list), pdfh (html), pd (url)"),
            baseUrl: z.string().optional().describe("Base URL for resolving relative links"),
            options: z.object({
              method: z.string().optional(),
              headers: z.record(z.string()).optional(),
              data: z.any().optional(),
            }).optional().describe("Request options for URL fetch"),
          })
        ),
      },
      {
        name: "get_spider_template",
        description: "Get a standard template for creating a new drpy JS source",
        inputSchema: {
            type: "object",
            properties: {}
        },
      },
      {
        name: "get_drpy_libs_info",
        description: "Get information about available global helper functions and libraries in drpy environment",
        inputSchema: {
            type: "object",
            properties: {}
        },
      },
      {
        name: "validate_spider",
        description: "Validate a drpy spider file (syntax check + structure validation)",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path relative to project root",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "check_syntax",
        description: "Check syntax of a JavaScript file",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path relative to project root",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "restart_service",
        description: "Restart the drpy-node service (assumes PM2 is used with name 'drpys')",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ... (existing cases)
      case "list_directory": {
        const dirPath = args?.path || ".";
        if (!isSafePath(dirPath)) {
          throw new Error("Access denied");
        }
        const fullPath = resolvePath(dirPath);
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                files.map((f) => ({
                  name: f.name,
                  isDirectory: f.isDirectory(),
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "read_file": {
        const filePath = args?.path;
        if (!filePath || !isSafePath(filePath)) {
          throw new Error("Invalid path");
        }
        const content = await fs.readFile(resolvePath(filePath), "utf-8");
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      }

      case "write_file": {
        const filePath = args?.path;
        const content = args?.content;
        if (!filePath || !isSafePath(filePath)) {
          throw new Error("Invalid path");
        }
        await fs.outputFile(resolvePath(filePath), content);
        return {
          content: [
            {
              type: "text",
              text: `Successfully wrote to ${filePath}`,
            },
          ],
        };
      }

      case "delete_file": {
        const filePath = args?.path;
        if (!filePath || !isSafePath(filePath)) {
          throw new Error("Invalid path");
        }
        await fs.remove(resolvePath(filePath));
        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted ${filePath}`,
            },
          ],
        };
      }

      case "list_sources": {
        const jsSourcesPath = resolvePath("spider/js");
        const catvodSourcesPath = resolvePath("spider/catvod");
        
        let jsSources = [];
        let catvodSources = [];

        if (await fs.pathExists(jsSourcesPath)) {
            jsSources = (await fs.readdir(jsSourcesPath)).filter(f => f.endsWith('.js'));
        }
        if (await fs.pathExists(catvodSourcesPath)) {
            catvodSources = (await fs.readdir(catvodSourcesPath)).filter(f => f.endsWith('.js'));
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    "spider/js": jsSources,
                    "spider/catvod": catvodSources
                }, null, 2)
            }]
        }
      }

      case "get_routes_info": {
          // Rudimentary analysis of controllers/index.js
          const indexControllerPath = resolvePath("controllers/index.js");
          if (!await fs.pathExists(indexControllerPath)) {
              return { content: [{ type: "text", text: "controllers/index.js not found" }] };
          }
          const content = await fs.readFile(indexControllerPath, "utf-8");
          const lines = content.split('\n');
          const registered = lines
            .filter(l => l.trim().startsWith('fastify.register('))
            .map(l => l.trim());
          
          return {
              content: [{
                  type: "text",
                  text: JSON.stringify({
                      file: "controllers/index.js",
                      registered_controllers: registered
                  }, null, 2)
              }]
          }
      }

      case "fetch_spider_url": {
        const { url, options } = args;
        try {
            const config = options || {};
            if (!config.method) config.method = 'GET';
            // drpy's req wrapper handles headers in config directly
            const res = await req(url, config);
            
            const result = {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers,
                data: res.data
            };
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }]
            };
        } catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: `Fetch Error: ${e.message}\nResponse: ${e.response ? JSON.stringify(e.response.data) : 'No response'}` }]
            };
        }
      }

      case "debug_spider_rule": {
        const { html, url, rule, mode, baseUrl, options } = args;
        let content = html;
        let finalUrl = baseUrl || url;

        if (url && !content) {
            try {
                const res = await req(url, options || {});
                content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                if (!finalUrl) finalUrl = url;
            } catch (e) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Failed to fetch URL: ${e.message}` }]
                };
            }
        }

        if (!content) {
            return {
                isError: true,
                content: [{ type: "text", text: "Please provide 'html' content or 'url' to fetch." }]
            };
        }

        try {
            const j = new jsoup(finalUrl || '');
            let result;
            if (mode === 'pdfa') {
                result = j.pdfa(content, rule);
            } else if (mode === 'pdfh') {
                result = j.pdfh(content, rule);
            } else if (mode === 'pd') {
                result = j.pd(content, rule);
            }
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        mode,
                        rule,
                        count: Array.isArray(result) ? result.length : (result ? 1 : 0),
                        result
                    }, null, 2)
                }]
            };
        } catch (e) {
            return {
                isError: true,
                content: [{ type: "text", text: `Parsing Error: ${e.message}` }]
            };
        }
      }

      case "get_spider_template": {
        const template = `/*
* @File     : drpy-node spider template
* @Author   : user
* @Date     : ${new Date().toISOString().split('T')[0]}
* @Comments : 
*/

var rule = {
    title: 'Site Name',
    host: 'https://example.com',
    // Basic URLs
    url: '/category/fyclass/page/fypage', 
    searchUrl: '/search?wd=**&pg=fypage',
    
    // Feature flags
    searchable: 2, // 1: yes, 0: no, 2: verify
    quickSearch: 0, // 1: yes, 0: no
    filterable: 1, // 1: yes, 0: no
    
    // Headers
    headers: {
        'User-Agent': 'MOBILE_UA', 
    },
    
    // Class classification
    class_name: 'Movie&TV&Anime',
    class_url: '1&2&3',
    
    // Play parsing
    play_parse: true,
    lazy: '',
    
    // Pagination limit
    limit: 6,
    double: true,
    
    // Recommended content (Home page)
    // Selector format: 'list_selector;title_selector;img_selector;desc_selector;url_selector'
    推荐: '.recommend .item;a&&title;img&&src;.remarks&&Text;a&&href',
    
    // Level 1 parsing (List page)
    // Selector format: 'list_selector;title_selector;img_selector;desc_selector;url_selector'
    一级: '.list .item;a&&title;img&&src;.remarks&&Text;a&&href',
    
    // Level 2 parsing (Detail page)
    // Object format for basic parsing
    二级: {
        "title": "h1&&Text",
        "img": ".poster img&&src",
        "desc": ".desc&&Text",
        "content": ".content&&Text",
        "tabs": ".tabs span",
        "lists": ".playlists ul",
        // "tab_text": "span&&Text", // Optional, defaults to "body&&Text"
        // "list_text": "a&&Text",   // Optional, defaults to "body&&Text"
        // "list_url": "a&&href"     // Optional, defaults to "body&&href"
    },
    
    // Search parsing
    // Selector format: 'list_selector;title_selector;img_selector;desc_selector;url_selector'
    搜索: '.search-result .item;a&&title;img&&src;.remarks&&Text;a&&href',
}

/* 
// --- Advanced: Async Implementation (Use only when necessary) ---

rule.一级 = async function() {
    let {input, MY_PAGE, MY_CATE} = this;
    let html = await request(input);
    let list = pdfa(html, '.list .item');
    let videos = [];
    list.forEach(it => {
        videos.push({
            vod_id: pd(it, 'a&&href'),
            vod_name: pdfh(it, 'a&&title'),
            vod_pic: pd(it, 'img&&src'),
            vod_remarks: pdfh(it, '.remarks&&Text')
        });
    });
    return videos;
};

rule.二级 = async function() {
    let {input} = this;
    let html = await request(input);
    let VOD = {
        vod_name: pdfh(html, 'h1&&Text'),
        vod_pic: pd(html, '.poster img&&src'),
        vod_actor: pdfh(html, '.actor&&Text'),
        vod_content: pdfh(html, '.desc&&Text'),
    };
    let playList = [];
    let tabs = pdfa(html, '.tabs span');
    let lists = pdfa(html, '.playlists ul');
    tabs.forEach((tab, i) => {
        let from = pdfh(tab, 'span&&Text');
        let urls = pdfa(lists[i], 'li a').map(it => {
            return pdfh(it, 'a&&Text') + '$' + pd(it, 'a&&href');
        }).join('#');
        playList.push(urls);
    });
    VOD.vod_play_from = tabs.map(t => pdfh(t, 'span&&Text')).join('$$$');
    VOD.vod_play_url = playList.join('$$$');
    return VOD;
};

rule.lazy = async function () {
    let {input} = this;
    if (input.includes('m3u8') || input.includes('mp4')) {
        return {parse: 0, url: input};
    }
    let html = await request(input);
    let url = pdfh(html, 'video&&src');
    return {parse: 0, url: url};
};

// --- Advanced: Dynamic Classification ---
rule.class_parse = async function() {
    let html = await request(this.host);
    let classes = pdfa(html, '.nav li a');
    let list = [];
    classes.forEach(it => {
        list.push({
            type_id: pd(it, 'a&&href'),
            type_name: pdfh(it, 'a&&Text')
        });
    });
    return { class: list };
};

// --- Advanced: Proxy Rule ---
rule.proxy_rule = async function() {
    let {input} = this;
    // return [status, content-type, body]
    return [200, 'application/json', JSON.stringify({url: input})];
};
*/
`;
        return {
            content: [{
                type: "text",
                text: template
            }]
        }
      }

      case "get_drpy_libs_info": {
        const info = {
            "Global Objects": [
                "request(url, options) / req(url, options) - HTTP Request", 
                "post(url, options) - HTTP POST",
                "pdfa(html, rule) - Parse List (Cheerio)", 
                "pdfh(html, rule) - Parse Html (Cheerio)", 
                "pd(html, rule) - Parse Url (Cheerio + urljoin)",
                "log(msg) / print(msg) - Logging", 
                "setItem(key, value) / getItem(key) - Storage",
                "urljoin(base, path) - URL Joining",
                "ungzip(data) - Decompress GZIP",
                "$.require(path) - Import local JS file"
            ],
            "Context Variables (this)": [
                "input - Current input (url, object, etc.)",
                "MY_PAGE - Current page number",
                "MY_CATE - Current category ID",
                "fetch_params - Request parameters",
                "pdfa, pdfh, pd - Bound parsing functions"
            ],
            "Libraries": {
                "Cheerio": "Loaded as 'cheerio'",
                "CryptoJS": "Available as 'CryptoJS'",
                "Underscore": "Available as '_'",
                "PC_UA": "Common PC User-Agent string",
                "MOBILE_UA": "Common Mobile User-Agent string"
            },
            "Parsing Rules": {
                "pdfa": "Parse List: rule='selector&&attribute'",
                "pdfh": "Parse Html: rule='selector&&attribute'",
                "pd": "Parse Url: rule='selector&&attribute'",
                "Selector Syntax": "css_selector&&attribute (e.g., '.title&&Text', 'img&&src')"
            },
            "Development Guidelines": [
                "Prioritize string/object rules (Basic Syntax) for '一级', '二级', '搜索', '推荐'.",
                "Use 'async function' (Advanced Syntax) only when logic is too complex for string rules.",
                "Always check for valid URLs before returning."
            ]
        };
        return {
            content: [{
                type: "text",
                text: JSON.stringify(info, null, 2)
            }]
        }
      }

      case "validate_spider": {
        const filePath = args?.path;
        if (!filePath || !isSafePath(filePath)) {
          throw new Error("Invalid path");
        }
        const fullPath = resolvePath(filePath);
        
        // 1. Check Syntax
        try {
          await execPromise(`node --check "${fullPath}"`);
        } catch (e) {
          return {
            content: [{ type: "text", text: `Syntax Error:\n${e.stderr}` }],
            isError: true,
          };
        }

        // 2. Check Structure (Basic static analysis)
        const content = await fs.readFile(fullPath, "utf-8");
        const checks = [];
        
        // Check rule definition
        if (!content.match(/(var|let|const)\s+rule\s*=/)) {
            checks.push("❌ Missing 'rule' object definition");
        } else {
            checks.push("✅ 'rule' object defined");
        }

        // Check required fields
        const requiredFields = ['title', 'url'];
        requiredFields.forEach(field => {
            if (content.match(new RegExp(`${field}\\s*:`))) {
                checks.push(`✅ Field '${field}' found`);
            } else {
                checks.push(`⚠️ Field '${field}' missing (might be required)`);
            }
        });

        // Check Parsing Functions (Level 1, Level 2, Search)
        ['一级', '二级', '搜索', '推荐', '预处理'].forEach(field => {
             if (content.match(new RegExp(`${field}\\s*:`))) {
                 // Check if it's an async function
                if (content.match(new RegExp(`${field}\\s*:\\s*async\\s+function`)) || content.match(new RegExp(`${field}\\s*:\\s*async\\s*\\(`))) {
                    checks.push(`ℹ️ '${field}' uses Advanced Async Syntax (Consider string rule if simple)`);
                } else {
                     checks.push(`✅ '${field}' found`);
                 }
             }
        });

        // Check Filter Consistency
        if (content.includes('filterable: 1') || content.includes('filterable : 1')) {
            if (content.includes('filter:') || content.includes('filter :') || content.includes('filter_def:') || content.includes('filter_def :')) {
                checks.push("✅ 'filterable' enabled and filter definitions found");
            } else {
                checks.push("⚠️ 'filterable' is 1 but 'filter'/'filter_def' missing");
            }
        }
        
        // Check Proxy Rule
        if (content.includes('proxy_rule')) {
             checks.push("ℹ️ 'proxy_rule' detected (Advanced)");
        }
        
        // Check Imports
        if (content.includes('$.require')) {
             checks.push("ℹ️ Local import '$.require' detected");
        }

        return {
            content: [{
                type: "text",
                text: "Validation Results:\n" + checks.join("\n")
            }]
        }
      }

      case "check_syntax": {
        const filePath = args?.path;
        if (!filePath || !isSafePath(filePath)) {
          throw new Error("Invalid path");
        }
        const fullPath = resolvePath(filePath);
        try {
          await execPromise(`node --check "${fullPath}"`);
          return {
            content: [{ type: "text", text: "Syntax OK" }],
          };
        } catch (e) {
          return {
            content: [{ type: "text", text: `Syntax Error:\n${e.stderr}` }],
            isError: true,
          };
        }
      }

      case "restart_service": {
        try {
          await execPromise("pm2 restart drpys");
          return {
            content: [{ type: "text", text: "Service restarted successfully" }],
          };
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to restart service (is PM2 installed and 'drpys' running?):\n${e.stderr || e.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
