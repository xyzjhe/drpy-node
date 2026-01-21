import {readFileSync, existsSync, readdirSync, statSync} from 'fs';
import {createReadStream} from 'fs';
import {execSync} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';
import {createHash} from 'crypto';
import {ENV} from '../utils/env.js';
import COOKIE from '../utils/cookieManager.js';
import {validateBasicAuth} from '../utils/api_validate.js';

const COOKIE_AUTH_CODE = process.env.COOKIE_AUTH_CODE || 'drpys';
const IS_VERCEL = process.env.VERCEL;
const DOWNLOAD_AUTH_SECRET = process.env.DOWNLOAD_AUTH_SECRET || 'drpys_download_secret';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.dirname(__dirname);

const generateDownloadToken = (filename) => {
    const timestamp = Date.now();
    const data = `${filename}-${timestamp}-${DOWNLOAD_AUTH_SECRET}`;
    const token = createHash('md5').update(data).digest('hex');
    return `${token}-${timestamp}`;
};

const validateDownloadToken = (filename, token) => {
    if (!token) return false;
    const parts = token.split('-');
    if (parts.length < 2) return false;
    const timestamp = parseInt(parts.pop());
    const hash = parts.join('-');
    const data = `${filename}-${timestamp}-${DOWNLOAD_AUTH_SECRET}`;
    const expectedHash = createHash('md5').update(data).digest('hex');
    const now = Date.now();
    return hash === expectedHash && (now - timestamp) < 3600000;
};

const findLatestPackage = (projectDir, packageName) => {
    try {
        const parentDir = path.dirname(projectDir);
        const files = readdirSync(parentDir);

        const isGreen = packageName.includes('-green');
        const ext = packageName.split('.').pop();
        const baseName = packageName.replace(/-green\.[^.]+$/, '').replace(/\.[^.]+$/, '');
        const pattern = new RegExp(`^${baseName.replace(/\./g, '\\.')}-\\d{8}${isGreen ? '-green' : ''}\\.${ext}`);

        console.log(`查找包: ${packageName}, 正则: ${pattern.source}, 父目录: ${parentDir}`);
        console.log('目录中的文件:', files.filter(f => f.includes('drpy-node')));

        const packageFiles = files
            .filter(file => pattern.test(file))
            .map(file => {
                const filePath = path.join(parentDir, file);
                const stats = statSync(filePath);
                return {file, filePath, mtime: stats.mtime};
            })
            .sort((a, b) => b.mtime - a.mtime);

        console.log('匹配到的文件:', packageFiles.map(f => f.file));
        return packageFiles.length > 0 ? packageFiles[0] : null;
    } catch (error) {
        console.error('查找包失败:', error.message);
        return null;
    }
};

const buildPackage = (packageName) => {
    try {
        let command = 'node package.js';
        if (packageName.includes('-green')) {
            command += ' -g';
        }
        if (packageName.includes('.zip')) {
            command += ' -z';
        }

        console.log(`执行打包命令: ${command}, 目录: ${projectRootDir}`);
        const output = execSync(command, {cwd: projectRootDir, stdio: 'pipe'});
        console.log('打包输出:', output.toString());
        const result = findLatestPackage(projectRootDir, packageName);
        console.log('打包后查找结果:', result ? result.file : '未找到');
        return result;
    } catch (error) {
        console.error('打包失败:', error.message);
        console.error('错误详情:', error.stdout?.toString(), error.stderr?.toString());
        throw error;
    }
};

