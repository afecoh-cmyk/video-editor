import argparse
import sys
import os
import time
import subprocess

# Projekt gyökér hozzáfűzése a sys.path-hez
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

def cmd_run(args):
    """Fejlesztői szerver indítása (start_dev.py funkciója)"""
    import threading
    from app import create_app, db, _run_migrations
    from app.utils.seed import seed_data
    from app.utils.start_dev import get_local_ip, show_qr

    PORT = 5000
    print()
    print("  HFZ Dev Szerver - Indítás CLI-n keresztül")
    print("  " + "-" * 40)

    def run_flask():
        app = create_app()
        with app.app_context():
            try:
                db.create_all()
                _run_migrations()
                seed_data()
                print("[OK] Adatbazis kesz")
            except Exception as e:
                print(f"[HIBA] DB init: {e}")
                import traceback
                traceback.print_exc()

        try:
            from app.utils.version_manager import init_version
            init_version()
        except Exception:
            pass
            
        app.run(debug=True, host="0.0.0.0", port=PORT, use_reloader=False)

    t = threading.Thread(target=run_flask, daemon=True)
    t.start()

    time.sleep(1.5)
    ip = get_local_ip()
    local_url = f"http://{ip}:{PORT}"
    show_qr(local_url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nSzerver leállítva.")

def cmd_init_db(args):
    """Adatbázis inicializálása (init_db.py)"""
    from app import create_app, db, _run_migrations
    from app.utils.seed import seed_data
    
    app = create_app()
    with app.app_context():
        try:
            db.create_all()
            _run_migrations()
            seed_data()
            print("[INFO] Adatbázis inicializálása sikeres.")
        except Exception as e:
            print(f"[HIBA] Adatbázis inicializálása sikertelen: {e}")
            import traceback
            traceback.print_exc()

def cmd_show_qr(args):
    """QR kód megjelenítése URL-hez (show_qr.py)"""
    from app.utils.show_qr import ensure_qrcode
    qrcode = ensure_qrcode()
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=1, border=2)
    qr.add_data(args.url)
    qr.make(fit=True)
    print(f"\nQR kód a következőhöz: {args.url}\n")
    qr.print_ascii(invert=True)

def cmd_version(args):
    """Verzió lekérése vagy léptetése (version_manager.py)"""
    from app.utils.version_manager import load_version, get_next_version, init_version
    
    if args.action == 'current':
        print(f"Aktuális verzió: {load_version()}")
    elif args.action == 'next':
        print(f"Új verzió: {get_next_version()}")
    elif args.action == 'init':
        init_version()

def cmd_rename_jarvis(args):
    """Régi rename_jarvis.py migráció futtatása"""
    from app.utils.rename_jarvis import replace_in_file, replacements
    for root, dirs, files in os.walk('app'):
        for file in files:
            if file.endswith('.py') or file.endswith('.html') or file.endswith('.json'):
                replace_in_file(os.path.join(root, file), replacements)
    print("Átnevezés (Jarvis -> Nova) befejeződött.")

def main():
    parser = argparse.ArgumentParser(description="HFZ App CLI Manager")
    subparsers = parser.add_subparsers(dest="command", help="Futtatható parancsok")
    subparsers.required = True

    # run parancs
    parser_run = subparsers.add_parser("run", help="Fejlesztői szerver indítása (QR kóddal)")

    # init-db parancs
    parser_init_db = subparsers.add_parser("init-db", help="Adatbázis inicializálása és migrációja")

    # show-qr parancs
    parser_show_qr = subparsers.add_parser("show-qr", help="QR kód generálása a megadott URL-hez")
    parser_show_qr.add_argument("url", type=str, help="A kódolandó URL")

    # version parancs
    parser_version = subparsers.add_parser("version", help="Verziókezelő")
    parser_version.add_argument("action", choices=['current', 'next', 'init'], help="Akció: current, next, init")

    # rename-jarvis parancs
    parser_rename_jarvis = subparsers.add_parser("rename-jarvis", help="Szövegcserés migráció futtatása")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run(args)
    elif args.command == "init-db":
        cmd_init_db(args)
    elif args.command == "show-qr":
        cmd_show_qr(args)
    elif args.command == "version":
        cmd_version(args)
    elif args.command == "rename-jarvis":
        cmd_rename_jarvis(args)

if __name__ == "__main__":
    main()
