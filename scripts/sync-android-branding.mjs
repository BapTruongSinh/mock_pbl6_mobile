// Native resource generation from the official BLUE logo; no logo redraw.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import imageUtils from '@expo/image-utils';
import iconTools from '@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js';
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = imageUtils;
const { setIconAsync } = iconTools;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/shared/assets/brand-blue-logo.png');
async function generate(src, width, height, padding = 0) {
  const result = await generateImageAsync(
    { projectRoot: root, cacheType: 'blue-branding' },
    {
      src,
      width: width - padding * 2,
      height: height - padding * 2,
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
  );
  if (!padding) return result.source;
  const background = await generateImageBackgroundAsync({
    width,
    height,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  });
  return compositeImagesAsync({ foreground: result.source, background, x: padding, y: padding });
}
async function main() {
  const output = path.join(root, 'src/shared/assets/app');
  await fs.mkdir(output, { recursive: true });
  // Padding is part of the Android icon canvas; the original logo remains unchanged.
  await fs.writeFile(path.join(output, 'icon.png'), await generate(source, 1024, 1024, 100));
  await fs.writeFile(
    path.join(output, 'adaptive-icon.png'),
    await generate(source, 1024, 1024, 220),
  );
  const res = path.join(root, 'android/app/src/main/res');
  try {
    await fs.access(res);
  } catch {
    console.log(
      'Brand assets ready. Generate android with Expo prebuild, then run android:branding again.',
    );
    return;
  }
  await setIconAsync(root, {
    icon: path.join(output, 'icon.png'),
    foregroundImage: path.join(output, 'adaptive-icon.png'),
    backgroundColor: '#FFFFFF',
    backgroundImage: null,
    monochromeImage: null,
    isAdaptive: true,
  });
  for (const [density, scale] of Object.entries({
    mdpi: 1,
    hdpi: 1.5,
    xhdpi: 2,
    xxhdpi: 3,
    xxxhdpi: 4,
  })) {
    const directory = path.join(res, 'drawable-' + density);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, 'splashscreen_logo.png'),
      await generate(source, Math.round(240 * scale), Math.round(100 * scale)),
    );
  }
  const colorsFile = path.join(res, 'values/colors.xml');
  const colors = await fs.readFile(colorsFile, 'utf8');
  const colorPattern = /<color name="iconBackground">[^<]*<\/color>/;
  await fs.writeFile(
    colorsFile,
    colorPattern.test(colors)
      ? colors.replace(colorPattern, '<color name="iconBackground">#FFFFFF</color>')
      : colors.replace(
          '</resources>',
          '  <color name="iconBackground">#FFFFFF</color>\n</resources>',
        ),
  );
  await fs.rm(path.join(res, 'values/blue_branding_colors.xml'), { force: true });
  const drawable = path.join(res, 'drawable');
  await fs.mkdir(drawable, { recursive: true });
  await fs.writeFile(
    path.join(drawable, 'blue_splash_screen.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@android:color/white" />
  <item><bitmap android:gravity="center" android:src="@drawable/splashscreen_logo" /></item>
</layer-list>
`,
  );
  const stylesFile = path.join(res, 'values/styles.xml');
  const styles = await fs.readFile(stylesFile, 'utf8');
  await fs.writeFile(
    stylesFile,
    styles.replace('@drawable/splashscreen_logo', '@drawable/blue_splash_screen'),
  );
  const v31 = path.join(res, 'values-v31');
  await fs.mkdir(v31, { recursive: true });
  await fs.writeFile(
    path.join(v31, 'blue_splash_styles.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@drawable/blue_splash_screen</item>
    <item name="android:windowSplashScreenBackground">@android:color/white</item>
    <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
    <item name="android:windowSplashScreenIconBackgroundColor">@android:color/white</item>
  </style>
</resources>
`,
  );
  console.log('BLUE launcher, round/adaptive icons and native splash resources updated.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
