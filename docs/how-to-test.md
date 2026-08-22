# Cómo probar Run4Travel

## Web (más rápido, sin Xcode)

```bash
cd ~/projects/Run4Travel
npm start
```

Pulsa **`w`**. Abre http://localhost:8081

## iPhone físico (Expo Go)

1. Instala **Expo Go** desde App Store  
2. `npm start` en el Mac  
3. Escanea el QR (misma red Wi‑Fi)

## Simulador iOS

Requiere **Xcode** instalado, luego:

```bash
npm run ios
```

## Recorrido sugerido

1. Hoy → ✦ Crear ruta  
2. Preview → Empezar (pack offline)  
3. Carrera: mira distancia/tiempo/ritmo y chart **EN VIVO**  
4. Finish → Resumen (auto-sync Strava si conectado)  
5. Tab **Clubs** → unirte / crear corrida  
6. Álbum / Share / Strava  

## Secrets opcionales

Copia `.env.example` → `.env` para Mapbox / Strava reales. Sin ellos, los mocks siguen funcionando.
