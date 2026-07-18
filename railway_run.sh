#!/bin/bash
echo "Inicializálom az adatbázist..."
python init_db.py

echo "Adatbázis inicializálás kész. Indítom az alkalmazást..."
exec gunicorn -w 4 -b 0.0.0.0:$PORT "app:create_app()"
