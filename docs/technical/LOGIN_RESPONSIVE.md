# Login responsive

User override: app fills current window in portrait/landscape and resizable devices; vertical overflow scrolls. Expo orientation default; Android MainActivity unspecified/resizable. useWindowDimensions reads logical window width/density, safe-area excluded. Card fills available width up to480dp, inner content subtracts48dp padding; canonical390dp retains310dp form. Density change remounts scroll content to refresh native text measurements. Rebuild/reinstall APK required for manifest change. Typecheck/Login7tests verified; native resize screenshot verification pending.
