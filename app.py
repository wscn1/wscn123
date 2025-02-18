from flask import Flask, render_template, request, jsonify, send_file
from PIL import Image
import io
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

def is_allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/scan_folders', methods=['POST'])
def scan_folders():
    folder_path = request.json.get('folder_path')
    if not folder_path:
        return jsonify({'error': '请提供文件夹路径'})
    
    if not os.path.exists(folder_path):
        return jsonify({'error': '文件夹不存在'})
    
    result = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if is_allowed_file(file):
                image_path = os.path.join(root, file)
                txt_path = os.path.splitext(image_path)[0] + '.txt'
                
                try:
                    if not os.path.exists(txt_path):
                        open(txt_path, 'a').close()
                    
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        annotation = f.read()
                    
                    result.append({
                        'image_path': image_path,
                        'txt_path': txt_path,
                        'annotation': annotation
                    })
                except Exception as e:
                    print(f"处理文件出错: {str(e)}")
                    continue
    
    return jsonify(result)

@app.route('/save_annotation', methods=['POST'])
def save_annotation():
    data = request.json
    txt_path = data.get('txt_path')
    content = data.get('content')
    
    try:
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/thumbnail/<path:image_path>')
def serve_thumbnail(image_path):
    try:
        # 确保路径是绝对路径
        if not os.path.isabs(image_path):
            image_path = '/' + image_path
        
        # 打开图片并创建缩略图
        with Image.open(image_path) as img:
            # 保持宽高比例缩放
            img.thumbnail((150, 150))
            # 保存到内存中
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format=img.format or 'JPEG')
            img_byte_arr.seek(0)
            
        return send_file(img_byte_arr, mimetype='image/jpeg')
    except Exception as e:
        print(f"缩略图生成错误: {str(e)}")
        return str(e), 404

@app.route('/image/<path:image_path>')
def serve_image(image_path):
    try:
        # 确保路径是绝对路径
        if not os.path.isabs(image_path):
            image_path = '/' + image_path
        return send_file(image_path)
    except Exception as e:
        print(f"图片加载错误: {str(e)}")
        return str(e), 404

if __name__ == '__main__':
    app.run(debug=True)