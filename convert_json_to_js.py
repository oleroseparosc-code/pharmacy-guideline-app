import json

with open(r"c:\Users\duih\Desktop\코딩\documents.json", 'r', encoding='utf-8') as f:
    data = json.load(f)

js_content = "const documentsData = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"

with open(r"c:\Users\duih\Desktop\코딩\병원_약제팀_학습앱\data.js", 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Created data.js successfully.")
