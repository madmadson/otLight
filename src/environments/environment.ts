// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyAFLt469YlBMR9La-h2PxRKODQ1NEXUCLY",
    authDomain: "devotlight.firebaseapp.com",
    databaseURL: "https://devotlight.firebaseio.com",
    projectId: "devotlight",
    storageBucket: "devotlight.appspot.com",
    messagingSenderId: "811823045337"
  }
};
