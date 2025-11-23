import re


def remove_all_emojis():
    """
    Remove ALL emojis and Unicode characters from app.py
    """

    # Read the original file
    with open('app.py', 'r', encoding='utf-8') as file:
        content = file.read()

    # Remove ALL Unicode emojis and special characters
    # This regex matches most emoji ranges
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"  # other symbols
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001f926-\U0001f937"  # people
        "\U0001F1E6-\U0001F1FF"  # flags
        "\U0001F191-\U0001F251"  # enclosed characters
        "]+",
        flags=re.UNICODE
    )

    # Remove all emojis
    content = emoji_pattern.sub('', content)

    # Also replace specific problematic characters manually
    replacements = {
        '✅': '[OK]',
        '🔄': '[UPDATE]',
        '❌': '[ERROR]',
        '⚠️': '[WARNING]',
        '🎯': '[SUCCESS]',
        '📊': '[INFO]',
        'ℹ️': '[INFO]',
        '⚡': '[FAST]',
        '🚀': '[LAUNCH]',
        '🔧': '[FIX]',
        '📝': '[NOTE]',
        '🔍': '[CHECK]',
        '💾': '[SAVE]',
        '📁': '[FILE]',
        '👥': '[USERS]',
        '🎓': '[EDU]',
        '🖥️': '[COMPUTER]',
        '📅': '[CALENDAR]',
        '📚': '[BOOKS]',
        '👨‍🏫': '[PROFESSOR]',
        '👨‍🎓': '[STUDENT]',
        '🔐': '[SECURITY]',
        '📧': '[EMAIL]',
        '🔔': '[NOTIFICATION]',
        '💡': '[IDEA]',
        '🔥': '[HOT]',
        '🌟': '[STAR]',
    }

    for emoji, text in replacements.items():
        content = content.replace(emoji, text)

    # Write the fixed content back
    with open('app.py', 'w', encoding='utf-8') as file:
        file.write(content)

    print("Removed ALL emojis from app.py")


if __name__ == "__main__":
    remove_all_emojis()