import os
import glob
import re

files = glob.glob('college_attendance_mobile/src/**/*.tsx', recursive=True)
updated_count = 0

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # 1. Remove SafeAreaView from react-native import
    # Look for import { ... SafeAreaView ... } from 'react-native';
    rn_match = re.search(r"import\s*\{([^}]+)\}\s*from\s*'react-native';", content)
    if rn_match:
        items = rn_match.group(1)
        if 'SafeAreaView' in items:
            new_items = [i.strip() for i in items.split(',') if i.strip() != 'SafeAreaView' and i.strip() != '']
            new_rn_import = "import {\n  " + ",\n  ".join(new_items) + ",\n} from 'react-native';"
            content = content[:rn_match.start()] + new_rn_import + content[rn_match.end():]
            modified = True

    # 2. Check if JSX uses <SafeAreaView
    if '<SafeAreaView' in content:
        # Check if imported from 'react-native-safe-area-context'
        sc_match = re.search(r"import\s*\{([^}]+)\}\s*from\s*'react-native-safe-area-context';", content)
        if sc_match:
            sc_items = [i.strip() for i in sc_match.group(1).split(',') if i.strip()]
            if 'SafeAreaView' not in sc_items:
                sc_items.append('SafeAreaView')
                new_sc_import = "import { " + ", ".join(sc_items) + " } from 'react-native-safe-area-context';"
                content = content[:sc_match.start()] + new_sc_import + content[sc_match.end():]
                modified = True
        else:
            # Add safe-area-context import
            content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + content
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        updated_count += 1
        print(f"Updated {file_path}")

print(f"Migration completed. Updated {updated_count} files.")
