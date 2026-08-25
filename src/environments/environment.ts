// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyCH3FzFF0TMUhODcvys_nU_jUhr-uQP5K4",
    authDomain: "new-frames-703a6.firebaseapp.com",
    projectId: "new-frames-703a6",
    storageBucket: "new-frames-703a6.firebasestorage.app",
    messagingSenderId: "152247361953",
    appId: "1:152247361953:web:5c6a1586ff669a213babe0",
    measurementId: "G-9KYXX1N7P3",
    // App Check reCAPTCHA v3 site key — leave empty until registered in the Firebase
    // Console (App Check > Apps > register web app). App Check stays disabled on the
    // client until this is set; no monitoring occurs without it.
    appCheckSiteKey: "6LcllpYtAAAAAKhZHJm7jqulXzoPUDt7STyuaPhg"
  },
  stripe: {
    publicKey: "pk_test_placeholder"
  },
  api: {
    baseUrl: "https://app.framia.art"
  },
  social: {
    handle: "@framia_art"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
