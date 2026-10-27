const { withAndroidStyles, withAppBuildGradle } = require('expo/config-plugins');
// Keep native Android dialogs in the same Material 3 family as the system tabs.
module.exports = config => withAppBuildGradle(withAndroidStyles(config, mod => {
  const theme = mod.modResults.resources.style.find(style => style.$.name === 'AppTheme');
  if (theme) theme.$.parent = 'Theme.Material3.DayNight.NoActionBar';
  return mod;
}), mod => {
  const line = 'apply from: new File(rootDir, "../scripts/android-signing.gradle")';
  if (!mod.modResults.contents.includes(line)) mod.modResults.contents += `\n${line}\n`;
  return mod;
});
