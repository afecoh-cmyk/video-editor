from app import create_app, db, _run_migrations
from app.utils.seed import seed_data
from version_manager import init_version

app = create_app()

with app.app_context():
    try:
        db.create_all()        # Új táblák létrehozása (ha még nem léteznek)
        _run_migrations()      # Új oszlopok hozzáadása meglévő táblákhoz + alapbeállítások
        seed_data()            # Admin user + munkaidők alapadatok
        print("[INFO] Adatbázis inicializálása sikeres")
    except Exception as e:
        print(f"[HIBA] Adatbázis inicializálása sikertelen: {e}")
        import traceback
        traceback.print_exc()

    # === Verzió kezelés ===
    # A verzió már frissült a start.bat 3. lépésében
    cache_version = app.config.get('CACHE_VERSION', '1.0')
    print(f"[CACHE] Verzió: {cache_version}")

if __name__ == '__main__':
    # host='0.0.0.0' makes the server accessible on all network interfaces
    # This allows access from other devices on the same WiFi network
    app.run(debug=True, host='0.0.0.0', port=5000)
