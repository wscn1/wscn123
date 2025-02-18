# 图片标注管理系统

一个简单的图片标注管理工具，支持批量标注、标注统计和筛选功能。

## 功能特点

- 图片文件夹扫描和预览
- 图片缩略图显示
- 标注的添加、编辑和删除
- 批量标注处理
- 高频标注统计
- 按标注内容筛选图片
- 支持逗号分隔的多标注

## 技术栈

- 后端：Python Flask
- 前端：HTML, CSS, JavaScript
- 图片处理：Pillow

## 安装和运行

1. 克隆仓库：
```bash
git clone https://github.com/wscn1/wscn123.git
cd wscn123
python3 -m venv venv
source venv/bin/activate
pip install flask pillow
python app.py