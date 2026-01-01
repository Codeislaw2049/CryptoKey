
import json
import os

locales_dir = "D:\\TEST\\app\\app18\\public\\locales"

translations = {
    "en": {"ciphertext": "Ciphertext", "clickToSelect": "Click to select all"},
    "zh": {"ciphertext": "密文", "clickToSelect": "点击全选"},
    "zh-TW": {"ciphertext": "密文", "clickToSelect": "點擊全選"},
    "ja": {"ciphertext": "暗号文", "clickToSelect": "クリックしてすべて選択"},
    "ko": {"ciphertext": "암호문", "clickToSelect": "클릭하여 모두 선택"},
    "es": {"ciphertext": "Texto cifrado", "clickToSelect": "Haga clic para seleccionar todo"},
    "fr": {"ciphertext": "Texte chiffré", "clickToSelect": "Cliquez pour tout sélectionner"},
    "de": {"ciphertext": "Chiffretext", "clickToSelect": "Klicken Sie, um alles auszuwählen"},
    "it": {"ciphertext": "Testo cifrato", "clickToSelect": "Clicca per selezionare tutto"},
    "ru": {"ciphertext": "Шифротекст", "clickToSelect": "Нажмите, чтобы выбрать все"},
    "pt": {"ciphertext": "Texto cifrado", "clickToSelect": "Clique para selecionar tudo"},
    "vi": {"ciphertext": "Văn bản mã hóa", "clickToSelect": "Nhấp để chọn tất cả"},
    "id": {"ciphertext": "Ciphertext", "clickToSelect": "Klik untuk memilih semua"},
    "tr": {"ciphertext": "Şifreli metin", "clickToSelect": "Tümünü seçmek için tıklayın"},
    "hi": {"ciphertext": "Ciphertext", "clickToSelect": "Click to select all"} 
}

# Fallback for languages not explicitly listed but present in folder
default_trans = {"ciphertext": "Ciphertext", "clickToSelect": "Click to select all"}

for lang in os.listdir(locales_dir):
    file_path = os.path.join(locales_dir, lang, "translation.json")
    if not os.path.exists(file_path):
        continue
        
    print(f"Processing {lang}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if "wizard" not in data:
            data["wizard"] = {}
        if "resultStep" not in data["wizard"]:
            data["wizard"]["resultStep"] = {}
            
        # Add fileContent.ciphertext
        if "fileContent" not in data["wizard"]["resultStep"]:
            data["wizard"]["resultStep"]["fileContent"] = {}
            
        trans = translations.get(lang, default_trans)
        
        data["wizard"]["resultStep"]["fileContent"]["ciphertext"] = trans["ciphertext"]
        
        # Add actions.clickToSelect
        if "actions" not in data["wizard"]["resultStep"]:
             data["wizard"]["resultStep"]["actions"] = {}
             
        data["wizard"]["resultStep"]["actions"]["clickToSelect"] = trans["clickToSelect"]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"Error processing {lang}: {e}")

print("Done updating translations.")
