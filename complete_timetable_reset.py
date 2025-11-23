import app
from models import db


def check_timetable_schema():
    """Check current schema of timetable_slots table"""
    try:
        with app.app_context():
            from sqlalchemy import text

            with db.engine.connect() as conn:
                # Check if table exists
                result = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='timetable_slots'
                """))
                table_exists = result.fetchone()

                if not table_exists:
                    return "❌ timetable_slots table doesn't exist"

                # Check columns
                result = conn.execute(text("PRAGMA table_info(timetable_slots)"))
                columns = []
                for row in result:
                    columns.append({
                        'name': row[1],
                        'type': row[2],
                        'not_null': row[3],
                        'default': row[4]
                    })

                # Check for slot_type
                has_slot_type = any(col['name'] == 'slot_type' for col in columns)

                html = f"""
                <div class="container mt-4">
                    <h3>📋 Timetable Slots Schema</h3>
                    <p>Table exists: ✅</p>
                    <p>Has slot_type column: {'✅' if has_slot_type else '❌'}</p>
                    <h4>All Columns:</h4>
                    <ul>
                """

                for col in columns:
                    html += f"<li><strong>{col['name']}</strong> - {col['type']} (Default: {col['default']})</li>"

                html += """
                    </ul>
                    <a href="/admin/timetable" class="btn btn-primary">Go to Timetable</a>
                </div>
                """

                return html

    except Exception as e:
        return f"❌ Error checking schema: {str(e)}"