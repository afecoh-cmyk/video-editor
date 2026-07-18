# 📦 Verzió Management Rendszer

## Áttekintés

A szerver automatikusan kezeli a verziókat a szerver indítása során. Ez biztosítja, hogy a **telefon mindig az új fájlokat tölti be**, elkerülve a böngésző cache problémáit.

## Hogyan működik?

### 1. Szerver Indítása (start.bat)
```
[1/6] Python ellenorzese
[2/6] Python csomagok ellenorzese
[3/6] Verzio inicializalasa        ← VERZIÓ FRISSÍTÉS ICT!
[4/6] Flask szerver inditasa
[5/6] Tunnel elokeszitese
[6/6] Tunnel inditasa
```

**3. lépésben** a `version_manager.py` automatikusan inkrementálja a verziót:
- Aktuális: `1.0`
- Szerver indítás után: `1.1`
- Következő indítás: `1.2`
- ...
- v1.9 után: `2.0` (újra kezd)

### 2. Verzió Fájl
```json
{
  "version": "1.5",
  "last_updated": "2026-02-20T10:30:45.123456",
  "description": "Auto-incremented on server start"
}
```

📍 **Helye**: `version_data.json` (projekt gyökérkönyvtárában)

### 3. Cache-Busting a Weboldalon

A Flask template-ek a `cache_version` paramétert használják:

```html
<!-- booking.html -->
<script src="{{ url_for('static', filename='js/booking.js') }}?v={{ cache_version }}"></script>
<link href="{{ url_for('static', filename='css/style.css') }}?v={{ cache_version }}" rel="stylesheet">
```

**Példa URL**:
```
/static/js/booking.js?v=1.5
/static/css/style.css?v=1.5
```

Telefon megnyitásakor:
- `v=1.4` → `v=1.5` → böngésző új fájlokat tölt be (cache frissítés)
- Nem kell kézzel üríti a cache-t! 🎉

### 4. Flask App Inicializálás

`run.py`:
```python
from version_manager import init_version

with app.app_context():
    cache_version = init_version()  # Verzió frissítés
    print(f"📦 Új verzió: {cache_version}")
```

`app/__init__.py`:
```python
from version_manager import load_version
app.config['CACHE_VERSION'] = load_version()
```

## Parancssori Használat

A verzió manager parancssorból is használható:

```bash
# Aktuális verzió lekérése
python manage.py version current
# Kimenet: 1.5

# Következő verzió lekérése és inkrementálása
python manage.py version next
# Kimenet: 1.6

# Inicializálás (szerver indításkor)
python manage.py version init
# Kimenet: 📦 Aktuális verzió: 1.5
#          📦 Új verzió: 1.6
#          ✓ Verzió mentve: 1.6
```

## Rendszer Folyamata

```
start.bat indítása
    ↓
[3/6] python manage.py version init futás
    ↓
version_data.json frissítése (v1.4 → v1.5)
    ↓
run.py indítása (version_manager importálja és betölti az új verziót)
    ↓
Flask app: cache_version = 1.5
    ↓
Template-ek: script src="...?v=1.5"
    ↓
Telefon web betöltés:
    - Régi cache: ?v=1.4 (keresés a böngészőben → MISS)
    - Új fájlok letöltése: ?v=1.5 (sikeres betöltés!)
```

## Előnyei

✅ **Automatikus versziózás** - Kézi frissítés nem szükséges
✅ **Cache-busting** - Telefon mindig új fájlokat kap
✅ **Szerver újraindítás nélkül** - Verzió előre inkrementálható
✅ **Egyszerű követés** - version_data.json-ben jól látható az utolsó frissítés
✅ **Verziótörténet** - JSON fájl tartalmaz információkat

## Bővítési Lehetőségek

### 1. Git commit szám alapú verziókezelés
```python
# Verzió = git commit count
result = subprocess.run(['git', 'rev-list', '--count', 'HEAD'],
                       capture_output=True, text=True)
version = f"1.{result.stdout.strip()}"
```

### 2. Timestamp alapú verzió
```python
import time
version = str(int(time.time()))  # Unix timestamp
```

### 3. Verzió feltöltés API-hoz
```python
# PUT /api/version
app.config['VERSION_HISTORY'] = []  # Nyomkövetés
```

### 4. Automatikus data cleanup
```python
# Régi verziók törlése 30 napnál régebbieknek
if (datetime.now() - last_updated).days > 30:
    delete_old_cache()
```

## Hibakezelés

Ha a `version_manager.py` nem működik:

**Fallback**: A Flask app automatikusan időpont-alapú verziót (`time.time()`) használ.

```python
try:
    from version_manager import load_version
    app.config['CACHE_VERSION'] = load_version()
except:
    # Fallback az időpont alapú verzióra
    app.config['CACHE_VERSION'] = str(int(time.time()))
```

## API Verzió Endpoint

### GET /api/version

A telefon lekérdezheti az aktuális verzió számot:

```bash
curl http://localhost:5000/api/version
```

**Válasz:**
```json
{
  "version": "1.6",
  "last_updated": ""
}
```

### Frontend Verzió Kezelés

A `cache-manager.js` automatikusan:
1. **Indulásnál** lekérdezi a szerver verzióját
2. **LocalStorage-ban** tárolt verzióval összehasonlítja
3. **Ha eltérő**: teljes oldal frissítés (cache bypass)
4. **Periodikusan** ellenőrzi az updateket (1 percenként)

```javascript
// A JavaScript így használja:
CacheManager.checkVersion(); // Verzió ellenőrzés
```

---

## Gyakori Kérdések

**Q: Mi történik, ha leállítom a szerveret?**
A: Verzió nem kerül visszaállításra. A `stop.bat` nem módosítja a verzióját. Szerver következő indítása → verzió frissül.

**Q: Kézzel módosíthatom a verzióját?**
A: Igen! Szerkeszd a `version_data.json` fájlt:
```json
{
  "version": "2.0"
}
```

**Q: Ez működik mobilon is?**
A: Igen! A `?v=X.X` URL paraméter a böngésző cache-hez szól. Mobilon és asztali gépeken egyformán működik.

**Q: Szerverem crashe miatt nem indult el. Mi történik?**
A: A verzió már frissült a `version_data.json`-ben. Szerver újraindítása → verzió automatikusan betöltődik.

---

**Létrehozva**: 2026-02-20
**Verzió**: v1.0
**Felhasználás**: Automatikus szerver indítást követően
