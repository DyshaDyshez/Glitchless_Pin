import http.server
import socketserver
import os
import webbrowser

# 1. Получаем путь к папке, где лежит этот скрипт
folder_path = os.path.dirname(os.path.abspath(__file__))

# 2. Переходим в эту папку
os.chdir(folder_path)

# 3. Настраиваем порт
PORT = 5501

# 4. Запускаем сервер
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"✅ Сервер запущен!")
    print(f"📁 Папка: {folder_path}")
    print(f"🌐 Адрес для телефона: http://192.168.0.140:{PORT}")
    print(f"🔒 Чтобы остановить, нажми Ctrl+C")
    
    # Опционально: можно сразу открыть браузер на ПК
    # webbrowser.open(f"http://127.0.0.1:{PORT}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Сервер остановлен.")