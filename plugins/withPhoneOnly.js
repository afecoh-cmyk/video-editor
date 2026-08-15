const { withAndroidManifest } = require('expo/config-plugins');

/** Nincs Google biztonsági mentés: a projektek maradnak a telefonon. */
function withPhoneOnly(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application?.$) {
      application.$['android:allowBackup'] = 'false';
    }
    return mod;
  });
}

module.exports = withPhoneOnly;