export default (fastify, options, done) => {
    fastify.get('/admin/encoder', async (request, reply) => {
        const encoderFilePath = path.join(options.appsDir, 'encoder/index.html'); // 获取 encoder.html 文件的路径

        // 检查文件是否存在
        if (!existsSync(encoderFilePath)) {
            return reply.status(404).send({error: 'encoder.html not found'});
        }

        try {
            // 读取 HTML 文件内容
            const htmlContent = readFileSync(encoderFilePath, 'utf-8');
            reply.type('text/html').send(htmlContent); // 返回 HTML 文件内容
        } catch (error) {
            fastify.log.error(`Failed to read encoder.html: ${error.message}`);
            return reply.status(500).send({error: 'Failed to load encoder page'});
        }
    });

    fastify.post('/admin/cookie-set', async (request, reply) => {
        try {
            // 从请求体中获取参数
            const {cookie_auth_code, key, value} = request.body;

            // 验证参数完整性
            if (!cookie_auth_code || !key || !value) {
                return reply.code(400).send({
                    success: false,
                    message: 'Missing required parameters: cookie_auth_code, key, or value',
                });
            }

            // 验证 cookie_auth_code 是否正确
            if (cookie_auth_code !== COOKIE_AUTH_CODE) {
                return reply.code(403).send({
                    success: false,
                    message: 'Invalid cookie_auth_code',
                });
            }

            let cookie_obj = COOKIE.parse(value);
            let cookie_str = value;

            if (['quark_cookie', 'uc_cookie'].includes(key)) {
                // console.log(cookie_obj);
                cookie_str = COOKIE.stringify({
                    __pus: cookie_obj.__pus || '',
                    __puus: cookie_obj.__puus || '',
                });
                console.log(cookie_str);
            }
            // 调用 ENV.set 设置环境变量
            ENV.set(key, cookie_str);

            // 返回成功响应
            return reply.code(200).send({
                success: true,
                message: 'Cookie value has been successfully set',
                data: {key, value},
            });
        } catch (error) {
            // 捕获异常并返回错误响应
            console.error('Error setting cookie:', error.message);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error',
            });
        }
    });

    fastify.get('/admin/download', {
        preHandler: validateBasicAuth
    }, async (request, reply) => {
        try {
            if (IS_VERCEL) {
                return reply.code(403).send({
                    success: false,
                    message: 'Vercel 环境不支持文件下载功能',
                });
            }

            const projectName = path.basename(projectRootDir);

            const files = [
                {name: `${projectName}.7z`, desc: '7z 压缩包（标准版）'},
                {name: `${projectName}.zip`, desc: 'ZIP 压缩包（标准版）'},
                {name: `${projectName}-green.7z`, desc: '7z 压缩包（绿色版，不含[密]文件）'},
                {name: `${projectName}-green.zip`, desc: 'ZIP 压缩包（绿色版，不含[密]文件）'}
            ];

            const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>下载 ${projectName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        .download-list {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .download-item {
            margin: 10px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .download-info {
            flex: 1;
        }
        .download-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .download-item a {
            text-decoration: none;
            font-weight: bold;
            padding: 8px 16px;
            background-color: #007bff;
            color: white;
            border-radius: 4px;
            transition: background-color 0.3s;
            border: none;
            cursor: pointer;
        }
        .download-item a:hover {
            background-color: #0056b3;
        }
        .copy-btn {
            text-decoration: none;
            font-weight: bold;
            padding: 8px 16px;
            background-color: #6c757d;
            color: white;
            border-radius: 4px;
            transition: background-color 0.3s;
            border: none;
            cursor: pointer;
        }
        .copy-btn:hover {
            background-color: #5a6268;
        }
        .file-type {
            color: #666;
            font-size: 14px;
        }
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            display: none;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <h1>${projectName} 下载中心</h1>
    <div class="toast" id="toast">链接已复制到剪贴板</div>
    <div class="download-list">
        ${files.map(file => {
                const token = generateDownloadToken(file.name);
                const downloadUrl = `/admin/download/${file.name}?auth=${token}`;
                return `
        <div class="download-item">
            <div class="download-info">
                <strong>${file.name}</strong>
                <div class="file-type">${file.desc}</div>
            </div>
            <div class="download-actions">
                <a href="${downloadUrl}">下载</a>
                <button class="copy-btn" onclick="copyLink('${downloadUrl}')">复制链接</button>
            </div>
        </div>`;
            }).join('')}
    </div>
    <script>
        function copyLink(url) {
            const fullUrl = window.location.origin + url;
            navigator.clipboard.writeText(fullUrl).then(() => {
                const toast = document.getElementById('toast');
                toast.style.display = 'block';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 2000);
            });
        }
    </script>
</body>
</html>`;

            reply.type('text/html').send(html);
        } catch (error) {
            console.error('下载页面加载失败:', error.message);
            return reply.code(500).send({
                success: false,
                message: '加载下载页面失败',
                error: error.message,
            });
        }
    });

    fastify.get('/admin/download/:filename', {
        preHandler: async (request, reply) => {
            const {auth} = request.query;
            if (validateDownloadToken(request.params.filename, auth)) {
                return;
            }
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                reply.header('WWW-Authenticate', 'Basic');
                return reply.code(401).send('Authentication required');
            }
            const base64Credentials = authHeader.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [username, password] = credentials.split(':');
            const validUsername = process.env.API_AUTH_NAME || '';
            const validPassword = process.env.API_AUTH_CODE || '';
            if (username === validUsername && password === validPassword) {
                return;
            }
            reply.header('WWW-Authenticate', 'Basic');
            return reply.code(401).send('Invalid credentials');
        }
    }, async (request, reply) => {
        try {
            if (IS_VERCEL) {
                return reply.code(403).send({
                    success: false,
                    message: 'Vercel 环境不支持文件下载功能',
                });
            }

            const {filename} = request.params;
            const projectName = path.basename(projectRootDir);

            const validFilenames = [
                `${projectName}.7z`,
                `${projectName}.zip`,
                `${projectName}-green.7z`,
                `${projectName}-green.zip`
            ];

            if (!validFilenames.includes(filename)) {
                return reply.code(400).send({
                    success: false,
                    message: '无效的文件名',
                });
            }

            let latestPackage = findLatestPackage(projectRootDir, filename);

            if (!latestPackage) {
                console.log(`未找到 ${filename}，开始打包...`);
                latestPackage = buildPackage(filename);
                if (!latestPackage) {
                    return reply.code(500).send({
                        success: false,
                        message: '打包失败，无法创建压缩文件',
                    });
                }
            }

            const fileStream = createReadStream(latestPackage.filePath);
            const contentType = filename.endsWith('.zip') ? 'application/zip' : 'application/x-7z-compressed';
            reply.header('Content-Type', contentType);
            reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(latestPackage.file)}"`);
            return reply.send(fileStream);
        } catch (error) {
            console.error('下载文件失败:', error.message);
            return reply.code(500).send({
                success: false,
                message: '下载失败',
                error: error.message,
            });
        }
    });

    done();
};
