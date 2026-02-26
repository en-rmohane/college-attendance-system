import re

emoji_map = {
    '✅': '[OK]',
    '❌': '[ERROR]',
    '💡': '[TIP]',
    '🚨': '[ALERT]',
    '⚠️': '[WARNING]',
    '📝': '[INFO]',
    '🎯': '[GOAL]',
    '→': '->',
    '🔑': '[KEY]',
    '📧': '[EMAIL]',
    '🧪': '[TEST]',
    '🔧': '[FIX]',
    '🔄': '[RETRY]',
    '✓': '[OK]',
    '🚀': '[STARTING]',
    'ℹ️': '[INFO]',
    '—': '-',
    '⏰': '[TIME]',
}

def clean_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for emoji, replacement in emoji_map.items():
        new_content = new_content.replace(emoji, replacement)
    
    # Also handle any remaining non-ASCII characters gracefully
    # This is a bit aggressive but safe for this project
    # new_content = re.sub(r'[^\x00-\x7F]+', ' ', new_content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Cleaned {filename}")

if __name__ == '__main__':
    clean_file('app.py')
    clean_file('fix_database.py')
