# 暑假日程安排

交互式暑假日程网页，支持哥哥/妹妹日程筛选、多日期批量添加、重叠日程并排显示。数据保存在项目目录下的 `schedule-data.json`，通过服务端 API 读写。

## 部署约定

| 项 | 值 |
|---|---|
| 运行用户 | `summer` |
| 项目路径 | `/home/summer/code/summer` |
| 服务端口 | `8765`（可用环境变量 `PORT` 修改） |

## 项目结构

```
/home/summer/code/summer/
├── index.html          # 主页面
├── app.js              # 前端逻辑
├── calendar.js         # 弹窗月历（农历）
├── styles.css          # 样式
├── schedule-data.json  # 日程数据（运行后会被持续更新）
├── server.py           # HTTP 服务 + JSON 读写 API
├── pyproject.toml      # uv 项目配置
└── uv.lock             # 依赖锁定
```

## 环境要求

- Ubuntu 20.04+（或其他 Linux）
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)（推荐，用于管理 Python 环境）

> **注意**：必须使用 `uv run serve` 启动，不能用 `python -m http.server`。后者只能提供静态文件，无法保存日程。

---

## 一、在新 Ubuntu 服务器上部署

以下步骤均以 **`summer` 用户** 登录后执行（不要用 `root` 跑 `uv`）。

### 1. 安装系统依赖

```bash
sudo apt update
sudo apt install -y git curl
```

### 2. 安装 uv（summer 用户）

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env   # 或重新登录 shell
uv --version
```

### 3. 获取项目代码

**方式 A：Git 克隆**

```bash
mkdir -p /home/summer/code
cd /home/summer/code
git clone <你的仓库地址> summer
cd /home/summer/code/summer
```

**方式 B：本地上传**

```bash
scp -r ./summer summer@your-server:/home/summer/code/summer
ssh summer@your-server
cd /home/summer/code/summer
```

### 4. 创建 Python 环境

```bash
cd /home/summer/code/summer
uv sync
```

### 5. 确认目录权限

项目文件应归 `summer` 用户所有（尤其是 `schedule-data.json` 需要可写）：

```bash
sudo chown -R summer:summer /home/summer/code/summer
```

> 不要用 `www-data` 改归属，除非你明确改用 `www-data` 跑服务。

### 6. 手动试跑

```bash
cd /home/summer/code/summer
PORT=8765 uv run serve
```

浏览器访问 `http://服务器IP:8765`。能打开页面、能编辑并保存日程即表示正常。

按 `Ctrl+C` 停止。

---

## 二、配置 systemd 开机自启

先确认 uv 路径（在 **summer 用户** 下执行）：

```bash
which uv
# 通常为 /home/summer/.local/bin/uv
```

创建服务文件：

```bash
sudo tee /etc/systemd/system/summer-schedule.service << 'EOF'
[Unit]
Description=Summer Schedule Web App
After=network.target

[Service]
Type=simple
User=summer
Group=summer
WorkingDirectory=/home/summer/code/summer
Environment=PORT=8765
ExecStart=/home/summer/.local/bin/uv run serve
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

> 若 `which uv` 输出路径不同，请修改 `ExecStart` 中的路径。

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable summer-schedule
sudo systemctl start summer-schedule
sudo systemctl status summer-schedule
```

查看日志：

```bash
journalctl -u summer-schedule -f
```

---

## 三、（可选）Nginx 反向代理（80 + 443）

若希望通过域名访问并启用 HTTPS，可在前面加 Nginx。

```bash
sudo apt install -y nginx
```

### 1. 申请 SSL 证书（首次）

先用仅 80 端口的临时配置，方便 Certbot 验证域名：

```bash
sudo tee /etc/nginx/sites-available/summer << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;   # 改成你的域名

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/summer /etc/nginx/sites-enabled/summer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot 会自动写入证书路径。若你希望自己维护完整配置，可改用下面 **同时支持 80 和 443** 的版本。

### 2. 完整配置（80 跳转 HTTPS + 443 反代）

将 `/etc/nginx/sites-available/summer` 替换为（把 `your-domain.com` 和证书路径改成你的）：

```nginx
# HTTP：跳转到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    return 301 https://$host$request_uri;
}

# HTTPS：反向代理到 summer 服务
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> 若 Certbot 尚未生成 `ssl-dhparams.pem`，可执行：  
> `sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048`

### 3. 启用 summer、取消 default

```bash
sudo ln -sf /etc/nginx/sites-available/summer /etc/nginx/sites-enabled/summer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 证书自动续期

Certbot 安装后会添加定时任务，可手动测试：

```bash
sudo certbot renew --dry-run
```

访问 `https://your-domain.com` 即可。

---

## 四、防火墙

若直接暴露 8765 端口：

```bash
sudo ufw allow 8765/tcp
sudo ufw enable
```

若使用 Nginx 反代，只需开放 80/443：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 五、本地开发

在开发机或服务器上，同样进入项目目录即可：

```bash
cd /home/summer/code/summer
uv sync
PORT=8765 uv run serve
```

访问 http://localhost:8765

修改前端文件（HTML/CSS/JS）后刷新浏览器即可；修改 `server.py` 后需重启服务。

---

## 六、数据备份

所有日程保存在：

```
/home/summer/code/summer/schedule-data.json
```

建议定期备份，例如加入 summer 用户的 cron：

```bash
mkdir -p /home/summer/code/summer/backups

# crontab -e 添加：
0 3 * * * cp /home/summer/code/summer/schedule-data.json /home/summer/code/summer/backups/schedule-$(date +\%Y\%m\%d).json
```

恢复时停止服务，替换 `schedule-data.json`，再启动服务即可。

---

## API 说明

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedule` | 读取日程 JSON |
| PUT | `/api/schedule` | 保存日程 JSON |

前端在添加/编辑/删除日程后会自动调用 `PUT /api/schedule`。

---

## 常见问题

**`uv run serve` 报 Permission denied（无法删除 `.venv/bin/serve`）？**  
说明 `.venv` 曾被 root 或其他用户创建。重建虚拟环境：

```bash
cd /home/summer/code/summer
sudo rm -rf .venv
sudo chown -R summer:summer /home/summer/code/summer
uv sync
PORT=8765 uv run serve
```

以后请始终用 **summer 用户** 执行 `uv sync` / `uv run serve`，**不要用 `sudo uv`**。

**页面能打开但无法保存？**  
确认使用的是 `uv run serve`（或 systemd 中的同等命令），而不是静态文件服务器。

**403 / 权限错误？**  
检查 `summer` 用户对 `/home/summer/code/summer` 及 `schedule-data.json` 是否有写权限：

```bash
ls -la /home/summer/code/summer/schedule-data.json
sudo chown -R summer:summer /home/summer/code/summer
```

**端口被占用？**  
修改 `PORT` 环境变量，例如 `PORT=9000 uv run serve`。

**更新代码后如何生效？**  
```bash
cd /home/summer/code/summer
git pull          # 若用 git
uv sync
sudo systemctl restart summer-schedule   # 若已配置 systemd
```
